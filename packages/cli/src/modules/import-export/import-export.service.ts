import { VariablesRepository } from '@n8n/db';
import { Service } from '@n8n/di';
import { InstanceSettings } from 'n8n-core';
import { jsonParse } from 'n8n-workflow';
import type { Readable } from 'node:stream';

import { N8N_VERSION } from '@/constants';
import { BadRequestError } from '@/errors/response-errors/bad-request.error';
import { NotFoundError } from '@/errors/response-errors/not-found.error';
import { LoadNodesAndCredentials } from '@/load-nodes-and-credentials';
import { ProjectService } from '@/services/project.service.ee';

import { BindingResolver } from './engine/binding-resolver';
import { ExportPipeline } from './engine/export.pipeline';
import { ImportPipeline } from './engine/import.pipeline';
import type { ImportPipelineOptions, ImportPipelineSeed } from './engine/import.pipeline';
import { PackageRequirementsExtractor } from './engine/requirements-extractor';
import {
	type ExportRequest,
	type ExportScope,
	type ImportRequest,
	type ImportResult,
	type ImportScope,
} from './import-export.types';
import type { PackageReader } from './io/package-reader';
import { TarPackageReader } from './io/tar/tar-package-reader';
import { TarPackageWriter } from './io/tar/tar-package-writer';
import { ProjectExporter } from './scopes/project.exporter';
import { ProjectImporter } from './scopes/project.importer';
import { FORMAT_VERSION } from './spec/constants';
import {
	ENTITY_KEYS,
	type EntityEntries,
	type EntityKey,
	type ManifestEntry,
	type PackageManifest,
} from './spec/manifest.types';
import type {
	PackageCredentialRequirement,
	PackageRequirements,
	PackageVariableRequirement,
} from './spec/requirements.types';
import type { SerializedCredential } from './spec/serialized/credential.serialized';
import type { ManifestProjectEntry } from './spec/serialized/project.serialized';

export interface AnalyzePackageResult {
	packageFormatVersion: string;
	sourceN8nVersion: string;
	sourceId: string;
	exportedAt: string;
	summary: Record<'projects' | (typeof ENTITY_KEYS)[number], number>;
	requirements: PackageRequirements;
}

@Service()
export class ImportExportService {
	constructor(
		private readonly projectService: ProjectService,
		private readonly projectExporter: ProjectExporter,
		private readonly projectImporter: ProjectImporter,
		private readonly exportPipeline: ExportPipeline,
		private readonly importPipeline: ImportPipeline,
		private readonly instanceSettings: InstanceSettings,
		private readonly loadNodesAndCredentials: LoadNodesAndCredentials,
		private readonly bindingResolver: BindingResolver,
		private readonly variablesRepository: VariablesRepository,
	) {}

	// ---------------------------------------------------------------------------
	// Export
	// ---------------------------------------------------------------------------

	async exportPackage(request: ExportRequest): Promise<Readable> {
		const includeVariableValues = request.includeVariableValues ?? true;

		switch (request.type) {
			case 'workflows':
				return await this.exportWorkflows(request, includeVariableValues);
			case 'folders':
				return await this.exportFolders(request, includeVariableValues);
			case 'projects':
				return await this.exportProjects(request, includeVariableValues);
			default:
				throw new Error(`Unsupported export type: ${(request as { type: string }).type}`);
		}
	}

	private async exportWorkflows(
		request: Extract<ExportRequest, { type: 'workflows' }>,
		includeVariableValues: boolean,
	): Promise<Readable> {
		const writer = new TarPackageWriter();
		const manifest = this.createManifest();

		const scope = this.createExportScope({
			basePath: '.',
			workflowIds: request.workflowIds,
			includeVariableValues,
			writer,
		});

		const result = await this.exportPipeline.run(scope);
		this.applyEntityEntriesToManifest(manifest, result);
		manifest.requirements = result.requirements;

		return this.finalizePackage(writer, manifest);
	}

	private async exportFolders(
		request: Extract<ExportRequest, { type: 'folders' }>,
		includeVariableValues: boolean,
	): Promise<Readable> {
		const writer = new TarPackageWriter();
		const manifest = this.createManifest();

		const scope = this.createExportScope({
			basePath: '.',
			folderIds: request.folderIds,
			includeVariableValues,
			writer,
		});

		const result = await this.exportPipeline.run(scope);
		this.applyEntityEntriesToManifest(manifest, result);
		manifest.requirements = result.requirements;

		return this.finalizePackage(writer, manifest);
	}

	private async exportProjects(
		request: Extract<ExportRequest, { type: 'projects' }>,
		includeVariableValues: boolean,
	): Promise<Readable> {
		await this.validateProjectAccess(request.user, request.projectIds);

		const writer = new TarPackageWriter();
		const manifest = this.createManifest();

		const entries: ManifestProjectEntry[] = [];
		let requirements: PackageRequirements = {
			credentials: [],
			subWorkflows: [],
			nodeTypes: [],
			variables: [],
		};

		for (const projectId of request.projectIds) {
			const result = await this.projectExporter.export(projectId, writer, {
				includeVariableValues,
			});
			entries.push(result.entry);
			requirements = PackageRequirementsExtractor.merge(requirements, result.requirements);
		}

		manifest.projects = entries;
		manifest.requirements = requirements;

		return this.finalizePackage(writer, manifest);
	}

	// ---------------------------------------------------------------------------
	// Analyze
	// ---------------------------------------------------------------------------

	async analyzePackage(buffer: Buffer): Promise<AnalyzePackageResult> {
		const reader = await TarPackageReader.fromBuffer(buffer);
		const manifest = this.parseAndValidateManifest(reader);

		const summary: Record<'projects' | EntityKey, number> = {
			projects: 0,
			folders: 0,
			workflows: 0,
			credentials: 0,
			variables: 0,
			dataTables: 0,
			tags: 0,
		};

		if (manifest.projects?.length) {
			summary.projects = manifest.projects.length;
			for (const project of manifest.projects) {
				for (const key of ENTITY_KEYS) {
					summary[key] += project[key]?.length ?? 0;
				}
			}
		}

		for (const key of ENTITY_KEYS) {
			summary[key] += manifest[key]?.length ?? 0;
		}

		const requirements = manifest.requirements ?? {
			credentials: [],
			subWorkflows: [],
			nodeTypes: [],
			variables: [],
		};

		// Filter out node types that are installed on this instance —
		// only surface genuinely missing ones as requirements.
		requirements.nodeTypes = requirements.nodeTypes.filter(
			(nt) => !this.loadNodesAndCredentials.recognizesNode(nt.type),
		);

		return {
			packageFormatVersion: manifest.packageFormatVersion,
			sourceN8nVersion: manifest.sourceN8nVersion,
			sourceId: manifest.sourceId,
			exportedAt: manifest.exportedAt,
			summary,
			requirements,
		};
	}

	// ---------------------------------------------------------------------------
	// Import — full orchestration
	// ---------------------------------------------------------------------------

	async importPackage(buffer: Buffer, request: ImportRequest): Promise<ImportResult> {
		const reader = await TarPackageReader.fromBuffer(buffer);
		const manifest = this.parseAndValidateManifest(reader);

		// Step 1: Build the full set of requirements
		const requirements = this.buildImportRequirements(manifest, reader);

		// Step 2: Resolve target project ID
		const isProjectScoped = !!manifest.projects?.length;
		const resolvedTargetProjectId = isProjectScoped
			? undefined
			: (request.targetProjectId ?? (await this.resolvePersonalProjectId(request.user)));

		// Step 3: Resolve bindings
		const resolvedBindings = requirements
			? await this.bindingResolver.resolve(requirements, {
					userBindings: request.bindings,
					mode: request.mode,
					skipCredentialAssertions: request.createCredentialStubs,
					targetProjectId: resolvedTargetProjectId,
				})
			: {
					credentialBindings: new Map<string, string>(),
					subWorkflowBindings: new Map<string, string>(),
				};

		// Step 4: Compute unresolved credential requirements
		const unresolvedCredentialRequirements =
			requirements?.credentials.filter((r) => !resolvedBindings.credentialBindings.has(r.id)) ?? [];

		// Step 5: Validate variable requirements
		if (requirements?.variables?.length && request.mode !== 'force') {
			await this.assertVariableRequirementsMet(
				requirements.variables,
				isProjectScoped ? undefined : resolvedTargetProjectId,
				request.withVariableValues,
				manifest,
			);
		}

		// Step 6: Build pipeline options
		const pipelineOptions: ImportPipelineOptions = {
			createCredentialStubs: request.createCredentialStubs,
			unresolvedCredentialRequirements,
		};

		const variableOptions = {
			withValues: request.withVariableValues,
			overwriteValues: request.overwriteVariableValues,
		};

		// Step 7: Import
		if (isProjectScoped) {
			return await this.importProjects(
				manifest.projects!,
				reader,
				request,
				resolvedBindings,
				pipelineOptions,
				variableOptions,
			);
		}

		return await this.importStandalone(
			manifest,
			reader,
			request,
			resolvedTargetProjectId!,
			resolvedBindings,
			pipelineOptions,
			variableOptions,
		);
	}

	// ---------------------------------------------------------------------------
	// Private — export helpers
	// ---------------------------------------------------------------------------

	private createManifest(): PackageManifest {
		return {
			packageFormatVersion: FORMAT_VERSION,
			exportedAt: new Date().toISOString(),
			sourceN8nVersion: N8N_VERSION,
			sourceId: this.instanceSettings.instanceId,
		};
	}

	private createExportScope(params: {
		basePath: string;
		writer: TarPackageWriter;
		includeVariableValues: boolean;
		projectId?: string;
		workflowIds?: string[];
		folderIds?: string[];
	}): ExportScope {
		return {
			basePath: params.basePath,
			writer: params.writer,
			projectId: params.projectId,
			workflowIds: params.workflowIds,
			folderIds: params.folderIds,
			entityOptions: {
				variables: { includeValues: params.includeVariableValues },
			},
		};
	}

	private applyEntityEntriesToManifest(manifest: PackageManifest, entries: EntityEntries): void {
		for (const key of ENTITY_KEYS) {
			if (entries[key]?.length) {
				manifest[key] = entries[key];
			}
		}
	}

	private finalizePackage(writer: TarPackageWriter, manifest: PackageManifest): Readable {
		writer.writeFile('manifest.json', JSON.stringify(manifest, null, '\t'));
		return writer.finalize();
	}

	private parseAndValidateManifest(reader: PackageReader): PackageManifest {
		const manifestJson = reader.readFile('manifest.json');
		const manifest: PackageManifest = jsonParse(manifestJson);

		if (manifest.packageFormatVersion !== FORMAT_VERSION) {
			throw new BadRequestError(
				`Unsupported package format version "${manifest.packageFormatVersion}" (expected "${FORMAT_VERSION}")`,
			);
		}

		return manifest;
	}

	// ---------------------------------------------------------------------------
	// Private — import helpers
	// ---------------------------------------------------------------------------

	private async importProjects(
		projects: ManifestProjectEntry[],
		reader: PackageReader,
		request: ImportRequest,
		resolvedBindings: {
			credentialBindings: Map<string, string>;
			subWorkflowBindings: Map<string, string>;
		},
		pipelineOptions: ImportPipelineOptions,
		variableOptions: { withValues: boolean; overwriteValues: boolean },
	): Promise<ImportResult> {
		const result: ImportResult['projects'] = [];
		const totals: Record<EntityKey, number> = {
			folders: 0,
			workflows: 0,
			credentials: 0,
			variables: 0,
			dataTables: 0,
			tags: 0,
		};

		for (const entry of projects) {
			const importResult = await this.projectImporter.import(
				entry,
				reader,
				request.user,
				resolvedBindings,
				pipelineOptions,
				variableOptions,
			);
			result.push(importResult);
			for (const key of ENTITY_KEYS) {
				totals[key] += entry[key]?.length ?? 0;
			}
		}

		return { projects: result, ...totals };
	}

	private async importStandalone(
		manifest: PackageManifest,
		reader: PackageReader,
		request: ImportRequest,
		projectId: string,
		resolvedBindings: {
			credentialBindings: Map<string, string>;
			subWorkflowBindings: Map<string, string>;
		},
		pipelineOptions: ImportPipelineOptions,
		variableOptions: { withValues: boolean; overwriteValues: boolean },
	): Promise<ImportResult> {
		const scope: ImportScope = {
			user: request.user,
			targetProjectId: projectId,
			reader,
			assignNewIds: !!request.targetProjectId,
			entityOptions: { variables: variableOptions },
		};

		const entries: Partial<EntityEntries> = {};
		for (const key of ENTITY_KEYS) {
			entries[key] = manifest[key];
		}

		const seed: ImportPipelineSeed = {
			credentialBindings: resolvedBindings.credentialBindings,
			subWorkflowBindings: resolvedBindings.subWorkflowBindings,
		};

		await this.importPipeline.importEntities(scope, entries, pipelineOptions, seed);

		const totals: Record<EntityKey, number> = {
			folders: entries.folders?.length ?? 0,
			workflows: entries.workflows?.length ?? 0,
			credentials: entries.credentials?.length ?? 0,
			variables: entries.variables?.length ?? 0,
			dataTables: entries.dataTables?.length ?? 0,
			tags: entries.tags?.length ?? 0,
		};

		return { projects: [], ...totals };
	}

	private buildImportRequirements(
		manifest: PackageManifest,
		reader: PackageReader,
	): PackageRequirements | undefined {
		const base = manifest.requirements;

		// Collect credential entries from all sources in the manifest
		const credentialEntries: ManifestEntry[] = [];
		if (manifest.credentials?.length) {
			credentialEntries.push(...manifest.credentials);
		}
		if (manifest.projects?.length) {
			for (const project of manifest.projects) {
				if (project.credentials?.length) {
					credentialEntries.push(...project.credentials);
				}
			}
		}

		if (credentialEntries.length === 0) return base;

		// Read each credential file to get name + type, and build requirements
		const packageCredentialReqs: PackageCredentialRequirement[] = [];
		for (const entry of credentialEntries) {
			const filePath = `${entry.target}/credential.json`;
			if (!reader.hasFile(filePath)) continue;

			const serialized: SerializedCredential = jsonParse(reader.readFile(filePath));
			packageCredentialReqs.push({
				id: serialized.id,
				name: serialized.name,
				type: serialized.type,
				usedByWorkflows: [],
			});
		}

		if (packageCredentialReqs.length === 0) return base;

		// Merge with existing requirements
		return {
			credentials: [...(base?.credentials ?? []), ...packageCredentialReqs],
			subWorkflows: base?.subWorkflows ?? [],
			nodeTypes: base?.nodeTypes ?? [],
			variables: base?.variables ?? [],
		};
	}

	private async assertVariableRequirementsMet(
		variableRequirements: PackageVariableRequirement[],
		targetProjectId: string | undefined,
		withVariableValues: boolean,
		manifest: PackageManifest,
	): Promise<void> {
		// Collect variable keys included as values in the package
		const packageVariableKeys = new Set<string>();
		if (withVariableValues) {
			if (manifest.variables?.length) {
				for (const entry of manifest.variables) {
					packageVariableKeys.add(entry.name);
				}
			}
			if (manifest.projects?.length) {
				for (const project of manifest.projects) {
					if (project.variables?.length) {
						for (const entry of project.variables) {
							packageVariableKeys.add(entry.name);
						}
					}
				}
			}
		}

		const missingVariables: PackageVariableRequirement[] = [];

		for (const req of variableRequirements) {
			if (packageVariableKeys.has(req.name)) continue;

			const whereClause = targetProjectId
				? { key: req.name, project: { id: targetProjectId } }
				: { key: req.name };
			const existing = await this.variablesRepository.findOne({ where: whereClause });

			if (!existing) {
				missingVariables.push(req);
			}
		}

		if (missingVariables.length > 0) {
			const details = missingVariables.map(
				(v) => `variable "${v.name}" (used by: ${v.usedByWorkflows.join(', ')})`,
			);
			throw new BadRequestError(
				`Missing required variables: ${details.join(', ')}. ` +
					'Use mode "force" to import anyway, or ensure the variables exist on the target instance.',
			);
		}
	}

	private async resolvePersonalProjectId(user: import('@n8n/db').User): Promise<string> {
		const personalProject = await this.projectService.getPersonalProject(user);
		if (!personalProject) {
			throw new BadRequestError('Could not find personal project for user');
		}
		return personalProject.id;
	}

	private async validateProjectAccess(
		user: import('@n8n/db').User,
		projectIds: string[],
	): Promise<void> {
		for (const projectId of projectIds) {
			const project = await this.projectService.getProjectWithScope(user, projectId, [
				'project:read',
			]);

			if (!project) {
				throw new NotFoundError(`Project "${projectId}" not found or you do not have access`);
			}
		}
	}
}
