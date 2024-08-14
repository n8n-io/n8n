import { Service } from 'typedi';
import { DataSource, Repository } from '@n8n/typeorm';
import { ExecutionAnnotation } from '@db/entities/ExecutionAnnotation';

@Service()
export class ExecutionAnnotationRepository extends Repository<ExecutionAnnotation> {
	constructor(dataSource: DataSource) {
		super(ExecutionAnnotation, dataSource.manager);
	}
}
