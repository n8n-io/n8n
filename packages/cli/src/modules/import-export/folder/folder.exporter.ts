import { Service } from '@n8n/di';
import { FolderRepository } from '@n8n/db';

import type { ProjectExportContext } from '../import-export.types';
import { generateSlug } from '../slug.utils';

import { FolderSerializer } from './folder.serializer';
import type { ManifestFolderEntry } from './folder.types';

@Service()
export class FolderExporter {
	constructor(
		private readonly folderRepository: FolderRepository,
		private readonly folderSerializer: FolderSerializer,
	) {}

	async exportForProject(ctx: ProjectExportContext): Promise<ManifestFolderEntry[]> {
		const folders = await this.folderRepository.find({
			where: { homeProject: { id: ctx.projectId } },
		});

		if (folders.length === 0) return [];

		const folderMap = new Map(folders.map((f) => [f.id, f]));
		const pathMap = this.buildPathMap(folders, folderMap, ctx.projectTarget);

		const entries: ManifestFolderEntry[] = [];

		for (const folder of folders) {
			const target = pathMap.get(folder.id)!;
			const serialized = this.folderSerializer.serialize(folder);

			ctx.writer.writeDirectory(target);
			ctx.writer.writeFile(`${target}/folder.json`, JSON.stringify(serialized, null, '\t'));

			ctx.folderPathMap.set(folder.id, target);

			entries.push({
				id: folder.id,
				name: folder.name,
				target,
			});
		}

		return entries;
	}

	private buildPathMap(
		folders: Array<{ id: string; name: string; parentFolderId: string | null }>,
		folderMap: Map<string, { id: string; name: string; parentFolderId: string | null }>,
		projectTarget: string,
	): Map<string, string> {
		const pathMap = new Map<string, string>();

		for (const folder of folders) {
			if (!pathMap.has(folder.id)) {
				this.resolvePath(folder.id, folderMap, projectTarget, pathMap);
			}
		}

		return pathMap;
	}

	private resolvePath(
		folderId: string,
		folderMap: Map<string, { id: string; name: string; parentFolderId: string | null }>,
		projectTarget: string,
		pathMap: Map<string, string>,
	): string {
		const cached = pathMap.get(folderId);
		if (cached) return cached;

		const folder = folderMap.get(folderId)!;
		const slug = generateSlug(folder.name, folder.id);

		let path: string;
		if (folder.parentFolderId === null || !folderMap.has(folder.parentFolderId)) {
			path = `${projectTarget}/folders/${slug}`;
		} else {
			const parentPath = this.resolvePath(folder.parentFolderId, folderMap, projectTarget, pathMap);
			path = `${parentPath}/${slug}`;
		}

		pathMap.set(folderId, path);
		return path;
	}
}
