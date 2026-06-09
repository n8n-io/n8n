import { Service } from '@n8n/di';
import { DataSource, Repository } from '@n8n/typeorm';

import { DynamicCredentialResolver } from '../entities/credential-resolver.js';

@Service()
export class DynamicCredentialResolverRepository extends Repository<DynamicCredentialResolver> {
	constructor(dataSource: DataSource) {
		super(DynamicCredentialResolver, dataSource.manager);
	}
}
