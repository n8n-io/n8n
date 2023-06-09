import { Service } from 'typedi';
import { DataSource, Repository } from 'typeorm';
import { SaveRequestLog } from '../entities/SaveRequestLog';

@Service()
export class SaveRequestLogRepository extends Repository<SaveRequestLog> {
	constructor(dataSource: DataSource) {
		super(SaveRequestLog, dataSource.manager);
	}
}
