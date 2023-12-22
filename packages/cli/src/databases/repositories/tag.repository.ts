import { Service } from 'typedi';
import { DataSource, In, Repository } from 'typeorm';
import { TagEntity } from '../entities/TagEntity';

@Service()
export class TagRepository extends Repository<TagEntity> {
	constructor(dataSource: DataSource) {
		super(TagEntity, dataSource.manager);
	}

	async findMany(tagIds: string[]) {
		return this.find({
			select: ['id', 'name'],
			where: { id: In(tagIds) },
		});
	}
}
