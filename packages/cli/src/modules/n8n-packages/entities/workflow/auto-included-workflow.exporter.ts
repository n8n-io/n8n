import type { Folder, Project, WorkflowEntity } from '@n8n/db';
import { Service } from '@n8n/di';
import { UnexpectedError } from 'n8n-workflow';

import type { WorkflowNodeTypeSource } from './node-type-usage';
import type { AutoIncludedWorkflow } from './auto-included-workflow-resolver';
import { WorkflowSerializer } from './workflow.serializer';
import { createManifestEntry, packageDirectory } from '../../io/manifest-entry';
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
		const folderEntriesById = new Map(
			request.existingFolderEntries.map((entry) => [entry.id, entry]),
		);
		const projectEntriesById = new Map(
			request.existingProjectEntries.map((entry) => [entry.id, entry]),
		);
		const projectTargetsById = new Map(request.projectTargetsById);

		for (const entry of request.existingProjectEntries) {
			projectTargetsById.set(entry.id, entry.target);
		}

		const workflowEntries: ManifestEntry[] = [];
		const folderEntries: ManifestEntry[] = [];
		const projectEntries: ManifestEntry[] = [];
		const credentials: WorkflowCredentialRequirement[] = [];
		const dataTables: WorkflowDataTableRequirement[] = [];
		const variables: WorkflowVariableRequirement[] = [];
		const tags: WorkflowTagUsage[] = [];
		const nodeTypes: WorkflowNodeTypeSource[] = [];

		for (const included of request.workflows) {
			if (workflowEntriesById.has(included.workflow.id)) continue;

			const baseDir = await this.resolveWorkflowBaseDir({
				included,
				writer: request.writer,
				folderEntriesById,
				projectEntriesById,
				projectTargetsById,
				folderEntries,
				projectEntries,
			});
			const entry = await this.writeWorkflow(
				included.workflow,
				baseDir,
				request.writer,
				request.includeTags,
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
			folderEntries,
			projectEntries,
			requirements: { credentials, dataTables, variables, tags, nodeTypes },
			projectTargetsById,
		};
	}

	private async resolveWorkflowBaseDir(options: {
		included: AutoIncludedWorkflow;
		writer: PackageWriter;
		folderEntriesById: Map<string, ManifestEntry>;
		projectEntriesById: Map<string, ManifestEntry>;
		projectTargetsById: Map<string, string>;
		folderEntries: ManifestEntry[];
		projectEntries: ManifestEntry[];
	}): Promise<string> {
		const { included } = options;
		if (included.placement === 'project') {
			const projectTarget = await this.ensureProjectShell({
				project: included.ownerProject,
				writer: options.writer,
				projectEntriesById: options.projectEntriesById,
				projectTargetsById: options.projectTargetsById,
				projectEntries: options.projectEntries,
			});

			if (included.folderChain.length === 0) {
				return packageDirectory('workflows', projectTarget);
			}

			const folderTarget = await this.ensureFolderChain({
				chain: included.folderChain,
				baseDir: packageDirectory('folders', projectTarget),
				writer: options.writer,
				folderEntriesById: options.folderEntriesById,
				folderEntries: options.folderEntries,
			});
			return packageDirectory('workflows', folderTarget);
		}

		if (included.placement === 'folder' && included.folderChain.length > 0) {
			const folderTarget = await this.ensureFolderChain({
				chain: included.folderChain,
				baseDir: packageDirectory('folders'),
				writer: options.writer,
				folderEntriesById: options.folderEntriesById,
				folderEntries: options.folderEntries,
			});
			return packageDirectory('workflows', folderTarget);
		}

		return packageDirectory('workflows');
	}

	private async ensureProjectShell(options: {
		project: Project;
		writer: PackageWriter;
		projectEntriesById: Map<string, ManifestEntry>;
		projectTargetsById: Map<string, string>;
		projectEntries: ManifestEntry[];
	}): Promise<string> {
		const existing = options.projectEntriesById.get(options.project.id);
		if (existing) return existing.target;

		const entry = createManifestEntry('projects', packageDirectory('projects'), options.project);
		const serialized = this.projectSerializer.serialize(options.project);
		await options.writer.writeDirectory(entry.target);
		await options.writer.writeFile(
			`${entry.target}/project.json`,
			JSON.stringify(serialized, null, '\t'),
		);

		options.projectEntries.push(entry);
		options.projectEntriesById.set(entry.id, entry);
		options.projectTargetsById.set(entry.id, entry.target);
		return entry.target;
	}

	private async ensureFolderChain(options: {
		chain: Folder[];
		baseDir: string;
		writer: PackageWriter;
		folderEntriesById: Map<string, ManifestEntry>;
		folderEntries: ManifestEntry[];
	}): Promise<string> {
		let parentTarget: string | undefined;
		let effectiveParentId: string | null = null;

		for (const folder of options.chain) {
			const existing = options.folderEntriesById.get(folder.id);
			if (existing) {
				parentTarget = existing.target;
				effectiveParentId = folder.id;
				continue;
			}

			const entry = createManifestEntry('folders', parentTarget ?? options.baseDir, folder);
			const serialized = this.folderSerializer.serialize(folder, effectiveParentId);
			await options.writer.writeDirectory(entry.target);
			await options.writer.writeFile(
				`${entry.target}/folder.json`,
				JSON.stringify(serialized, null, '\t'),
			);

			options.folderEntries.push(entry);
			options.folderEntriesById.set(entry.id, entry);
			parentTarget = entry.target;
			effectiveParentId = folder.id;
		}

		if (!parentTarget) {
			throw new UnexpectedError('Cannot place workflow in an empty folder chain', {
				extra: {
					baseDir: options.baseDir,
					folderIds: options.chain.map((folder) => folder.id),
				},
			});
		}

		return parentTarget;
	}

	private async writeWorkflow(
		workflow: WorkflowEntity,
		baseDir: string,
		writer: PackageWriter,
		includeTags: boolean,
	): Promise<ManifestEntry> {
		const entry = createManifestEntry('workflows', baseDir, workflow);
		const serialized = this.workflowSerializer.serialize(workflow, { includeTags });
		await writer.writeDirectory(entry.target);
		await writer.writeFile(`${entry.target}/workflow.json`, JSON.stringify(serialized, null, '\t'));
		return entry;
	}
}
