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
		return await this.writeLevel(
			roots,
			foldersDir,
			null,
			childrenByParent,
			workflowIdsByFolder,
			request,
		);
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

	/**
	 * Writes a set of sibling folders and their descendants under `parentDir`,
	 * returning the folder shells plus the workflows contained in each folder. A
	 * fresh allocator per call scopes slug collisions to the parent directory;
	 * sub-folders nest directly (no repeated `folders/` segment). Contained
	 * workflows are delegated to `WorkflowExporter` with the folder's own target
	 * as `basePrefix`, so they land under `<folderTarget>/workflows/...`.
	 *
	 * `reservedName` is the `workflows` container dir already written under
	 * `parentDir` by the parent folder — reserving it makes a sibling folder that
	 * slugifies to `workflows` get suffixed instead of swallowing those workflows.
	 */
	private async writeLevel(
		siblings: Folder[],
		parentDir: string,
		effectiveParentId: string | null,
		childrenByParent: Map<string, Folder[]>,
		workflowIdsByFolder: Map<string, string[]>,
		request: FolderExportRequest,
		reservedName?: string,
	): Promise<FolderExportResult> {
		const allocator = new UniqueFilenameAllocator(parentDir, 'folder');
		if (reservedName) allocator.reserve(reservedName);
		const entries: ManifestEntry[] = [];
		const workflowEntries: ManifestEntry[] = [];
		const requirementParts: WorkflowExportRequirements[] = [];

		for (const folder of this.orderedByCreation(siblings)) {
			const target = allocator.allocate(folder.name);
			const serialized = this.folderSerializer.serialize(folder, effectiveParentId);

			request.writer.writeDirectory(target);
			request.writer.writeFile(`${target}/folder.json`, JSON.stringify(serialized, null, '\t'));

			entries.push({ id: folder.id, name: folder.name, target });

			const workflowIds = workflowIdsByFolder.get(folder.id);
			let hasContainedWorkflows = false;
			if (workflowIds && workflowIds.length > 0) {
				hasContainedWorkflows = true;
				const contained = await this.workflowExporter.export({
					user: request.user,
					writer: request.writer,
					workflowIds,
					basePrefix: target,
				});
				workflowEntries.push(...contained.entries);
				requirementParts.push(contained.requirements);
			}

			const children = childrenByParent.get(folder.id) ?? [];
			const descendants = await this.writeLevel(
				children,
				target,
				folder.id,
				childrenByParent,
				workflowIdsByFolder,
				request,
				// Reserve the workflows container so a child folder can't collide with it.
				hasContainedWorkflows ? 'workflows' : undefined,
			);
			entries.push(...descendants.entries);
			workflowEntries.push(...descendants.workflowEntries);
			requirementParts.push(descendants.requirements);
		}

		return { entries, workflowEntries, requirements: mergeRequirements(...requirementParts) };
	}

	/**
	 * Sorts siblings oldest-first (tie-broken by id) so that when two folders in
	 * the same parent share a name, the oldest keeps the bare slug and the
	 * allocator suffixes the rest deterministically.
	 */
	private orderedByCreation(folders: Folder[]): Folder[] {
		return [...folders].sort((a, b) => {
			const byCreatedAt = a.createdAt.getTime() - b.createdAt.getTime();
			if (byCreatedAt !== 0) return byCreatedAt;
			return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
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
