import { Service } from '@n8n/di';
import { DataSource, Repository } from '@n8n/typeorm';

import { RoleMappingRule } from '../entities';

@Service()
export class RoleMappingRuleRepository extends Repository<RoleMappingRule> {
	constructor(dataSource: DataSource) {
		super(RoleMappingRule, dataSource.manager);
	}
}
