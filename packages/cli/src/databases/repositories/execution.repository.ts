import { Service } from 'typedi';
import { DataSource, Repository } from 'typeorm';
import { ExecutionEntity } from '../entities/ExecutionEntity';

@Service()
export class ExecutionRepository extends Repository<ExecutionEntity> {
	constructor(dataSource: DataSource) {
		super(ExecutionEntity, dataSource.manager);
	}
}
