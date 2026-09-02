import { Service } from '@n8n/di';
import { DataSource, Repository } from '@n8n/typeorm';

import { AuthorizationCode } from '../entities/oauth-authorization-code.entity';

@Service()
export class AuthorizationCodeRepository extends Repository<AuthorizationCode> {
	constructor(dataSource: DataSource) {
		super(AuthorizationCode, dataSource.manager);
	}
}
