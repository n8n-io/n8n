import { Service } from '@n8n/di';
import { DataSource, Repository } from '@n8n/typeorm';

import { GlobalRole } from '../entities';

@Service()
export class GlobalRoleRepository extends Repository<GlobalRole> {
	constructor(dataSource: DataSource) {
		super(GlobalRole, dataSource.manager);
	}
}
