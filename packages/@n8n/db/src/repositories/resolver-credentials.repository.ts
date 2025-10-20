import { Service } from '@n8n/di';
import { DataSource, Repository } from '@n8n/typeorm';

import { ResolverCredentialsEntity } from '../entities';

@Service()
export class ResolverCredentialsRepository extends Repository<ResolverCredentialsEntity> {
	constructor(dataSource: DataSource) {
		super(ResolverCredentialsEntity, dataSource.manager);
	}
}
