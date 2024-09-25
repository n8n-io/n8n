import { DataSource, Repository } from '@n8n/typeorm';
import { Service } from 'typedi';

import { AuthIdentity } from '../entities/auth-identity';

@Service()
export class AuthIdentityRepository extends Repository<AuthIdentity> {
	constructor(dataSource: DataSource) {
		super(AuthIdentity, dataSource.manager);
	}
}
