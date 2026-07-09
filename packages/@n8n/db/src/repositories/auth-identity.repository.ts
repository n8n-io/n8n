import { Service } from '@n8n/di';
import { DataSource, Repository } from '@n8n/typeorm';

import { AuthIdentity } from '../entities';

@Service()
export class AuthIdentityRepository extends Repository<AuthIdentity> {
	constructor(dataSource: DataSource) {
		super(AuthIdentity, dataSource.manager);
	}
}
