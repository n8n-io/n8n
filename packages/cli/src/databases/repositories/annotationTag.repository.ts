import { Service } from 'typedi';
import { DataSource, Repository } from '@n8n/typeorm';
import { AnnotationTagEntity } from '@/databases/entities/annotation-tag-entity';

@Service()
export class AnnotationTagRepository extends Repository<AnnotationTagEntity> {
	constructor(dataSource: DataSource) {
		super(AnnotationTagEntity, dataSource.manager);
	}
}
