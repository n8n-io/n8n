import { Service } from '@n8n/di';
import { DataSource, Repository } from '@n8n/typeorm';

import { Scope } from '../entities';

@Service()
export class ScopeRepository extends Repository<Scope> {
	constructor(dataSource: DataSource) {
		super(Scope, dataSource.manager);
	}
}
