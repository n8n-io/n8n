import { Service } from 'typedi';
import { DataSource, Repository } from '@n8n/typeorm';
import { AnnotationTagEntity } from '@db/entities/AnnotationTagEntity';

@Service()
export class AnnotationTagRepository extends Repository<AnnotationTagEntity> {
	constructor(dataSource: DataSource) {
		super(AnnotationTagEntity, dataSource.manager);
	}
}
