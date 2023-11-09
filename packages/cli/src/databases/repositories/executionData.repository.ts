import { Service } from 'typedi';
import { DataSource, Repository } from 'typeorm';
import { ExecutionData } from '../entities/ExecutionData';

@Service()
export class ExecutionDataRepository extends Repository<ExecutionData> {
	constructor(dataSource: DataSource) {
		super(ExecutionData, dataSource.manager);
	}
}
