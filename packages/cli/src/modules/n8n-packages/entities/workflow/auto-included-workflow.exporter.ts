import type { Folder, Project, WorkflowEntity } from '@n8n/db';
import { Service } from '@n8n/di';
import { UnexpectedError } from 'n8n-workflow';

import type { WorkflowNodeTypeSource } from './node-type-usage';
import type { AutoIncludedWorkflow } from './auto-included-workflow-resolver';
import { WorkflowSerializer } from './workflow.serializer';
import type { PackageWriter } from '../../io/package-writer';
import { UniqueFilenameAllocator } from '../../io/unique-filename-allocator';
import type { ManifestEntry } from '../../spec/manifest.schema';
import { CredentialRequirementsExtractor } from '../credential/credential-requirements.extractor';
import type { WorkflowCredentialRequirement } from '../credential/credential.types';
import { DataTableRequirementsExtractor } from '../data-table/data-table-requirements.extractor';
import type { WorkflowDataTableRequirement } from '../data-table/data-table.types';
import { FolderSerializer } from '../folder/folder.serializer';
import { ProjectSerializer } from '../project/project.serializer';
import type { WorkflowExportRequirements } from '../requirements.types';
import { VariableRequirementsExtractor } from '../variable/variable-requirements.extractor';
import type { WorkflowVariableRequirement } from '../variable/variable.types';

export interface AutoIncludedWorkflowExportRequest {
	writer: PackageWriter;
	workflows: AutoIncludedWorkflow[];
	existingWorkflowEntries: ManifestEntry[];
	existingFolderEntries: ManifestEntry[];
	existingProjectEntries: ManifestEntry[];
	projectTargetsById?: Map<string, string>;
}

export interface AutoIncludedWorkflowExportResult {
	workflowEntries: ManifestEntry[];
	folderEntries: ManifestEntry[];
	projectEntries: ManifestEntry[];
	requirements: WorkflowExportRequirements;
	projectTargetsById: Map<string, string>;
}

interface ExportAllocators {
	workflows: Map<string, UniqueFilenameAllocator>;
	folders: Map<string, UniqueFilenameAllocator>;
	project: UniqueFilenameAllocator;
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
	) {}

	export(request: AutoIncludedWorkflowExportRequest): AutoIncludedWorkflowExportResult {
		const allocators: ExportAllocators = {
			workflows: new Map(),
			folders: new Map(),
			project: new UniqueFilenameAllocator('projects', 'project'),
		};

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

		for (const entry of request.existingWorkflowEntries) {
			allocatorFor(allocators.workflows, parentDir(entry.target), 'workflow').reservePath(
				entry.target,
			);
		}
		for (const entry of request.existingFolderEntries) {
			allocatorFor(allocators.folders, parentDir(entry.target), 'folder').reservePath(entry.target);
		}
		for (const entry of request.existingProjectEntries) {
			allocators.project.reservePath(entry.target);
			projectTargetsById.set(entry.id, entry.target);
		}

		const workflowEntries: ManifestEntry[] = [];
		const folderEntries: ManifestEntry[] = [];
		const projectEntries: ManifestEntry[] = [];
		const credentials: WorkflowCredentialRequirement[] = [];
		const dataTables: WorkflowDataTableRequirement[] = [];
		const variables: WorkflowVariableRequirement[] = [];
		const nodeTypes: WorkflowNodeTypeSource[] = [];

		for (const included of request.workflows) {
			if (workflowEntriesById.has(included.workflow.id)) continue;

			const baseDir = this.resolveWorkflowBaseDir({
				included,
				writer: request.writer,
				folderEntriesById,
				projectEntriesById,
				projectTargetsById,
				folderEntries,
				projectEntries,
				allocators,
			});
			const entry = this.writeWorkflow(
				included.workflow,
				baseDir,
				request.writer,
				allocators.workflows,
			);
			workflowEntries.push(entry);
			workflowEntriesById.set(entry.id, entry);
			credentials.push(...this.credentialRequirementsExtractor.extract(included.workflow));
			dataTables.push(...this.dataTableRequirementsExtractor.extract(included.workflow));
			variables.push(...this.variableRequirementsExtractor.extract(included.workflow));
			nodeTypes.push({
				workflowId: included.workflow.id,
				nodes: included.workflow.nodes ?? [],
			});
		}

		return {
			workflowEntries,
			folderEntries,
			projectEntries,
			requirements: { credentials, dataTables, variables, nodeTypes },
			projectTargetsById,
		};
	}

	private resolveWorkflowBaseDir(options: {
		included: AutoIncludedWorkflow;
		writer: PackageWriter;
		folderEntriesById: Map<string, ManifestEntry>;
		projectEntriesById: Map<string, ManifestEntry>;
		projectTargetsById: Map<string, string>;
		folderEntries: ManifestEntry[];
		projectEntries: ManifestEntry[];
		allocators: ExportAllocators;
	}): string {
		const { included } = options;
		if (included.placement === 'project') {
			const projectTarget = this.ensureProjectShell({
				project: included.ownerProject,
				writer: options.writer,
				projectEntriesById: options.projectEntriesById,
				projectTargetsById: options.projectTargetsById,
				projectEntries: options.projectEntries,
				allocator: options.allocators.project,
			});

			if (included.folderChain.length === 0) {
				return `${projectTarget}/workflows`;
			}

			const folderTarget = this.ensureFolderChain({
				chain: included.folderChain,
				baseDir: `${projectTarget}/folders`,
				writer: options.writer,
				folderEntriesById: options.folderEntriesById,
				folderEntries: options.folderEntries,
				allocators: options.allocators.folders,
			});
			return `${folderTarget}/workflows`;
		}

		if (included.placement === 'folder' && included.folderChain.length > 0) {
			const folderTarget = this.ensureFolderChain({
				chain: included.folderChain,
				baseDir: 'folders',
				writer: options.writer,
				folderEntriesById: options.folderEntriesById,
				folderEntries: options.folderEntries,
				allocators: options.allocators.folders,
			});
			return `${folderTarget}/workflows`;
		}

		return 'workflows';
	}

	private ensureProjectShell(options: {
		project: Project;
		writer: PackageWriter;
		projectEntriesById: Map<string, ManifestEntry>;
		projectTargetsById: Map<string, string>;
		projectEntries: ManifestEntry[];
		allocator: UniqueFilenameAllocator;
	}): string {
		const existing = options.projectEntriesById.get(options.project.id);
		if (existing) return existing.target;

		const target = options.allocator.allocate(options.project.name);
		const serialized = this.projectSerializer.serialize(options.project);
		options.writer.writeDirectory(target);
		options.writer.writeFile(`${target}/project.json`, JSON.stringify(serialized, null, '\t'));

		const entry = { id: options.project.id, name: options.project.name, target };
		options.projectEntries.push(entry);
		options.projectEntriesById.set(entry.id, entry);
		options.projectTargetsById.set(entry.id, entry.target);
		return target;
	}

	private ensureFolderChain(options: {
		chain: Folder[];
		baseDir: string;
		writer: PackageWriter;
		folderEntriesById: Map<string, ManifestEntry>;
		folderEntries: ManifestEntry[];
		allocators: Map<string, UniqueFilenameAllocator>;
	}): string {
		let parentTarget: string | undefined;
		let effectiveParentId: string | null = null;

		for (const folder of options.chain) {
			const existing = options.folderEntriesById.get(folder.id);
			if (existing) {
				parentTarget = existing.target;
				effectiveParentId = folder.id;
				continue;
			}

			const allocator = allocatorFor(options.allocators, parentTarget ?? options.baseDir, 'folder');
			// A folder's directly-contained workflows are written under `<folder>/workflows`,
			// so reserve that segment before placing child folders — otherwise a child folder
			// named "workflows" would collide with its parent's workflow directory.
			if (parentTarget) allocator.reserve('workflows');
			const target = allocator.allocate(folder.name);
			const serialized = this.folderSerializer.serialize(folder, effectiveParentId);
			options.writer.writeDirectory(target);
			options.writer.writeFile(`${target}/folder.json`, JSON.stringify(serialized, null, '\t'));

			const entry = { id: folder.id, name: folder.name, target };
			options.folderEntries.push(entry);
			options.folderEntriesById.set(entry.id, entry);
			parentTarget = target;
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

	private writeWorkflow(
		workflow: WorkflowEntity,
		baseDir: string,
		writer: PackageWriter,
		allocators: Map<string, UniqueFilenameAllocator>,
	): ManifestEntry {
		const target = allocatorFor(allocators, baseDir, 'workflow').allocate(workflow.name);
		const serialized = this.workflowSerializer.serialize(workflow);
		writer.writeDirectory(target);
		writer.writeFile(`${target}/workflow.json`, JSON.stringify(serialized, null, '\t'));
		return { id: workflow.id, name: workflow.name, target };
	}
}

function parentDir(path: string): string {
	return path.split('/').slice(0, -1).join('/');
}

function allocatorFor(
	allocators: Map<string, UniqueFilenameAllocator>,
	baseDir: string,
	fallback: string,
): UniqueFilenameAllocator {
	const existing = allocators.get(baseDir);
	if (existing) return existing;

	const allocator = new UniqueFilenameAllocator(baseDir, fallback);
	allocators.set(baseDir, allocator);
	return allocator;
}
