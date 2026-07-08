import type { Folder, User } from '@n8n/db';
import { Service } from '@n8n/di';
import { UserError } from 'n8n-workflow';

import { FolderFinderService } from '@/services/folder-finder.service';
import { WorkflowFinderService } from '@/workflows/workflow-finder.service';

import { FolderSerializer } from './folder.serializer';
import type { PackageWriter } from '../../io/package-writer';
import { UniqueFilenameAllocator } from '../../io/unique-filename-allocator';
import type { ManifestEntry } from '../../spec/manifest.schema';
import { mergeRequirements } from '../requirements.types';
import type { WorkflowExportRequirements } from '../requirements.types';
import { WorkflowExporter } from '../workflow/workflow.exporter';
import type { WorkflowExportResult } from '../workflow/workflow.exporter';

export interface FolderExportRequest {
	user: User;
	folderIds: string[];
	writer: PackageWriter;
	/**
	 * Directory the folder tree is written under. Empty for a top-level folder
	 * export (`folders/...`); a project exporter passes `projects/<slug>` so the
	 * same walk nests under `projects/<slug>/folders/...`.
	 */
	basePrefix?: string;
}

export interface FolderExportResult {
	/** Folder shells → `manifest.folders[]`. */
	entries: ManifestEntry[];
	/** Workflows contained in the exported folders → `manifest.workflows[]`. */
	workflowEntries: ManifestEntry[];
	/** What the contained workflows need, gathered at the package top level (credentials today). */
	requirements: WorkflowExportRequirements;
}

interface FolderWriteContext {
	childrenByParent: Map<string, Folder[]>;
	workflowIdsByFolder: Map<string, string[]>;
	request: FolderExportRequest;
}

@Service()
export class FolderExporter {
	constructor(
		private readonly folderFinder: FolderFinderService,
		private readonly folderSerializer: FolderSerializer,
		private readonly workflowFinder: WorkflowFinderService,
		private readonly workflowExporter: WorkflowExporter,
	) {}

	async export(request: FolderExportRequest): Promise<FolderExportResult> {
		const folders = await this.folderFinder.findFolderSubtreesForUser(
			request.folderIds,
			request.user,
			['folder:read'],
		);

		this.assertAllRequestedFoldersFound(request.folderIds, folders);

		const { roots, childrenByParent } = this.buildForest(folders);

		const workflowIdsByFolder = await this.workflowFinder.findWorkflowIdsByFolder(
			folders.map((folder) => folder.id),
		);

		const foldersDir = request.basePrefix ? `${request.basePrefix}/folders` : 'folders';
		return await this.exportLevel(roots, foldersDir, null, {
			childrenByParent,
			workflowIdsByFolder,
			request,
		});
	}

	/**
	 * Groups the exported folders into a forest. A folder whose parent is also in
	 * the exported set nests under it; any other folder roots the forest and is
	 * re-rooted (its serialized `parentFolderId` becomes null), so every parent
	 * reference in the package resolves in-package.
	 */
	private buildForest(folders: Folder[]): {
		roots: Folder[];
		childrenByParent: Map<string, Folder[]>;
	} {
		const idsInSet = new Set(folders.map((folder) => folder.id));
		const roots: Folder[] = [];
		const childrenByParent = new Map<string, Folder[]>();

		for (const folder of folders) {
			const parentId = folder.parentFolderId;
			if (parentId && idsInSet.has(parentId)) {
				const siblings = childrenByParent.get(parentId) ?? [];
				siblings.push(folder);
				childrenByParent.set(parentId, siblings);
			} else {
				roots.push(folder);
			}
		}

		return { roots, childrenByParent };
	}

	private async exportLevel(
		siblings: Folder[],
		parentDir: string,
		effectiveParentId: string | null,
		context: FolderWriteContext,
		reservedName?: string,
	): Promise<FolderExportResult> {
		// File names need to be unique within a folder only.
		const allocator = new UniqueFilenameAllocator(parentDir, 'folder');
		if (reservedName) allocator.reserve(reservedName);

		const results: FolderExportResult[] = [];
		for (const folder of this.orderedByCreation(siblings)) {
			const target = allocator.allocate(folder.name);
			results.push(await this.exportFolder(folder, target, effectiveParentId, context));
		}

		return this.mergeFolderExportResults(results);
	}

	private async exportFolder(
		folder: Folder,
		target: string,
		effectiveParentId: string | null,
		context: FolderWriteContext,
	): Promise<FolderExportResult> {
		const { childrenByParent, workflowIdsByFolder, request } = context;

		this.exportFolderShell(folder, target, effectiveParentId, request.writer);

		const workflowIds = workflowIdsByFolder.get(folder.id) ?? [];
		const contained = await this.exportContainedWorkflows(workflowIds, target, request);

		const descendants = await this.exportLevel(
			childrenByParent.get(folder.id) ?? [],
			target,
			folder.id,
			context,
			// Reserve the workflows folder so a child folder can't collide with it.
			workflowIds.length > 0 ? 'workflows' : undefined,
		);

		const own: FolderExportResult = {
			entries: [{ id: folder.id, name: folder.name, target }],
			workflowEntries: contained.entries,
			requirements: contained.requirements,
		};

		return this.mergeFolderExportResults([own, descendants]);
	}

	private exportFolderShell(
		folder: Folder,
		target: string,
		effectiveParentId: string | null,
		writer: PackageWriter,
	): void {
		const serialized = this.folderSerializer.serialize(folder, effectiveParentId);
		writer.writeDirectory(target);
		writer.writeFile(`${target}/folder.json`, JSON.stringify(serialized, null, '\t'));
	}

	private async exportContainedWorkflows(
		workflowIds: string[],
		basePrefix: string,
		request: FolderExportRequest,
	): Promise<WorkflowExportResult> {
		if (workflowIds.length === 0) {
			return { entries: [], requirements: mergeRequirements() };
		}

		return await this.workflowExporter.export({
			user: request.user,
			writer: request.writer,
			workflowIds,
			basePrefix,
		});
	}

	private mergeFolderExportResults(results: FolderExportResult[]): FolderExportResult {
		return {
			entries: results.flatMap((result) => result.entries),
			workflowEntries: results.flatMap((result) => result.workflowEntries),
			requirements: mergeRequirements(...results.map((result) => result.requirements)),
		};
	}

	/**
	 * Sorts siblings oldest-first (tie-broken by id) so that when two folders in
	 * the same parent share a name, the oldest keeps the bare slug and the
	 * allocator suffixes the rest deterministically.
	 */
	private orderedByCreation(folders: Folder[]): Folder[] {
		return [...folders].sort((a, b) => {
			const byCreatedAt = a.createdAt.getTime() - b.createdAt.getTime();
			return byCreatedAt !== 0 ? byCreatedAt : a.id.localeCompare(b.id);
		});
	}

	private assertAllRequestedFoldersFound(
		requestedFolderIds: string[],
		foundFolders: Array<{ id: string }>,
	) {
		const foundFolderIds = new Set(foundFolders.map(({ id }) => id));
		const missingFolderIds = requestedFolderIds.filter((id) => !foundFolderIds.has(id));

		if (missingFolderIds.length > 0) {
			const displayedFolderIds = missingFolderIds.slice(0, 20);
			const omittedCount = missingFolderIds.length - displayedFolderIds.length;

			throw new UserError(
				`${missingFolderIds.length} folder(s) not found or not accessible. Export aborted.`,
				{
					description: `Missing folder IDs: ${displayedFolderIds.join(', ')}${
						omittedCount > 0 ? `, and ${omittedCount} more` : ''
					}`,
				},
			);
		}
	}
}
