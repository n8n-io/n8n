import type { Folder, Project, WorkflowEntity } from '@n8n/db';
import { Service } from '@n8n/di';

import { FolderSerializer } from '../folder/folder.serializer';
import { ProjectSerializer } from '../project/project.serializer';
import type { WorkflowExportRequirements } from '../requirements.types';
import { CredentialRequirementsExtractor } from '../credential/credential-requirements.extractor';
import type { WorkflowCredentialRequirement } from '../credential/credential.types';
import { DataTableRequirementsExtractor } from '../data-table/data-table-requirements.extractor';
import type { WorkflowDataTableRequirement } from '../data-table/data-table.types';
import type { PackageWriter } from '../../io/package-writer';
import { UniqueFilenameAllocator } from '../../io/unique-filename-allocator';
import type { ManifestEntry } from '../../spec/manifest.schema';
import { WorkflowSerializer } from './workflow.serializer';
import type { StaticWorkflowDependency } from './static-workflow-dependency-resolver';

export interface StaticWorkflowDependencyExportRequest {
	writer: PackageWriter;
	dependencies: StaticWorkflowDependency[];
	existingWorkflowEntries: ManifestEntry[];
	existingFolderEntries: ManifestEntry[];
	existingProjectEntries: ManifestEntry[];
	projectTargetsById?: Map<string, string>;
}

export interface StaticWorkflowDependencyExportResult {
	workflowEntries: ManifestEntry[];
	folderEntries: ManifestEntry[];
	projectEntries: ManifestEntry[];
	requirements: WorkflowExportRequirements;
	projectTargetsById: Map<string, string>;
}

@Service()
export class StaticWorkflowDependencyExporter {
	private workflowAllocators = new Map<string, UniqueFilenameAllocator>();

	private folderAllocators = new Map<string, UniqueFilenameAllocator>();

	private projectAllocator?: UniqueFilenameAllocator;

	constructor(
		private readonly workflowSerializer: WorkflowSerializer,
		private readonly folderSerializer: FolderSerializer,
		private readonly projectSerializer: ProjectSerializer,
		private readonly credentialRequirementsExtractor: CredentialRequirementsExtractor,
		private readonly dataTableRequirementsExtractor: DataTableRequirementsExtractor,
	) {}

	export(request: StaticWorkflowDependencyExportRequest): StaticWorkflowDependencyExportResult {
		this.resetAllocators();

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
			this.workflowAllocator(parentDir(entry.target)).reservePath(entry.target);
		}
		for (const entry of request.existingFolderEntries) {
			this.folderAllocator(parentDir(entry.target)).reservePath(entry.target);
		}
		for (const entry of request.existingProjectEntries) {
			this.projectPathAllocator().reservePath(entry.target);
			projectTargetsById.set(entry.id, entry.target);
		}

		const workflowEntries: ManifestEntry[] = [];
		const folderEntries: ManifestEntry[] = [];
		const projectEntries: ManifestEntry[] = [];
		const credentials: WorkflowCredentialRequirement[] = [];
		const dataTables: WorkflowDataTableRequirement[] = [];

		for (const dependency of request.dependencies) {
			if (workflowEntriesById.has(dependency.workflow.id)) continue;

			const baseDir = this.resolveWorkflowBaseDir({
				dependency,
				writer: request.writer,
				folderEntriesById,
				projectEntriesById,
				projectTargetsById,
				folderEntries,
				projectEntries,
			});
			const entry = this.writeWorkflow(dependency.workflow, baseDir, request.writer);
			workflowEntries.push(entry);
			workflowEntriesById.set(entry.id, entry);
			credentials.push(...this.credentialRequirementsExtractor.extract(dependency.workflow));
			dataTables.push(...this.dataTableRequirementsExtractor.extract(dependency.workflow));
		}

		return {
			workflowEntries,
			folderEntries,
			projectEntries,
			requirements: { credentials, dataTables },
			projectTargetsById,
		};
	}

	private resolveWorkflowBaseDir(options: {
		dependency: StaticWorkflowDependency;
		writer: PackageWriter;
		folderEntriesById: Map<string, ManifestEntry>;
		projectEntriesById: Map<string, ManifestEntry>;
		projectTargetsById: Map<string, string>;
		folderEntries: ManifestEntry[];
		projectEntries: ManifestEntry[];
	}): string {
		const { dependency } = options;
		if (dependency.placement === 'project') {
			const projectTarget = this.ensureProjectShell({
				project: dependency.ownerProject,
				writer: options.writer,
				projectEntriesById: options.projectEntriesById,
				projectTargetsById: options.projectTargetsById,
				projectEntries: options.projectEntries,
			});

			if (dependency.folderChain.length === 0) {
				return `${projectTarget}/workflows`;
			}

			const folderTarget = this.ensureFolderChain({
				chain: dependency.folderChain,
				baseDir: `${projectTarget}/folders`,
				writer: options.writer,
				folderEntriesById: options.folderEntriesById,
				folderEntries: options.folderEntries,
			});
			return `${folderTarget}/workflows`;
		}

		if (dependency.placement === 'folder' && dependency.folderChain.length > 0) {
			const folderTarget = this.ensureFolderChain({
				chain: dependency.folderChain,
				baseDir: 'folders',
				writer: options.writer,
				folderEntriesById: options.folderEntriesById,
				folderEntries: options.folderEntries,
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
	}): string {
		const existing = options.projectEntriesById.get(options.project.id);
		if (existing) return existing.target;

		const target = this.projectPathAllocator().allocate(options.project.name);
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

			const allocator = this.folderAllocator(parentTarget ?? options.baseDir);
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
			throw new Error('Cannot place workflow in an empty folder chain');
		}

		return parentTarget;
	}

	private writeWorkflow(
		workflow: WorkflowEntity,
		baseDir: string,
		writer: PackageWriter,
	): ManifestEntry {
		const target = this.workflowAllocator(baseDir).allocate(workflow.name);
		const serialized = this.workflowSerializer.serialize(workflow);
		writer.writeDirectory(target);
		writer.writeFile(`${target}/workflow.json`, JSON.stringify(serialized, null, '\t'));
		return { id: workflow.id, name: workflow.name, target };
	}

	private workflowAllocator(baseDir: string): UniqueFilenameAllocator {
		return this.allocator(this.workflowAllocators, baseDir, 'workflow');
	}

	private folderAllocator(baseDir: string): UniqueFilenameAllocator {
		return this.allocator(this.folderAllocators, baseDir, 'folder');
	}

	private projectPathAllocator(): UniqueFilenameAllocator {
		this.projectAllocator ??= new UniqueFilenameAllocator('projects', 'project');
		return this.projectAllocator;
	}

	private allocator(
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

	private resetAllocators() {
		this.workflowAllocators = new Map();
		this.folderAllocators = new Map();
		this.projectAllocator = undefined;
	}
}

function parentDir(path: string): string {
	return path.split('/').slice(0, -1).join('/');
}
