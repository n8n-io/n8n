import { AuthUser } from '@n8n/db';
import { Service } from '@n8n/di';
import { DataSource, Repository } from '@n8n/typeorm';

@Service()
export class AuthUserRepository extends Repository<AuthUser> {
	constructor(dataSource: DataSource) {
		super(AuthUser, dataSource.manager);
	}
}
