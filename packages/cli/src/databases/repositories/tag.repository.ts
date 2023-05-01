import { Service } from 'typedi';
import { DataSource, Repository } from 'typeorm';
import { TagEntity } from '../entities/TagEntity';

@Service()
export class TagRepository extends Repository<TagEntity> {
	constructor(dataSource: DataSource) {
		super(TagEntity, dataSource.manager);
	}
}
