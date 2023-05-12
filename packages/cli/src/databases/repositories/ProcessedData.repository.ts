import { Service } from 'typedi';
import { DataSource, Repository } from 'typeorm';
import { ProcessedData } from '../entities/ProcessedData';

@Service()
export class ProcessedDataRepository extends Repository<ProcessedData> {
	constructor(dataSource: DataSource) {
		super(ProcessedData, dataSource.manager);
	}
}
