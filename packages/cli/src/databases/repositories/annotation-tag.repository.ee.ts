import { DataSource, Repository } from '@n8n/typeorm';
import { Service } from 'typedi';

import { AnnotationTagEntity } from '@/databases/entities/annotation-tag-entity.ee';

@Service()
export class AnnotationTagRepository extends Repository<AnnotationTagEntity> {
	constructor(dataSource: DataSource) {
		super(AnnotationTagEntity, dataSource.manager);
	}
}
