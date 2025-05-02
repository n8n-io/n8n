import { FolderTagMapping } from '@n8n/db';
import { Service } from '@n8n/di';
import { DataSource, Repository } from '@n8n/typeorm';

@Service()
export class FolderTagMappingRepository extends Repository<FolderTagMapping> {
	constructor(dataSource: DataSource) {
		super(FolderTagMapping, dataSource.manager);
	}

	async overwriteTags(folderId: string, tagIds: string[]) {
		return await this.manager.transaction(async (tx) => {
			await tx.delete(FolderTagMapping, { folderId });

			const tags = tagIds.map((tagId) => this.create({ folderId, tagId }));

			return await tx.insert(FolderTagMapping, tags);
		});
	}
}
