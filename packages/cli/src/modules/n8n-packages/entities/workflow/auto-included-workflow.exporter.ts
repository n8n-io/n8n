import type { Folder, Project } from '@n8n/db';
import { Service } from '@n8n/di';
import { UnexpectedError } from 'n8n-workflow';

import type { WorkflowNodeTypeSource } from './node-type-usage';
import type { AutoIncludedWorkflow } from './auto-included-workflow-resolver';
import { WorkflowSerializer } from './workflow.serializer';
import { packageDirectory, writeManifestEntry } from '../../io/manifest-entry';
import type { PackageWriter } from '../../io/package-writer';
import type { ManifestEntry } from '../../spec/manifest.schema';
import { CredentialRequirementsExtractor } from '../credential/credential-requirements.extractor';
import type { WorkflowCredentialRequirement } from '../credential/credential.types';
import { DataTableRequirementsExtractor } from '../data-table/data-table-requirements.extractor';
import type { WorkflowDataTableRequirement } from '../data-table/data-table.types';
import { FolderSerializer } from '../folder/folder.serializer';
import { ProjectSerializer } from '../project/project.serializer';
import type { WorkflowExportRequirements } from '../requirements.types';
import { TagRequirementsExtractor } from '../tag/tag-requirements.extractor';
import type { WorkflowTagUsage } from '../tag/tag.types';
import { VariableRequirementsExtractor } from '../variable/variable-requirements.extractor';
import type { WorkflowVariableRequirement } from '../variable/variable.types';

export interface AutoIncludedWorkflowExportRequest {
	writer: PackageWriter;
	workflows: AutoIncludedWorkflow[];
	existingWorkflowEntries: ManifestEntry[];
	existingFolderEntries: ManifestEntry[];
	existingProjectEntries: ManifestEntry[];
	includeTags: boolean;
	projectTargetsById?: Map<string, string>;
}

export interface AutoIncludedWorkflowExportResult {
	workflowEntries: ManifestEntry[];
	folderEntries: ManifestEntry[];
	projectEntries: ManifestEntry[];
	requirements: WorkflowExportRequirements;
	projectTargetsById: Map<string, string>;
}

/**
 * The folder and project shells known to one export run: those the main
 * exporters already wrote, plus the ones this exporter adds. Keyed by id so a
 * shell is written once however many workflows land in it.
 */
interface ShellRegistry {
	writer: PackageWriter;
	folderEntriesById: Map<string, ManifestEntry>;
	projectEntriesById: Map<string, ManifestEntry>;
	projectTargetsById: Map<string, string>;
	/** Only the shells this exporter wrote, reported back for the manifest. */
	folderEntries: ManifestEntry[];
	projectEntries: ManifestEntry[];
}

/**
 * Exports auto-included workflows, materializing any folder/project shells
 * needed for their placement.
 */
@Service()
export class AutoIncludedWorkflowExporter {
	constructor(
		private readonly workflowSerializer: WorkflowSerializer,
		private readonly folderSerializer: FolderSerializer,
		private readonly projectSerializer: ProjectSerializer,
		private readonly credentialRequirementsExtractor: CredentialRequirementsExtractor,
		private readonly dataTableRequirementsExtractor: DataTableRequirementsExtractor,
		private readonly variableRequirementsExtractor: VariableRequirementsExtractor,
		private readonly tagRequirementsExtractor: TagRequirementsExtractor,
	) {}

	async export(
		request: AutoIncludedWorkflowExportRequest,
	): Promise<AutoIncludedWorkflowExportResult> {
		const workflowEntriesById = new Map(
			request.existingWorkflowEntries.map((entry) => [entry.id, entry]),
		);
		const shells: ShellRegistry = {
			writer: request.writer,
			folderEntriesById: new Map(request.existingFolderEntries.map((entry) => [entry.id, entry])),
			projectEntriesById: new Map(request.existingProjectEntries.map((entry) => [entry.id, entry])),
			projectTargetsById: new Map([
				...(request.projectTargetsById ?? []),
				...request.existingProjectEntries.map((entry) => [entry.id, entry.target] as const),
			]),
			folderEntries: [],
			projectEntries: [],
		};

		const workflowEntries: ManifestEntry[] = [];
		const credentials: WorkflowCredentialRequirement[] = [];
		const dataTables: WorkflowDataTableRequirement[] = [];
		const variables: WorkflowVariableRequirement[] = [];
		const tags: WorkflowTagUsage[] = [];
		const nodeTypes: WorkflowNodeTypeSource[] = [];

		for (const included of request.workflows) {
			if (workflowEntriesById.has(included.workflow.id)) continue;

			const entry = await writeManifestEntry(
				request.writer,
				'workflows',
				await this.resolveWorkflowBaseDir(included, shells),
				included.workflow,
				this.workflowSerializer.serialize(included.workflow, { includeTags: request.includeTags }),
			);
			workflowEntries.push(entry);
			workflowEntriesById.set(entry.id, entry);
			credentials.push(...this.credentialRequirementsExtractor.extract(included.workflow));
			dataTables.push(...this.dataTableRequirementsExtractor.extract(included.workflow));
			variables.push(...this.variableRequirementsExtractor.extract(included.workflow));
			tags.push(...this.tagRequirementsExtractor.extract(included.workflow));
			nodeTypes.push({
				workflowId: included.workflow.id,
				nodes: included.workflow.nodes ?? [],
			});
		}

		return {
			workflowEntries,
			folderEntries: shells.folderEntries,
			projectEntries: shells.projectEntries,
			requirements: { credentials, dataTables, variables, tags, nodeTypes },
			projectTargetsById: shells.projectTargetsById,
		};
	}

	/**
	 * The `workflows/` directory the workflow lands in: under its owner project
	 * when placed there, under its folder chain when it has one, else top level.
	 */
	private async resolveWorkflowBaseDir(
		included: AutoIncludedWorkflow,
		shells: ShellRegistry,
	): Promise<string> {
		const scope =
			included.placement === 'project'
				? await this.ensureProjectShell(included.ownerProject, shells)
				: undefined;

		// The resolver fills the chain for every placement; a top-level workflow ignores it.
		const chain = included.placement === 'top-level' ? [] : included.folderChain;
		const container =
			chain.length > 0
				? await this.ensureFolderChain(chain, packageDirectory('folders', scope), shells)
				: scope;

		return packageDirectory('workflows', container);
	}

	private async ensureProjectShell(project: Project, shells: ShellRegistry): Promise<string> {
		const existing = shells.projectEntriesById.get(project.id);
		if (existing) return existing.target;

		const entry = await writeManifestEntry(
			shells.writer,
			'projects',
			packageDirectory('projects'),
			project,
			this.projectSerializer.serialize(project),
		);

		shells.projectEntries.push(entry);
		shells.projectEntriesById.set(entry.id, entry);
		shells.projectTargetsById.set(entry.id, entry.target);
		return entry.target;
	}

	/** Writes the chain folders missing from the package and returns the innermost target. */
	private async ensureFolderChain(
		chain: Folder[],
		baseDir: string,
		shells: ShellRegistry,
	): Promise<string> {
		let parentTarget: string | undefined;
		let effectiveParentId: string | null = null;

		for (const folder of chain) {
			const existing = shells.folderEntriesById.get(folder.id);
			if (existing) {
				parentTarget = existing.target;
				effectiveParentId = folder.id;
				continue;
			}

			const entry = await writeManifestEntry(
				shells.writer,
				'folders',
				parentTarget ?? baseDir,
				folder,
				this.folderSerializer.serialize(folder, effectiveParentId),
			);

			shells.folderEntries.push(entry);
			shells.folderEntriesById.set(entry.id, entry);
			parentTarget = entry.target;
			effectiveParentId = folder.id;
		}

		if (!parentTarget) {
			throw new UnexpectedError('Cannot place workflow in an empty folder chain', {
				extra: { baseDir, folderIds: chain.map((folder) => folder.id) },
			});
		}

		return parentTarget;
	}
}
