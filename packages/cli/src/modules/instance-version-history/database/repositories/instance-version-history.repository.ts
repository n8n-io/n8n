import { Service } from '@n8n/di';
import { DataSource, Repository } from '@n8n/typeorm';

import { InstanceVersionHistory } from '../entities/instance-version-history.entity';

@Service()
export class InstanceVersionHistoryRepository extends Repository<InstanceVersionHistory> {
	constructor(dataSource: DataSource) {
		super(InstanceVersionHistory, dataSource.manager);
	}
}
