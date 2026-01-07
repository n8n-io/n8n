import { Service } from '@n8n/di';
import { DataSource, Repository } from '@n8n/typeorm';

import { RefreshToken } from '../entities/oauth-refresh-token.entity';

@Service()
export class RefreshTokenRepository extends Repository<RefreshToken> {
	constructor(dataSource: DataSource) {
		super(RefreshToken, dataSource.manager);
	}
}
