import { EventService } from '@n8n/backend-services';
import { GlobalConfig } from '@n8n/config';
import { Service } from '@n8n/di';
import { InstanceSettings } from 'n8n-core';

import { N8N_VERSION } from '@/constants';
import { BadRequestError, ForbiddenError } from '@n8n/errors';

import { buildImportResult, toPackageSummary } from './engine/import-result';
import { emitPackageImportedEvent, type ImportOutcome } from './engine/import-telemetry';
import { N8nPackageParser } from './engine/n8n-package-parser';
import { ProjectPackageImporter } from './engine/project-package-importer';
import { WorkflowPackageImporter } from './engine/workflow-package-importer';
import { AgentSelectionExporter } from './entities/agent/agent-selection.exporter';
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
import {
	AutoIncludedWorkflowResolver,
	type WorkflowExportSeed,
} from './entities/workflow/auto-included-workflow-resolver';
import {
	AutoIncludedWorkflowExporter,
	type AutoIncludedWorkflowExportResult,
} from './entities/workflow/auto-included-workflow.exporter';
import { WorkflowDependencyResolver } from './entities/workflow/workflow-dependency-resolver';
import { WorkflowRequirementExporter } from './entities/workflow/workflow-requirement.exporter';
import { WorkflowExporter } from './entities/workflow/workflow.exporter';
import { DirectoryPackageReader } from './io/directory/directory-package-reader';
import { DirectoryPackageWriter } from './io/directory/directory-package-writer';
import { formatEntityFile } from './io/entity-file-format';
import type { PackageReader } from './io/package-reader';
import type { PackageWriter } from './io/package-writer';
import { TarPackageReader } from './io/tar/tar-package-reader';
import { TarPackageWriter } from './io/tar/tar-package-writer';
import { PackageImportConfig } from './n8n-packages.config';
import {
	CredentialExportPolicy,
	DataTableSchemaConflictPolicy,
	ExportDependencyPolicy,
	ExportVersionPolicy,
	OverwriteDeletionPolicy,
	WorkflowConflictPolicy,
	WorkflowIdPolicy,
	type ExportPackageEventCounts,
	type ExportPackageRequest,
	type ExportPackageDirectoryResult,
	type ExportPackageResult,
	type ExportPackageSummary,
	type ImportPackageRequest,
	type ImportPackageSelectionRequest,
	type ImportRequest,
	type ImportResult,
	type ImportSelection,
	type ImportSelectionRequest,
	type PackageImportSource,
	type ResolvedImportPackageRequest,
	type ResolvedImportRequest,
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
	manifest: PackageManifest;
	counts: ExportPackageEventCounts;
	agentIds: string[];
	workflowIds: string[];
	folderIds: string[];
	projectIds: string[];
	credentialExportPolicy: CredentialExportPolicy;
	includeArchivedWorkflows: boolean;
}

type DirectoryProjectPackage =
	| { status: 'empty'; result: ImportResult }
	| { status: 'project'; reader: PackageReader; manifest: PackageManifest };

/**
 * A cherry-pick import acts only on its selection, so most policies are fixed here. Deletion mode is
 * left to the caller (`overwriteDeletionPolicy`): promotion passes `hard-delete` for diff convergence,
 * while the public selection import defaults to the safe `archive`. The caller also sets
 * `dataTableSchemaConflictPolicy`, which defaults to `fail`.
 */
const CHERRY_PICK_IMPORT_POLICY = {
	projectConflictPolicy: 'merge',
	folderConflictPolicy: 'merge',
	workflowPublishingPolicy: 'match-source',
	missingNodeTypeMode: 'fail',
	credentialMatchingMode: 'id-only',
	credentialMissingMode: 'must-preexist',
	dataTableMatchingMode: 'by-id',
	dataTableMissingMode: 'create',
	variableMissingMode: 'must-preexist',
	variableConflictPolicy: 'keep-existing',
	tagMissingMode: 'create',
	tagConflictPolicy: 'skip',
} as const satisfies Omit<
	ResolvedImportRequest,
	| 'user'
	| 'projectId'
	| 'folderId'
	| 'apiKeyScopes'
	| 'bindings'
	| 'selection'
	| 'overwriteDeletionPolicy'
	| 'workflowConflictPolicy'
	| 'workflowIdPolicy'
	| 'dataTableSchemaConflictPolicy'
>;

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
		private readonly agentSelectionExporter: AgentSelectionExporter,
	) {}

	async exportPackage(request: ExportPackageRequest): Promise<ExportPackageResult> {
		const writer = new TarPackageWriter();
		const result = await this.writeExport(writer, request);
		const stream = writer.finalize();

		// This event represents a user-facing archive export, not an internal directory write.
		this.eventService.emit('n8n-package-exported', {
			user: request.user,
			...(result.agentIds.length ? { agentIds: result.agentIds } : {}),
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
	): Promise<ExportPackageDirectoryResult> {
		const writer = new DirectoryPackageWriter(target.targetDir);
		const result = await this.exportPackageToWriter(request, writer);
		await writer.finalize();
		return { counts: result.counts, manifest: result.manifest };
	}

	async exportPackageToWriter(
		request: ExportPackageRequest,
		writer: PackageWriter,
	): Promise<ExportPackageSummary & { manifest: PackageManifest }> {
		const { manifest, counts } = await this.writeExport(writer, request);
		return { manifest, counts };
	}

	private async writeExport(
		writer: PackageWriter,
		request: ExportPackageRequest,
	): Promise<WrittenExport> {
		const dependencyPolicy = request.dependencyPolicy ?? ExportDependencyPolicy.Fail;
		const isReferenceOnly = dependencyPolicy === ExportDependencyPolicy.ReferenceOnly;

		const includeTags = (request.includeTags ?? true) && !this.globalConfig.tags.disabled;
		const versionPolicy = request.versionPolicy ?? ExportVersionPolicy.Latest;
		const credentialExportPolicy =
			request.credentialExportPolicy ?? CredentialExportPolicy.ExpressionValuesOnly;
		const includeArchivedWorkflows = request.includeArchivedWorkflows ?? false;

		const { folderExportResult, workflowExportResult, projectExportResult, agentExportResult } =
			await this.exportSelectedEntities(writer, request, {
				includeTags,
				versionPolicy,
				dependencyPolicy,
				includeArchivedWorkflows,
			});

		const allFoldersBeforeAutoInclude = [
			...(folderExportResult?.entries ?? []),
			...(projectExportResult?.folderEntries ?? []),
		];
		const allProjectsBeforeAutoInclude = [
			...(projectExportResult?.entries ?? []),
			...(agentExportResult?.projectEntries ?? []),
		];
		const projectTargetsBeforeAutoInclude =
			agentExportResult?.projectTargetsById ?? projectExportResult?.projectTargetsById;
		const allWorkflowsBeforeAutoInclude = [
			...(workflowExportResult?.entries ?? []),
			...(folderExportResult?.workflowEntries ?? []),
			...(projectExportResult?.workflowEntries ?? []),
		];
		const agentWorkflowRequirements = agentExportResult?.workflowRequirements ?? [];
		const exportedWorkflowIds = allWorkflowsBeforeAutoInclude.map(({ id }) => id);
		const workflowIdsToResolve = [...exportedWorkflowIds];
		if (!isReferenceOnly) {
			workflowIdsToResolve.push(
				...agentWorkflowRequirements.map(({ referencedWorkflowId }) => referencedWorkflowId),
			);
		}

		// Reference-only keeps missing dependencies out of the package, so only the
		// direct references of packaged workflows matter — a referenced workflow's
		// own dependency closure is assumed to exist on the target alongside it.
		const workflowRequirements = await this.workflowDependencyResolver.resolve({
			user: request.user,
			workflowIds: workflowIdsToResolve,
			traversal: isReferenceOnly ? 'direct' : 'transitive',
			versionPolicy,
		});
		const allWorkflowRequirements = [...agentWorkflowRequirements, ...workflowRequirements];

		let autoIncludedExportResult: AutoIncludedWorkflowExportResult | undefined;

		if (dependencyPolicy === ExportDependencyPolicy.IncludeInPackage) {
			const autoIncludedWorkflowResolution = await this.autoIncludedWorkflowResolver.resolve({
				user: request.user,
				requirements: workflowRequirements,
				exportedWorkflowIds,
				workflowSeeds: [
					...(workflowExportResult?.entries ?? []).map<WorkflowExportSeed>(({ id }) => ({
						workflowId: id,
						origin: 'top-level',
					})),
					...(folderExportResult?.workflowEntries ?? []).map<WorkflowExportSeed>(({ id }) => ({
						workflowId: id,
						origin: 'folder',
					})),
					...(projectExportResult?.workflowEntries ?? []).map<WorkflowExportSeed>(({ id }) => ({
						workflowId: id,
						origin: 'project',
					})),
					...agentWorkflowRequirements.map(({ referencedWorkflowId, origin }) => ({
						workflowId: referencedWorkflowId,
						origin,
					})),
				],
				includeTags,
				versionPolicy,
			});

			autoIncludedExportResult = await this.autoIncludedWorkflowExporter.export({
				writer,
				workflows: autoIncludedWorkflowResolution.autoIncludedWorkflows,
				existingWorkflowEntries: allWorkflowsBeforeAutoInclude,
				existingFolderEntries: allFoldersBeforeAutoInclude,
				existingProjectEntries: allProjectsBeforeAutoInclude,
				includeTags,
				projectTargetsById: projectTargetsBeforeAutoInclude,
			});
		}

		const requirements = mergeRequirements(
			workflowExportResult?.requirements,
			folderExportResult?.requirements,
			projectExportResult?.requirements,
			agentExportResult?.requirements,
			autoIncludedExportResult?.requirements,
		);

		const includeVariableValues = request.includeVariableValues ?? true;
		if (
			includeVariableValues &&
			requirements.variables.length > 0 &&
			request.canExportVariableValues === false
		) {
			throw new ForbiddenError(
				'The exported entities reference variables, but the API key is missing the variable:list scope needed to bundle their values. Add the scope or set includeVariableValues to false.',
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
				allWorkflowRequirements,
				new Set(allWorkflowsInPackage.map(({ id }) => id)),
			);
		}

		// Workflow dependencies can add project shells to the selected entities' targets.
		const projectTargetsById =
			autoIncludedExportResult?.projectTargetsById ?? projectTargetsBeforeAutoInclude;

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
			requirements: allWorkflowRequirements,
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
			agents: agentExportResult?.agentRequirements,
			credentials: credentialExportResult.requirements,
			dataTables: dataTableExportResult.requirements,
			workflows: workflowRequirementExportResult.requirements,
			variables: variableExportResult.requirements,
			tags: tagExportResult.requirements,
			nodeTypes: collectNodeTypeUsage(requirements.nodeTypes),
		});

		const agentEntries = agentExportResult?.agentEntries ?? [];
		const manifest = packageManifestSchema.parse({
			packageFormatVersion: FORMAT_VERSION,
			exportedAt: new Date().toISOString(),
			sourceN8nVersion: N8N_VERSION,
			sourceId: this.instanceSettings.instanceId,
			...(agentEntries.length > 0 ? { agents: agentEntries } : {}),
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

		await writer.writeFile('manifest.json', formatEntityFile(manifest));

		const counts: ExportPackageEventCounts = {
			agents: agentEntries.length,
			workflows: allWorkflowsInPackage.length,
			folders: allFolders.length,
			credentials: credentialExportResult.entries.length,
			dataTables: dataTableExportResult.entries.length,
			variables: variableExportResult.entries.length,
			tags: tagExportResult.entries.length,
		};

		return {
			manifest,
			counts,
			agentIds: agentEntries.map(({ id }) => id),
			workflowIds: allWorkflowsInPackage.map(({ id }) => id),
			folderIds: allFolders.map(({ id }) => id),
			projectIds: allProjects.map(({ id }) => id),
			credentialExportPolicy,
			includeArchivedWorkflows,
		};
	}

	private async exportSelectedEntities(
		writer: PackageWriter,
		request: ExportPackageRequest,
		options: {
			includeTags: boolean;
			versionPolicy: ExportVersionPolicy;
			dependencyPolicy: ExportDependencyPolicy;
			includeArchivedWorkflows: boolean;
		},
	) {
		const workflowIds = request.workflowIds ?? [];
		const folderIds = request.folderIds ?? [];
		const projectIds = request.projectIds ?? [];
		const { includeTags, versionPolicy, dependencyPolicy, includeArchivedWorkflows } = options;

		const folderExportResult =
			folderIds.length > 0
				? await this.folderExporter.export({
						user: request.user,
						folderIds,
						writer,
						includeTags,
						versionPolicy,
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
						versionPolicy,
					})
				: undefined;

		const projectExportResult =
			projectIds.length > 0
				? await this.projectExporter.export({
						user: request.user,
						projectIds,
						workflowIds: request.projectWorkflowIds,
						writer,
						includeTags,
						versionPolicy,
						includeArchivedWorkflows,
					})
				: undefined;

		const agentExportResult =
			request.includeAgents === false
				? undefined
				: await this.agentSelectionExporter.export({
						user: request.user,
						writer,
						agentIds: request.agentIds,
						projectIds,
						projectWorkflowIds: request.projectWorkflowIds,
						versionPolicy,
						dependencyPolicy,
						projectTargetsById: projectExportResult?.projectTargetsById,
					});

		return { folderExportResult, workflowExportResult, projectExportResult, agentExportResult };
	}

	async importPackage(request: ImportPackageRequest): Promise<ImportResult> {
		const reader = new TarPackageReader(request.packageBuffer, this.packageImportConfig);
		const manifest = await this.readImportManifest(reader);
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
		const opened = await this.readDirectoryProjectPackage(source);
		if (opened.status === 'empty') return opened.result;
		const { result } = await this.dispatchImport(
			request,
			opened.reader,
			opened.manifest,
			'git-pull',
		);
		return result;
	}

	async importPackageSelectionFromDirectory(
		request: ImportSelectionRequest,
		source: { sourceDir: string },
		selection: ImportSelection,
	): Promise<ImportResult> {
		const opened = await this.readDirectoryProjectPackage(source);
		if (opened.status === 'empty') return opened.result;
		const { result } = await this.dispatchSelectionImport(
			request,
			opened.reader,
			opened.manifest,
			selection,
			'git-pull',
		);
		return result;
	}

	/** Emit import telemetry for public API requests. Directory imports use the Git pull path. */
	async importPackageSelection(
		request: ImportPackageSelectionRequest,
		selection: ImportSelection,
	): Promise<ImportResult> {
		const reader = new TarPackageReader(request.packageBuffer, this.packageImportConfig);
		const manifest = await this.readImportManifest(reader);
		if (!isProjectPackage(manifest)) {
			throw new BadRequestError('A selection import requires a project package.');
		}
		const { result, scopes, resolvedRequest } = await this.dispatchSelectionImport(
			request,
			reader,
			manifest,
			selection,
			'package-import',
		);

		emitPackageImportedEvent(this.eventService, {
			request: { ...resolvedRequest, packageBuffer: request.packageBuffer },
			manifest,
			scopes,
		});

		return result;
	}

	private async readImportManifest(reader: PackageReader): Promise<PackageManifest> {
		const manifest = await this.packageParser.getManifest(reader);
		if (manifest.agents?.length) {
			throw new BadRequestError('Importing packages that contain Agents is not supported yet.');
		}
		return manifest;
	}

	/** An empty working copy needs no import. Reject content without a project. */
	private async readDirectoryProjectPackage(source: {
		sourceDir: string;
	}): Promise<DirectoryProjectPackage> {
		const reader = new DirectoryPackageReader(source.sourceDir, this.packageImportConfig);
		await reader.listEntries();
		const manifest = await this.readImportManifest(reader);
		if (isProjectPackage(manifest)) {
			return { status: 'project', reader, manifest };
		}
		if (hasContentWithoutProjects(manifest)) {
			throw new BadRequestError('Directory packages must contain projects');
		}
		return { status: 'empty', result: emptyImportResult(manifest) };
	}

	/** The caller must validate that the manifest describes a project package. */
	private async dispatchSelectionImport(
		request: ImportSelectionRequest,
		reader: PackageReader,
		manifest: PackageManifest,
		selection: ImportSelection,
		importSource: PackageImportSource,
	): Promise<ImportOutcome & { resolvedRequest: ResolvedImportRequest }> {
		const packageProjectIds = new Set((manifest.projects ?? []).map((project) => project.id));
		if (!packageProjectIds.has(selection.selectedProjectId)) {
			throw new BadRequestError(
				`The selected project "${selection.selectedProjectId}" is not present in the package.`,
			);
		}

		const resolvedRequest: ResolvedImportRequest = {
			user: request.user,
			...(request.apiKeyScopes !== undefined ? { apiKeyScopes: request.apiKeyScopes } : {}),
			...(request.bindings !== undefined ? { bindings: request.bindings } : {}),
			...CHERRY_PICK_IMPORT_POLICY,
			overwriteDeletionPolicy: request.overwriteDeletionPolicy ?? OverwriteDeletionPolicy.Archive,
			workflowConflictPolicy: request.workflowConflictPolicy ?? WorkflowConflictPolicy.NewVersion,
			workflowIdPolicy: request.workflowIdPolicy ?? WorkflowIdPolicy.Source,
			dataTableSchemaConflictPolicy:
				request.dataTableSchemaConflictPolicy ?? DataTableSchemaConflictPolicy.Fail,
			selection,
		};

		const outcome = await this.projectPackageImporter.import(
			resolvedRequest,
			reader,
			manifest,
			importSource,
		);
		return { ...outcome, resolvedRequest };
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
		agents: PackageRequirements['agents'];
		credentials: PackageRequirements['credentials'];
		dataTables: PackageRequirements['dataTables'];
		workflows: PackageRequirements['workflows'];
		variables: PackageRequirements['variables'];
		tags: PackageRequirements['tags'];
		nodeTypes: PackageRequirements['nodeTypes'];
	}): PackageRequirements | undefined {
		const { agents, credentials, dataTables, workflows, variables, tags, nodeTypes } = input;

		const requirements: PackageRequirements = {
			...(agents?.length ? { agents } : {}),
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
		dataTables: { matched: 0, created: 0, updated: 0 },
		variables: { matched: [], created: [], stubbed: [], updated: [], missing: [] },
		tags: { matched: [], created: [], renamed: [], reconciled: [], skipped: [] },
	});
}
