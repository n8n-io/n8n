import { Service } from '@n8n/di';
import { DataSource, Repository } from '@n8n/typeorm';

import { ExecutionAnnotation } from '@/databases/entities/execution-annotation.ee';

@Service()
export class ExecutionAnnotationRepository extends Repository<ExecutionAnnotation> {
	constructor(dataSource: DataSource) {
		super(ExecutionAnnotation, dataSource.manager);
	}
}
