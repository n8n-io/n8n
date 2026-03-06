import { Service } from '@n8n/di';
import { Folder, FolderRepository } from '@n8n/db';
import { IsNull } from '@n8n/typeorm';
import { jsonParse } from 'n8n-workflow';

import type { EntityImporter } from '../entity-importer';
import type { EntityKey, ImportScope, ManifestEntry } from '../import-export.types';
import type { SerializedFolder } from './folder.types';

@Service()
export class FolderImporter implements EntityImporter {
	readonly entityKey: EntityKey = 'folders';

	constructor(private readonly folderRepository: FolderRepository) {}

	/**
	 * Import folders and populate `scope.state.folderIdMap` with
	 * source folder ID → created folder ID mappings.
	 */
	async import(scope: ImportScope, entries: ManifestEntry[]): Promise<void> {
		if (entries.length === 0) return;

		const repo = this.getRepository(scope);

		const folders: SerializedFolder[] = entries.map((entry) => {
			const content = scope.reader.readFile(`${entry.target}/folder.json`);
			return jsonParse(content);
		});

		// Sort folders so parents are created before their children
		const sorted = this.topologicalSort(folders);

		for (const folder of sorted) {
			const remappedParentId = folder.parentFolderId
				? (scope.state.folderIdMap.get(folder.parentFolderId) ?? null)
				: null;

			if (scope.assignNewIds) {
				// Deterministic ID: re-importing the same package into the same
				// project upserts; importing into a different project creates a copy.
				const targetId = `${scope.targetProjectId}-${folder.id}`;

				const entity = repo.create({
					id: targetId,
					name: folder.name,
					parentFolderId: remappedParentId,
					homeProject: { id: scope.targetProjectId },
				});

				await repo.save(entity);

				scope.state.folderIdMap.set(folder.id, targetId);
			} else {
				// Default behavior: match by name + parent to avoid duplicates
				const existing = await repo.findOne({
					where: {
						name: folder.name,
						parentFolderId: remappedParentId ?? IsNull(),
						homeProject: { id: scope.targetProjectId },
					},
				});

				if (existing) {
					scope.state.folderIdMap.set(folder.id, existing.id);
				} else {
					const created = repo.create({
						name: folder.name,
						parentFolderId: remappedParentId,
						homeProject: { id: scope.targetProjectId },
					});
					const saved = await repo.save(created);
					scope.state.folderIdMap.set(folder.id, saved.id);
				}
			}
		}
	}

	private getRepository(scope: ImportScope) {
		return scope.entityManager?.getRepository(Folder) ?? this.folderRepository;
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
		let head = 0;

		while (head < queue.length) {
			const id = queue[head++];
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
