import type { Folder, User } from '@n8n/db';
import { Service } from '@n8n/di';
import { UserError } from 'n8n-workflow';

import { FolderFinderService } from '@/services/folder-finder.service';

import { FolderSerializer } from './folder.serializer';
import type { PackageWriter } from '../../io/package-writer';
import { UniqueFilenameAllocator } from '../../io/unique-filename-allocator';
import type { ManifestEntry } from '../../spec/manifest.schema';

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
	entries: ManifestEntry[];
}

@Service()
export class FolderExporter {
	constructor(
		private readonly folderFinder: FolderFinderService,
		private readonly folderSerializer: FolderSerializer,
	) {}

	async export(request: FolderExportRequest): Promise<FolderExportResult> {
		const folders = await this.folderFinder.findFolderSubtreesForUser(
			request.folderIds,
			request.user,
			['folder:read'],
		);

		this.assertAllRequestedFoldersFound(request.folderIds, folders);

		const { roots, childrenByParent } = this.buildForest(folders);

		const foldersDir = request.basePrefix ? `${request.basePrefix}/folders` : 'folders';
		const entries = this.writeLevel(roots, foldersDir, null, childrenByParent, request.writer);

		return { entries };
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
	 * returning a manifest entry for each. A fresh allocator per call scopes slug
	 * collisions to the parent directory; sub-folders nest directly (no repeated
	 * `folders/` segment).
	 */
	private writeLevel(
		siblings: Folder[],
		parentDir: string,
		effectiveParentId: string | null,
		childrenByParent: Map<string, Folder[]>,
		writer: PackageWriter,
	): ManifestEntry[] {
		const allocator = new UniqueFilenameAllocator(parentDir, 'folder');
		const entries: ManifestEntry[] = [];

		for (const folder of this.orderedByCreation(siblings)) {
			const target = allocator.allocate(folder.name);
			const serialized = this.folderSerializer.serialize(folder, effectiveParentId);

			writer.writeDirectory(target);
			writer.writeFile(`${target}/folder.json`, JSON.stringify(serialized, null, '\t'));

			const children = childrenByParent.get(folder.id) ?? [];
			entries.push(
				{ id: folder.id, name: folder.name, target },
				...this.writeLevel(children, target, folder.id, childrenByParent, writer),
			);
		}

		return entries;
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
