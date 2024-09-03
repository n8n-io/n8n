import { Service } from 'typedi';
import { DataSource, Repository } from '@n8n/typeorm';
import { ExecutionMetadata } from '../entities/execution-metadata';

@Service()
export class ExecutionMetadataRepository extends Repository<ExecutionMetadata> {
	constructor(dataSource: DataSource) {
		super(ExecutionMetadata, dataSource.manager);
	}
}
