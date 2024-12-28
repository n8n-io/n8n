import { DataSource, Repository } from '@n8n/typeorm';
import { Service } from 'typedi';

import { InvalidAuthToken } from '../entities/invalid-auth-token';

@Service()
export class InvalidAuthTokenRepository extends Repository<InvalidAuthToken> {
	constructor(dataSource: DataSource) {
		super(InvalidAuthToken, dataSource.manager);
	}
}
