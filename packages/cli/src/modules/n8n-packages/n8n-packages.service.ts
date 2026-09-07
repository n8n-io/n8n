import { GlobalConfig } from '@n8n/config';
import { Service } from '@n8n/di';
import { InstanceSettings } from 'n8n-core';

import { N8N_VERSION } from '@/constants';
import { BadRequestError } from '@/errors/response-errors/bad-request.error';
import { ForbiddenError } from '@/errors/response-errors/forbidden.error';
import { EventService } from '@/events/event.service';

import { buildImportResult, toPackageSummary } from './engine/import-result';
import { emitPackageImportedEvent, type ImportOutcome } from './engine/import-telemetry';
import { N8nPackageParser } from './engine/n8n-package-parser';
import { ProjectPackageImporter } from './engine/project-package-importer';
import { WorkflowPackageImporter } from './engine/workflow-package-importer';
import { CredentialExporter } from './entities/credential/credential.exporter';
import { DataTableExporter } from './entities/data-table/data-table.exporter';
import {
	folderPolicyRejection,
	resolveFolderConflictPolicy,
} from './entities/folder/folder-conflict-policy';
import { FolderExporter } from './entities/folder/folder.exporter';
import { ProjectExporter } from './entities/project/project.exporter';
import { mergeRequirements } from './entities/requirements.types';
import { TagExporter } from './entities/tag/tag.exporter';
import { VariableExporter } from './entities/variable/variable.exporter';
import { collectNodeTypeUsage } from './entities/workflow/node-type-usage';
import { assertStaticSubWorkflowsIncluded } from './entities/workflow/static-sub-workflow-requirements';
import { AutoIncludedWorkflowResolver } from './entities/workflow/auto-included-workflow-resolver';
import {
	AutoIncludedWorkflowExporter,
	type AutoIncludedWorkflowExportResult,
} from './entities/workflow/auto-included-workflow.exporter';
import { WorkflowDependencyResolver } from './entities/workflow/workflow-dependency-resolver';
import { WorkflowRequirementExporter } from './entities/workflow/workflow-requirement.exporter';
import { WorkflowExporter } from './entities/workflow/workflow.exporter';
import { DirectoryPackageReader } from './io/directory/directory-package-reader';
import { DirectoryPackageWriter } from './io/directory/directory-package-writer';
import type { PackageReader } from './io/package-reader';
import type { PackageWriter } from './io/package-writer';
import { TarPackageReader } from './io/tar/tar-package-reader';
import { TarPackageWriter } from './io/tar/tar-package-writer';
import { PackageImportConfig } from './n8n-packages.config';
import {
	CredentialExportPolicy,
	MissingWorkflowDependencyPolicy,
	WorkflowVersionPolicy,
	type ExportPackageEventCounts,
	type ExportPackageRequest,
	type ExportPackageResult,
	type ExportPackageSummary,
	type ImportPackageRequest,
	type ImportRequest,
	type ImportResult,
	type PackageImportSource,
	type ResolvedImportPackageRequest,
	createBindings,
} from './n8n-packages.types';
import { FORMAT_VERSION } from './spec/constants';
import {
	packageManifestSchema,
	type ManifestEntry,
	type PackageManifest,
} from './spec/manifest.schema';
import type { PackageRequirements } from './spec/requirements.schema';

interface WrittenExport {
	counts: ExportPackageEventCounts;
	workflowIds: string[];
	folderIds: string[];
	projectIds: string[];
	credentialExportPolicy: CredentialExportPolicy;
	includeArchivedWorkflows: boolean;
}

@Service()
export class N8nPackagesService {
	constructor(
		private readonly projectExporter: ProjectExporter,
		private readonly workflowExporter: WorkflowExporter,
		private readonly folderExporter: FolderExporter,
		private readonly credentialExporter: CredentialExporter,
		private readonly dataTableExporter: DataTableExporter,
		private readonly variableExporter: VariableExporter,
		private readonly tagExporter: TagExporter,
		private readonly globalConfig: GlobalConfig,
		private readonly instanceSettings: InstanceSettings,
		private readonly packageParser: N8nPackageParser,
		private readonly packageImportConfig: PackageImportConfig,
		private readonly projectPackageImporter: ProjectPackageImporter,
		private readonly workflowPackageImporter: WorkflowPackageImporter,
		private readonly eventService: EventService,
		private readonly workflowRequirementExporter: WorkflowRequirementExporter,
		private readonly workflowDependencyResolver: WorkflowDependencyResolver,
		private readonly autoIncludedWorkflowResolver: AutoIncludedWorkflowResolver,
		private readonly autoIncludedWorkflowExporter: AutoIncludedWorkflowExporter,
	) {}

	async exportPackage(request: ExportPackageRequest): Promise<ExportPackageResult> {
		const writer = new TarPackageWriter();
		const result = await this.writeExport(writer, request);
		const stream = writer.finalize();

		// This event represents a user-facing archive export, not an internal directory write.
		this.eventService.emit('n8n-package-exported', {
			user: request.user,
			...(result.workflowIds.length ? { workflowIds: result.workflowIds } : {}),
			...(result.folderIds.length ? { folderIds: result.folderIds } : {}),
			...(result.projectIds.length ? { projectIds: result.projectIds } : {}),
			counts: result.counts,
			credentialExportPolicy: result.credentialExportPolicy,
			includeArchivedWorkflows: result.includeArchivedWorkflows,
		});

		return { stream, counts: result.counts };
	}

	/**
	 * Exports the same n8n-packages layout as {@link exportPackage}, but as loose
	 * files on disk (the unzipped format) under `target.targetDir` instead of a tar
	 * stream. Reuses the full export orchestration; only the writer differs.
	 */
	async exportPackageToDirectory(
		request: ExportPackageRequest,
		target: { targetDir: string },
	): Promise<ExportPackageSummary> {
		const writer = new DirectoryPackageWriter(target.targetDir);
		const result = await this.writeExport(writer, request);
		await writer.finalize();
		return { counts: result.counts };
	}

	private async writeExport(
		writer: PackageWriter,
		request: ExportPackageRequest,
	): Promise<WrittenExport> {
		const { missingWorkflowDependencyPolicy } = request;
		const isReferenceOnly =
			missingWorkflowDependencyPolicy === MissingWorkflowDependencyPolicy.ReferenceOnly;

		const workflowIds = request.workflowIds ?? [];
		const folderIds = request.folderIds ?? [];
		const projectIds = request.projectIds ?? [];
		const includeTags = (request.includeTags ?? true) && !this.globalConfig.tags.disabled;
		const workflowVersionPolicy = request.workflowVersionPolicy ?? WorkflowVersionPolicy.Latest;
		const credentialExportPolicy =
			request.credentialExportPolicy ?? CredentialExportPolicy.ExpressionValuesOnly;
		const includeArchivedWorkflows = request.includeArchivedWorkflows ?? false;

		const folderExportResult =
			folderIds.length > 0
				? await this.folderExporter.export({
						user: request.user,
						folderIds,
						writer,
						includeTags,
						workflowVersionPolicy,
						includeArchivedWorkflows,
					})
				: undefined;

		const workflowsForExport = this.filterWorkflowsAlreadyInFolders(
			folderExportResult?.workflowEntries,
			workflowIds,
		);

		const workflowExportResult =
			workflowsForExport.length > 0
				? await this.workflowExporter.export({
						user: request.user,
						workflowIds: workflowsForExport,
						writer,
						includeTags,
						workflowVersionPolicy,
					})
				: undefined;

		const projectExportResult =
			projectIds.length > 0
				? await this.projectExporter.export({
						user: request.user,
						projectIds,
						writer,
						includeTags,
						workflowVersionPolicy,
						includeArchivedWorkflows,
					})
				: undefined;

		const allFoldersBeforeAutoInclude = [
			...(folderExportResult?.entries ?? []),
			...(projectExportResult?.folderEntries ?? []),
		];
		const allProjectsBeforeAutoInclude = [...(projectExportResult?.entries ?? [])];
		const allWorkflowsBeforeAutoInclude = [
			...(workflowExportResult?.entries ?? []),
			...(folderExportResult?.workflowEntries ?? []),
			...(projectExportResult?.workflowEntries ?? []),
		];

		// Reference-only keeps missing dependencies out of the package, so only the
		// direct references of packaged workflows matter — a referenced workflow's
		// own dependency closure is assumed to exist on the target alongside it.
		const workflowRequirements = await this.workflowDependencyResolver.resolve({
			user: request.user,
			workflowIds: allWorkflowsBeforeAutoInclude.map(({ id }) => id),
			traversal: isReferenceOnly ? 'direct' : 'transitive',
			workflowVersionPolicy,
		});

		let autoIncludedExportResult: AutoIncludedWorkflowExportResult | undefined;

		if (missingWorkflowDependencyPolicy === MissingWorkflowDependencyPolicy.IncludeInPackage) {
			const autoIncludedWorkflowResolution = await this.autoIncludedWorkflowResolver.resolve({
				user: request.user,
				requirements: workflowRequirements,
				topLevelWorkflowIds: workflowExportResult?.entries.map(({ id }) => id) ?? [],
				folderWorkflowIds: folderExportResult?.workflowEntries.map(({ id }) => id) ?? [],
				projectWorkflowIds: projectExportResult?.workflowEntries.map(({ id }) => id) ?? [],
				includeTags,
				workflowVersionPolicy,
			});

			autoIncludedExportResult = await this.autoIncludedWorkflowExporter.export({
				writer,
				workflows: autoIncludedWorkflowResolution.autoIncludedWorkflows,
				existingWorkflowEntries: allWorkflowsBeforeAutoInclude,
				existingFolderEntries: allFoldersBeforeAutoInclude,
				existingProjectEntries: allProjectsBeforeAutoInclude,
				includeTags,
				projectTargetsById: projectExportResult?.projectTargetsById,
			});
		}

		const requirements = mergeRequirements(
			workflowExportResult?.requirements,
			folderExportResult?.requirements,
			projectExportResult?.requirements,
			autoIncludedExportResult?.requirements,
		);

		const includeVariableValues = request.includeVariableValues ?? true;
		if (
			includeVariableValues &&
			requirements.variables.length > 0 &&
			request.canExportVariableValues === false
		) {
			throw new ForbiddenError(
				'The exported workflows reference variables, but the API key is missing the variable:list scope needed to bundle their values. Add the scope or set includeVariableValues to false.',
			);
		}

		const allFolders = this.dedupeManifestEntries([
			...allFoldersBeforeAutoInclude,
			...(autoIncludedExportResult?.folderEntries ?? []),
		]);
		const allProjects = this.dedupeManifestEntries([
			...allProjectsBeforeAutoInclude,
			...(autoIncludedExportResult?.projectEntries ?? []),
		]);
		const allWorkflowsInPackage = this.dedupeManifestEntries([
			...allWorkflowsBeforeAutoInclude,
			...(autoIncludedExportResult?.workflowEntries ?? []),
		]);

		// Reference-only records missing dependencies as requirements instead of aborting.
		if (!isReferenceOnly) {
			assertStaticSubWorkflowsIncluded(
				workflowRequirements,
				new Set(allWorkflowsInPackage.map(({ id }) => id)),
			);
		}

		// The auto-include's projectTargetsById is a superset of the project targets from the project export result
		// that's why it takes precedence when both are present.
		const projectTargetsById =
			autoIncludedExportResult?.projectTargetsById ?? projectExportResult?.projectTargetsById;

		const credentialExportResult = await this.credentialExporter.export({
			user: request.user,
			requirements: requirements.credentials,
			writer,
			credentialExportPolicy,
			// Routes project-owned credentials into their project namespace; others stay top-level.
			projectTargetsById,
		});

		const dataTableExportResult = await this.dataTableExporter.export({
			user: request.user,
			requirements: requirements.dataTables,
			writer,
			// Routes project-owned data tables into their project namespace; others stay top-level.
			projectTargetsById,
		});

		const workflowRequirementExportResult = await this.workflowRequirementExporter.export({
			user: request.user,
			requirements: workflowRequirements,
			workflows: allWorkflowsInPackage,
		});

		const variableExportResult = await this.variableExporter.export({
			user: request.user,
			requirements: requirements.variables,
			writer,
			includeVariableValues,
			projectTargetsById,
		});

		const tagExportResult = await this.tagExporter.export({
			usages: requirements.tags,
			writer,
		});

		const manifestRequirements = this.buildManifestRequirements({
			credentials: credentialExportResult.requirements,
			dataTables: dataTableExportResult.requirements,
			workflows: workflowRequirementExportResult.requirements,
			variables: variableExportResult.requirements,
			tags: tagExportResult.requirements,
			nodeTypes: collectNodeTypeUsage(requirements.nodeTypes),
		});

		const manifest = packageManifestSchema.parse({
			packageFormatVersion: FORMAT_VERSION,
			exportedAt: new Date().toISOString(),
			sourceN8nVersion: N8N_VERSION,
			sourceId: this.instanceSettings.instanceId,
			...(credentialExportResult.entries.length > 0
				? { credentials: credentialExportResult.entries }
				: {}),
			...(dataTableExportResult.entries.length > 0
				? { dataTables: dataTableExportResult.entries }
				: {}),
			...(variableExportResult.entries.length > 0
				? { variables: variableExportResult.entries }
				: {}),
			...(tagExportResult.entries.length > 0 ? { tags: tagExportResult.entries } : {}),
			...(manifestRequirements ? { requirements: manifestRequirements } : {}),
			...(allWorkflowsInPackage.length > 0 ? { workflows: allWorkflowsInPackage } : {}),
			...(allFolders.length > 0 ? { folders: allFolders } : {}),
			...(allProjects.length > 0 ? { projects: allProjects } : {}),
		});

		await writer.writeFile('manifest.json', JSON.stringify(manifest, null, '\t'));

		const counts: ExportPackageEventCounts = {
			workflows: allWorkflowsInPackage.length,
			folders: allFolders.length,
			credentials: credentialExportResult.entries.length,
			dataTables: dataTableExportResult.entries.length,
			variables: variableExportResult.entries.length,
			tags: tagExportResult.entries.length,
		};

		return {
			counts,
			workflowIds: allWorkflowsInPackage.map(({ id }) => id),
			folderIds: allFolders.map(({ id }) => id),
			projectIds: allProjects.map(({ id }) => id),
			credentialExportPolicy,
			includeArchivedWorkflows,
		};
	}

	async importPackage(request: ImportPackageRequest): Promise<ImportResult> {
		const reader = new TarPackageReader(request.packageBuffer, this.packageImportConfig);
		const manifest = await this.packageParser.getManifest(reader);
		const { result, scopes } = await this.dispatchImport(
			request,
			reader,
			manifest,
			'package-import',
		);

		const resolvedRequest: ResolvedImportPackageRequest = {
			...request,
			folderConflictPolicy: resolveFolderConflictPolicy(
				request,
				isProjectPackage(manifest) ? 'project' : 'workflow',
			),
		};
		emitPackageImportedEvent(this.eventService, { request: resolvedRequest, manifest, scopes });

		return result;
	}

	async importPackageFromDirectory(
		request: ImportRequest,
		source: { sourceDir: string },
	): Promise<ImportResult> {
		const reader = new DirectoryPackageReader(source.sourceDir, this.packageImportConfig);
		await reader.listEntries();
		const manifest = await this.packageParser.getManifest(reader);
		if (!isProjectPackage(manifest)) {
			if (hasContentWithoutProjects(manifest)) {
				throw new BadRequestError('Directory packages must contain projects');
			}
			return emptyImportResult(manifest);
		}
		const { result } = await this.dispatchImport(request, reader, manifest, 'git-pull');
		return result;
	}

	private async dispatchImport(
		request: ImportRequest,
		reader: PackageReader,
		manifest: PackageManifest,
		importSource: PackageImportSource,
	): Promise<ImportOutcome> {
		if (isProjectPackage(manifest)) {
			if (request.variableParentPolicy !== undefined) {
				throw new BadRequestError(
					'variableParentPolicy is not supported for project packages, where variable placement follows the package layout. Omit it.',
				);
			}
			const rejection = folderPolicyRejection(request, 'project');
			if (rejection) throw new BadRequestError(rejection);
			return await this.projectPackageImporter.import(
				{ ...request, folderConflictPolicy: resolveFolderConflictPolicy(request, 'project') },
				reader,
				manifest,
				importSource,
			);
		}

		const rejection = folderPolicyRejection(request, 'workflow');
		if (rejection) throw new BadRequestError(rejection);
		return await this.workflowPackageImporter.import(
			{ ...request, folderConflictPolicy: resolveFolderConflictPolicy(request, 'workflow') },
			reader,
			manifest,
		);
	}

	filterWorkflowsAlreadyInFolders(workflowsInFolders: ManifestEntry[] = [], workflowIds: string[]) {
		const folderWorkflowIds = new Set(workflowsInFolders.map((entry) => entry.id) ?? []);
		return workflowIds.filter((id) => !folderWorkflowIds.has(id));
	}

	private dedupeManifestEntries(entries: ManifestEntry[]): ManifestEntry[] {
		const byId = new Map<string, ManifestEntry>();
		for (const entry of entries) {
			if (!byId.has(entry.id)) {
				byId.set(entry.id, entry);
			}
		}
		return [...byId.values()];
	}

	private buildManifestRequirements(input: {
		credentials: PackageRequirements['credentials'];
		dataTables: PackageRequirements['dataTables'];
		workflows: PackageRequirements['workflows'];
		variables: PackageRequirements['variables'];
		tags: PackageRequirements['tags'];
		nodeTypes: PackageRequirements['nodeTypes'];
	}): PackageRequirements | undefined {
		const { credentials, dataTables, workflows, variables, tags, nodeTypes } = input;

		const requirements: PackageRequirements = {
			...(credentials?.length ? { credentials } : {}),
			...(dataTables?.length ? { dataTables } : {}),
			...(workflows?.length ? { workflows } : {}),
			...(variables?.length ? { variables } : {}),
			...(tags?.length ? { tags } : {}),
			...(nodeTypes?.length ? { nodeTypes } : {}),
		};
		return Object.keys(requirements).length > 0 ? requirements : undefined;
	}
}

function isProjectPackage(manifest: PackageManifest): boolean {
	return (manifest.projects?.length ?? 0) > 0;
}

function hasContentWithoutProjects(manifest: PackageManifest): boolean {
	return (
		[
			manifest.workflows,
			manifest.folders,
			manifest.credentials,
			manifest.dataTables,
			manifest.variables,
			manifest.tags,
		].some((entries) => (entries?.length ?? 0) > 0) || manifest.requirements !== undefined
	);
}

function emptyImportResult(manifest: PackageManifest): ImportResult {
	return buildImportResult({
		package: toPackageSummary(manifest),
		workflows: [],
		removedWorkflows: [],
		removedFolders: [],
		folders: [],
		projects: [],
		bindings: createBindings(),
		credentials: { matched: [], stubbed: [] },
		dataTables: { matched: 0, created: 0 },
		variables: { matched: [], created: [], stubbed: [], updated: [], missing: [] },
		tags: { matched: [], created: [], renamed: [], reconciled: [], skipped: [] },
	});
}
