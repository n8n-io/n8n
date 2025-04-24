import { Service } from '@n8n/di';
import { DataSource, Repository } from '@n8n/typeorm';

import { Variables } from '../entities/variables';

@Service()
export class VariablesRepository extends Repository<Variables> {
	constructor(dataSource: DataSource) {
		super(Variables, dataSource.manager);
	}
}
