import { Service } from '@n8n/di';
import { DataSource, Repository } from '@n8n/typeorm';

import { InvalidAuthToken } from '../entities';

@Service()
export class InvalidAuthTokenRepository extends Repository<InvalidAuthToken> {
	constructor(dataSource: DataSource) {
		super(InvalidAuthToken, dataSource.manager);
	}
}
