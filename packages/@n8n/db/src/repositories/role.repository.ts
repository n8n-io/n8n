import { Service } from '@n8n/di';
import { DataSource, Repository } from '@n8n/typeorm';

import { Role } from '../entities';

@Service()
export class RoleRepository extends Repository<Role> {
	constructor(dataSource: DataSource) {
		super(Role, dataSource.manager);
	}
}
