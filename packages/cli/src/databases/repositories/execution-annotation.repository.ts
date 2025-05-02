import { ExecutionAnnotation } from '@n8n/db';
import { Service } from '@n8n/di';
import { DataSource, Repository } from '@n8n/typeorm';

@Service()
export class ExecutionAnnotationRepository extends Repository<ExecutionAnnotation> {
	constructor(dataSource: DataSource) {
		super(ExecutionAnnotation, dataSource.manager);
	}
}
