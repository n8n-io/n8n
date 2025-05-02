import { ExecutionMetadata } from '@n8n/db';
import { Service } from '@n8n/di';
import { DataSource, Repository } from '@n8n/typeorm';

@Service()
export class ExecutionMetadataRepository extends Repository<ExecutionMetadata> {
	constructor(dataSource: DataSource) {
		super(ExecutionMetadata, dataSource.manager);
	}
}
