import { Service } from 'typedi';
import { DataSource, Repository } from '@n8n/typeorm';
import { TagEntity } from '../entities/TagEntity';

@Service()
export class TagRepository extends Repository<TagEntity> {
	constructor(dataSource: DataSource) {
		super(TagEntity, dataSource.manager);
	}
}
