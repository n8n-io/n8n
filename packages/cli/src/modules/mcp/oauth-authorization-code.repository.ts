import { Service } from '@n8n/di';
import { DataSource, Repository } from '@n8n/typeorm';
import { AuthorizationCode } from '@n8n/db';

@Service()
export class AuthorizationCodeRepository extends Repository<AuthorizationCode> {
	constructor(dataSource: DataSource) {
		super(AuthorizationCode, dataSource.manager);
	}
}
