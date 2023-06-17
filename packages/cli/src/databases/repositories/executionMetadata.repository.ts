import { Service } from 'typedi';
import { DataSource, Repository } from 'typeorm';
import { ExecutionMetadata } from '../entities/ExecutionMetadata';

@Service()
export class ExecutionMetadataRepository extends Repository<ExecutionMetadata> {
	constructor(dataSource: DataSource) {
		super(ExecutionMetadata, dataSource.manager);
	}
}
