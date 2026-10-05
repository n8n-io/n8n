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
import { AgentExporter } from './entities/agent/agent.exporter';
import type { WorkflowExportRequirement } from './entities/workflow/workflow.types';
import type { WorkflowExportRequirements } from './entities/requirements.types';
import type { WorkflowExportOrigin } from './entities/workflow/auto-included-workflow-resolver';

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
import { AutoIncludedWorkflowExporter } from './entities/workflow/auto-included-workflow.exporter';
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
	MissingWorkflowDependencyPolicy,
	OverwriteDeletionPolicy,
	WorkflowConflictPolicy,
	WorkflowIdPolicy,
	WorkflowVersionPolicy,
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

interface ExportedContent {
	agents: ManifestEntry[];
	workflows: ManifestEntry[];
	folders: ManifestEntry[];
	projects: ManifestEntry[];
	requirements: WorkflowExportRequirements;
	agentRequirements: PackageRequirements['agents'];
	workflowRequirements: WorkflowExportRequirement[];
	workflowOrigins: Map<string, Set<WorkflowExportOrigin>>;
	projectTargetsById: Map<string, string>;
	topLevelWorkflowIds: string[];
	folderWorkflowIds: string[];
	projectWorkflowIds: string[];
}

type ResolvedExportRequest = ExportPackageRequest &
	Required<
		Pick<
			ExportPackageRequest,
			| 'includeTags'
			| 'workflowVersionPolicy'
			| 'credentialExportPolicy'
			| 'includeArchivedWorkflows'
		>
	>;

interface WrittenExport {
	agentIds: string[];
	manifest: PackageManifest;
	counts: ExportPackageEventCounts;
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
 * while the public selection import defaults to the safe `archive`.
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
	dataTableSchemaConflictPolicy: 'fail',
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
		private readonly agentExporter: AgentExporter,
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
		const resolved: ResolvedExportRequest = {
			...request,
			includeTags: (request.includeTags ?? true) && !this.globalConfig.tags.disabled,
			workflowVersionPolicy: request.workflowVersionPolicy ?? WorkflowVersionPolicy.Latest,
			credentialExportPolicy:
				request.credentialExportPolicy ?? CredentialExportPolicy.ExpressionValuesOnly,
			includeArchivedWorkflows: request.includeArchivedWorkflows ?? false,
		};
		const content = await this.exportSelection(writer, resolved);
		await this.includeWorkflowDependencies(writer, resolved, content);
		const dependencies = await this.exportRequirements(writer, resolved, content);
		const manifest = packageManifestSchema.parse({
			packageFormatVersion: FORMAT_VERSION,
			exportedAt: new Date().toISOString(),
			sourceN8nVersion: N8N_VERSION,
			sourceId: this.instanceSettings.instanceId,
			...(content.agents.length ? { agents: content.agents } : {}),
			...(content.workflows.length ? { workflows: content.workflows } : {}),
			...(content.folders.length ? { folders: content.folders } : {}),
			...(content.projects.length ? { projects: content.projects } : {}),
			...(dependencies.credentials.entries.length
				? { credentials: dependencies.credentials.entries }
				: {}),
			...(dependencies.dataTables.entries.length
				? { dataTables: dependencies.dataTables.entries }
				: {}),
			...(dependencies.variables.entries.length
				? { variables: dependencies.variables.entries }
				: {}),
			...(dependencies.tags.entries.length ? { tags: dependencies.tags.entries } : {}),
			...(dependencies.requirements ? { requirements: dependencies.requirements } : {}),
		});
		await writer.writeFile('manifest.json', formatEntityFile(manifest));
		return {
			manifest,
			counts: {
				agents: content.agents.length,
				workflows: content.workflows.length,
				folders: content.folders.length,
				credentials: dependencies.credentials.entries.length,
				dataTables: dependencies.dataTables.entries.length,
				variables: dependencies.variables.entries.length,
				tags: dependencies.tags.entries.length,
			},
			agentIds: content.agents.map(({ id }) => id),
			workflowIds: content.workflows.map(({ id }) => id),
			folderIds: content.folders.map(({ id }) => id),
			projectIds: content.projects.map(({ id }) => id),
			credentialExportPolicy: resolved.credentialExportPolicy,
			includeArchivedWorkflows: resolved.includeArchivedWorkflows,
		};
	}

	private async exportSelection(
		writer: PackageWriter,
		request: ResolvedExportRequest,
	): Promise<ExportedContent> {
		const { user, includeTags, workflowVersionPolicy, includeArchivedWorkflows } = request;
		const folders = await this.folderExporter.export({
			user,
			folderIds: request.folderIds ?? [],
			writer,
			includeTags,
			workflowVersionPolicy,
			includeArchivedWorkflows,
		});
		const workflows = await this.workflowExporter.export({
			user,
			workflowIds: this.filterWorkflowsAlreadyInFolders(
				folders.workflowEntries,
				request.workflowIds ?? [],
			),
			writer,
			includeTags,
			workflowVersionPolicy,
		});
		const projects = await this.projectExporter.export({
			user,
			projectIds: request.projectIds ?? [],
			workflowIds: request.projectWorkflowIds,
			writer,
			includeTags,
			workflowVersionPolicy,
			includeArchivedWorkflows,
		});
		const agents = await this.agentExporter.export(request, writer, projects.entries);
		return {
			agents: agents.entries,
			workflows: this.dedupeManifestEntries([
				...workflows.entries,
				...folders.workflowEntries,
				...projects.workflowEntries,
			]),
			folders: this.dedupeManifestEntries([...folders.entries, ...projects.folderEntries]),
			projects: this.dedupeManifestEntries([...projects.entries, ...agents.projectEntries]),
			requirements: mergeRequirements(
				workflows.requirements,
				folders.requirements,
				projects.requirements,
				agents.requirements,
			),
			agentRequirements: agents.agentRequirements,
			workflowRequirements: agents.workflowRequirements,
			workflowOrigins: agents.workflowOrigins,
			projectTargetsById: agents.projectTargetsById,
			topLevelWorkflowIds: workflows.entries.map(({ id }) => id),
			folderWorkflowIds: folders.workflowEntries.map(({ id }) => id),
			projectWorkflowIds: projects.workflowEntries.map(({ id }) => id),
		};
	}

	private async includeWorkflowDependencies(
		writer: PackageWriter,
		request: ResolvedExportRequest,
		content: ExportedContent,
	): Promise<void> {
		const isReferenceOnly =
			request.missingWorkflowDependencyPolicy === MissingWorkflowDependencyPolicy.ReferenceOnly;
		const roots = content.workflows.map(({ id }) => id);
		if (!isReferenceOnly)
			roots.push(
				...content.workflowRequirements.map(({ referencedWorkflowId }) => referencedWorkflowId),
			);
		const requirements = await this.workflowDependencyResolver.resolve({
			user: request.user,
			workflowIds: roots,
			traversal: isReferenceOnly ? 'direct' : 'transitive',
			workflowVersionPolicy: request.workflowVersionPolicy,
		});
		content.workflowRequirements.push(...requirements);
		if (
			request.missingWorkflowDependencyPolicy === MissingWorkflowDependencyPolicy.IncludeInPackage
		) {
			const resolved = await this.autoIncludedWorkflowResolver.resolve({
				user: request.user,
				requirements,
				topLevelWorkflowIds: content.topLevelWorkflowIds,
				folderWorkflowIds: content.folderWorkflowIds,
				projectWorkflowIds: content.projectWorkflowIds,
				additionalOrigins: content.workflowOrigins,
				includeTags: request.includeTags,
				workflowVersionPolicy: request.workflowVersionPolicy,
			});
			const included = await this.autoIncludedWorkflowExporter.export({
				writer,
				workflows: resolved.autoIncludedWorkflows,
				existingWorkflowEntries: content.workflows,
				existingFolderEntries: content.folders,
				existingProjectEntries: content.projects,
				projectTargetsById: content.projectTargetsById,
				includeTags: request.includeTags,
			});
			content.workflows = this.dedupeManifestEntries([
				...content.workflows,
				...included.workflowEntries,
			]);
			content.folders = this.dedupeManifestEntries([...content.folders, ...included.folderEntries]);
			content.projects = this.dedupeManifestEntries([
				...content.projects,
				...included.projectEntries,
			]);
			content.requirements = mergeRequirements(content.requirements, included.requirements);
			content.projectTargetsById = included.projectTargetsById;
		}
		if (!isReferenceOnly)
			assertStaticSubWorkflowsIncluded(
				content.workflowRequirements,
				new Set(content.workflows.map(({ id }) => id)),
			);
	}

	private async exportRequirements(
		writer: PackageWriter,
		request: ResolvedExportRequest,
		content: ExportedContent,
	) {
		const { requirements, projectTargetsById } = content;
		const { user, credentialExportPolicy } = request;
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
		const credentials = await this.credentialExporter.export({
			user,
			requirements: requirements.credentials,
			writer,
			credentialExportPolicy,
			projectTargetsById,
		});
		const dataTables = await this.dataTableExporter.export({
			user,
			requirements: requirements.dataTables,
			writer,
			projectTargetsById,
		});
		const workflows = await this.workflowRequirementExporter.export({
			user,
			requirements: content.workflowRequirements,
			workflows: content.workflows,
		});
		const variables = await this.variableExporter.export({
			user,
			requirements: requirements.variables,
			writer,
			includeVariableValues,
			projectTargetsById,
		});
		const tags = await this.tagExporter.export({ usages: requirements.tags, writer });
		return {
			credentials,
			dataTables,
			variables,
			tags,
			requirements: this.buildManifestRequirements({
				agents: content.agentRequirements,
				credentials: credentials.requirements,
				dataTables: dataTables.requirements,
				workflows: workflows.requirements,
				variables: variables.requirements,
				tags: tags.requirements,
				nodeTypes: collectNodeTypeUsage(requirements.nodeTypes),
			}),
		};
	}

	async importPackage(request: ImportPackageRequest): Promise<ImportResult> {
		const reader = new TarPackageReader(request.packageBuffer, this.packageImportConfig);
		const manifest = await this.packageParser.getManifest(reader);
		assertAgentImportSupported(manifest);
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
		const manifest = await this.packageParser.getManifest(reader);
		assertAgentImportSupported(manifest);
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

	/** An empty working copy needs no import. Reject content without a project. */
	private async readDirectoryProjectPackage(source: {
		sourceDir: string;
	}): Promise<DirectoryProjectPackage> {
		const reader = new DirectoryPackageReader(source.sourceDir, this.packageImportConfig);
		await reader.listEntries();
		const manifest = await this.packageParser.getManifest(reader);
		assertAgentImportSupported(manifest);
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
		dataTables: { matched: 0, created: 0 },
		variables: { matched: [], created: [], stubbed: [], updated: [], missing: [] },
		tags: { matched: [], created: [], renamed: [], reconciled: [], skipped: [] },
	});
}

function assertAgentImportSupported(manifest: PackageManifest): void {
	if (manifest.agents?.length)
		throw new BadRequestError('Packages containing agents cannot be imported yet.');
}
