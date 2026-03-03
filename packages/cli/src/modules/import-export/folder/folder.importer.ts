import { Service } from '@n8n/di';

import { FolderService } from '@/services/folder.service';

import type { Importer } from '../importer';
import type { ProjectImportContext } from '../import-export.types';
import type { ManifestFolderEntry, SerializedFolder } from './folder.types';

@Service()
export class FolderImporter implements Importer<ManifestFolderEntry> {
	constructor(private readonly folderService: FolderService) {}

	async importForProject(ctx: ProjectImportContext, entries: ManifestFolderEntry[]) {
		if (entries.length === 0) return;

		const folders = entries.map((entry) => {
			const content = ctx.reader.readFile(`${entry.target}/folder.json`);
			return JSON.parse(content) as SerializedFolder;
		});

		// Topological sort: process root folders first, then children
		const sorted = this.topologicalSort(folders);

		for (const folder of sorted) {
			const remappedParentId = folder.parentFolderId
				? (ctx.folderIdMap.get(folder.parentFolderId) ?? null)
				: null;

			const created = await this.folderService.createFolder(
				{ name: folder.name, parentFolderId: remappedParentId ?? undefined },
				ctx.projectId,
			);

			ctx.folderIdMap.set(folder.id, created.id);
		}
	}

	/**
	 * Kahn's algorithm: yields root folders first, then children.
	 * Ensures parents are created before their children.
	 */
	private topologicalSort(folders: SerializedFolder[]): SerializedFolder[] {
		const folderMap = new Map(folders.map((f) => [f.id, f]));
		const folderIds = new Set(folders.map((f) => f.id));

		// Count in-degree (number of parents within this set)
		const inDegree = new Map<string, number>();
		const children = new Map<string, string[]>();

		for (const folder of folders) {
			inDegree.set(folder.id, 0);
			children.set(folder.id, []);
		}

		for (const folder of folders) {
			if (folder.parentFolderId && folderIds.has(folder.parentFolderId)) {
				inDegree.set(folder.id, (inDegree.get(folder.id) ?? 0) + 1);
				children.get(folder.parentFolderId)!.push(folder.id);
			}
		}

		// Start with root folders (in-degree 0)
		const queue = folders.filter((f) => inDegree.get(f.id) === 0).map((f) => f.id);
		const sorted: SerializedFolder[] = [];

		while (queue.length > 0) {
			const id = queue.shift()!;
			sorted.push(folderMap.get(id)!);

			for (const childId of children.get(id) ?? []) {
				const degree = (inDegree.get(childId) ?? 1) - 1;
				inDegree.set(childId, degree);
				if (degree === 0) {
					queue.push(childId);
				}
			}
		}

		return sorted;
	}
}
