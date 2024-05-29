import { Service } from 'typedi';
import { DataSource, Repository } from '@n8n/typeorm';
import { AuthUser } from '../entities/AuthUser';

@Service()
export class AuthUserRepository extends Repository<AuthUser> {
	constructor(dataSource: DataSource) {
		super(AuthUser, dataSource.manager);
	}
}
