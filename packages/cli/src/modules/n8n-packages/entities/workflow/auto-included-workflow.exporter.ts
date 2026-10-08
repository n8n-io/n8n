import type { Folder } from '@n8n/db';
import { Service } from '@n8n/di';
import { UnexpectedError } from 'n8n-workflow';

import type { NodeTypeSource } from './node-type-usage';
import type { AutoIncludedWorkflow } from './auto-included-workflow-resolver';
import { WorkflowSerializer } from './workflow.serializer';
import {
	packageDirectory,
	writeManifestEntry,
	writeWorkflowManifestEntry,
} from '../../io/manifest-entry';
import type { PackageWriter } from '../../io/package-writer';
import type { ManifestEntry } from '../../spec/manifest.schema';
import { CredentialRequirementsExtractor } from '../credential/credential-requirements.extractor';
import type { WorkflowCredentialRequirement } from '../credential/credential.types';
import { DataTableRequirementsExtractor } from '../data-table/data-table-requirements.extractor';
import type { WorkflowDataTableRequirement } from '../data-table/data-table.types';
import { FolderSerializer } from '../folder/folder.serializer';
import {
	ProjectShellExporter,
	type ProjectShellExportContext,
} from '../project/project-shell.exporter';
import type { ExportRequirements } from '../requirements.types';
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
	requirements: ExportRequirements;
	projectTargetsById: Map<string, string>;
}

/**
 * The folder and project shells known to one export run: those the main
 * exporters already wrote, plus the ones this exporter adds. Keyed by id so a
 * shell is written once however many workflows land in it.
 */
interface ShellRegistry extends ProjectShellExportContext {
	folderEntriesById: Map<string, ManifestEntry>;
	/** Only the shells this exporter wrote, reported back for the manifest. */
	folderEntries: ManifestEntry[];
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
		private readonly projectShellExporter: ProjectShellExporter,
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
		const nodeTypes: NodeTypeSource[] = [];

		for (const included of request.workflows) {
			if (workflowEntriesById.has(included.workflow.id)) continue;

			const entry = await writeWorkflowManifestEntry(
				request.writer,
				await this.resolveWorkflowBaseDir(included, shells),
				included.workflow,
				this.workflowSerializer.serialize(included.workflow, { includeTags: request.includeTags }),
				this.workflowSerializer.serializeMetadata(included.workflow),
			);
			workflowEntries.push(entry);
			workflowEntriesById.set(entry.id, entry);
			credentials.push(
				...this.credentialRequirementsExtractor.extractFromWorkflow(included.workflow),
			);
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
				? await this.projectShellExporter.export(included.ownerProject, shells)
				: undefined;

		// The resolver fills the chain for every placement; a top-level workflow ignores it.
		const chain = included.placement === 'top-level' ? [] : included.folderChain;
		const container =
			chain.length > 0
				? await this.ensureFolderChain(chain, packageDirectory('folders', scope), shells)
				: scope;

		return packageDirectory('workflows', container);
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
