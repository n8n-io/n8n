import { Service } from '@n8n/di';
import { FolderRepository } from '@n8n/db';
import { In } from '@n8n/typeorm';

import type { ExportScope } from '../../import-export.types';
import { generateSlug } from '../../io/slug.utils';
import type { EntityKey, ManifestEntry } from '../../spec/manifest.types';

import { FolderSerializer } from './folder.serializer';

export interface FolderExportResult {
	entries: ManifestEntry[];
	/** Source folder ID → archive path. Consumed by WorkflowExporter for path resolution. */
	folderPathMap: Map<string, string>;
}

@Service()
export class FolderExporter {
	readonly entityKey: EntityKey = 'folders';

	constructor(
		private readonly folderRepository: FolderRepository,
		private readonly folderSerializer: FolderSerializer,
	) {}

	async export(scope: ExportScope): Promise<FolderExportResult> {
		const folders = await this.fetchFolders(scope);

		if (folders.length === 0) return { entries: [], folderPathMap: new Map() };

		const folderMap = new Map(folders.map((f) => [f.id, f]));
		const folderPathMap = this.buildPathMap(folders, folderMap, scope.basePath);

		const entries: ManifestEntry[] = [];

		for (const folder of folders) {
			const target = folderPathMap.get(folder.id)!;
			const serialized = this.folderSerializer.serialize(folder);

			scope.writer.writeDirectory(target);
			scope.writer.writeFile(`${target}/folder.json`, JSON.stringify(serialized, null, '\t'));

			entries.push({
				id: folder.id,
				name: folder.name,
				target,
			});
		}

		return { entries, folderPathMap };
	}

	private buildPathMap(
		folders: Array<{ id: string; name: string; parentFolderId: string | null }>,
		folderMap: Map<string, { id: string; name: string; parentFolderId: string | null }>,
		basePath: string,
	): Map<string, string> {
		const pathMap = new Map<string, string>();

		for (const folder of folders) {
			if (!pathMap.has(folder.id)) {
				this.resolvePath(folder.id, folderMap, basePath, pathMap);
			}
		}

		return pathMap;
	}

	private resolvePath(
		folderId: string,
		folderMap: Map<string, { id: string; name: string; parentFolderId: string | null }>,
		basePath: string,
		pathMap: Map<string, string>,
	): string {
		const cached = pathMap.get(folderId);
		if (cached) return cached;

		const folder = folderMap.get(folderId)!;
		const slug = generateSlug(folder.name, folder.id);

		let path: string;
		if (folder.parentFolderId === null || !folderMap.has(folder.parentFolderId)) {
			path = `${basePath}/folders/${slug}`;
		} else {
			const parentPath = this.resolvePath(folder.parentFolderId, folderMap, basePath, pathMap);
			path = `${parentPath}/${slug}`;
		}

		pathMap.set(folderId, path);
		return path;
	}

	private async fetchFolders(scope: ExportScope) {
		if (scope.folderIds && scope.folderIds?.length) {
			// Collect all descendant folder IDs for each selected folder
			const allFolderIds = new Set<string>(scope.folderIds);

			for (const folderId of scope.folderIds) {
				const descendantIds = await this.folderRepository.getAllFolderIdsInHierarchy(folderId);
				for (const id of descendantIds) {
					allFolderIds.add(id);
				}
			}

			return await this.folderRepository.find({
				where: { id: In([...allFolderIds]) },
			});
		}

		if (scope.projectId) {
			return await this.folderRepository.find({
				where: { homeProject: { id: scope.projectId } },
			});
		}

		return [];
	}
}
