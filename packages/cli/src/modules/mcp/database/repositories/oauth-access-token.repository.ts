import { Service } from '@n8n/di';
import { DataSource, Repository } from '@n8n/typeorm';

import { AccessToken } from '../entities/oauth-access-token.entity';

@Service()
export class AccessTokenRepository extends Repository<AccessToken> {
	constructor(dataSource: DataSource) {
		super(AccessToken, dataSource.manager);
	}
}
