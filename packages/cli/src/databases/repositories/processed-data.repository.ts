import { DataSource, Repository } from '@n8n/typeorm';
import { Service } from 'typedi';

import { ProcessedData } from '../entities/processed-data';

@Service()
export class ProcessedDataRepository extends Repository<ProcessedData> {
	constructor(dataSource: DataSource) {
		super(ProcessedData, dataSource.manager);
	}
}
