import type { CreateFolderDto } from '@n8n/api-types';
import { Service } from '@n8n/di';

import { FolderRepository } from '@/databases/repositories/folder.repository';
import { FolderNotFoundError } from '@/errors/folder-not-found.error';

export interface SimpleFolderNode {
	id: string;
	name: string;
	children: SimpleFolderNode[];
}

interface FolderPathRow {
	folder_id: string;
	folder_name: string;
	folder_parent_folder_id: string | null;
}

@Service()
export class FolderService {
	constructor(private readonly folderRepository: FolderRepository) {}

	async createFolder({ parentFolderId, name }: CreateFolderDto, projectId: string) {
		let parentFolder = null;
		if (parentFolderId) {
			parentFolder = await this.getFolderInProject(parentFolderId, projectId);
		}

		const folderEntity = this.folderRepository.create({
			name,
			homeProject: { id: projectId },
			parentFolder,
		});

		const { homeProject, ...folder } = await this.folderRepository.save(folderEntity);

		return folder;
	}

	async getFolderInProject(folderId: string, projectId: string) {
		try {
			return await this.folderRepository.findOneOrFailFolderInProject(folderId, projectId);
		} catch {
			throw new FolderNotFoundError(folderId);
		}
	}

	async getFolderTree(folderId: string, projectId: string): Promise<SimpleFolderNode[]> {
		await this.getFolderInProject(folderId, projectId);

		const baseQuery = this.folderRepository
			.createQueryBuilder('folder')
			.select('folder.id', 'id')
			.addSelect('folder.parentFolderId', 'parentFolderId')
			.where('folder.id = :folderId', { folderId });

		const recursiveQuery = this.folderRepository
			.createQueryBuilder('f')
			.select('f.id', 'id')
			.addSelect('f.parentFolderId', 'parentFolderId')
			.innerJoin('folder_path', 'fp', 'f.id = fp.parentFolderId');

		const mainQuery = this.folderRepository
			.createQueryBuilder('folder')
			.select('folder.id', 'folder_id')
			.addSelect('folder.name', 'folder_name')
			.addSelect('folder.parentFolderId', 'folder_parent_folder_id')
			.addCommonTableExpression(
				`${baseQuery.getQuery()} UNION ALL ${recursiveQuery.getQuery()}`,
				'folder_path',
				{ recursive: true },
			)
			.where((qb) => {
				const subQuery = qb.subQuery().select('fp.id').from('folder_path', 'fp').getQuery();
				return `folder.id IN ${subQuery}`;
			})
			.setParameters({
				folderId,
			});

		const result = await mainQuery.getRawMany<FolderPathRow>();

		return this.transformFolderPathToTree(result);
	}

	private transformFolderPathToTree(flatPath: FolderPathRow[]): SimpleFolderNode[] {
		if (!flatPath || flatPath.length === 0) {
			return [];
		}

		const folderMap = new Map<string, SimpleFolderNode>();

		// First pass: create all nodes
		flatPath.forEach((folder) => {
			folderMap.set(folder.folder_id, {
				id: folder.folder_id,
				name: folder.folder_name,
				children: [],
			});
		});

		let rootNode: SimpleFolderNode | null = null;

		// Second pass: build the tree
		flatPath.forEach((folder) => {
			const currentNode = folderMap.get(folder.folder_id)!;

			if (folder.folder_parent_folder_id && folderMap.has(folder.folder_parent_folder_id)) {
				const parentNode = folderMap.get(folder.folder_parent_folder_id)!;
				parentNode.children = [currentNode];
			} else {
				rootNode = currentNode;
			}
		});

		return rootNode ? [rootNode] : [];
	}
}
