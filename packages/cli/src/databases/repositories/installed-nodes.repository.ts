import { Service } from '@n8n/di';
import { DataSource, Repository } from '@n8n/typeorm';

import { InstalledNodes } from '../entities/installed-nodes';

@Service()
export class InstalledNodesRepository extends Repository<InstalledNodes> {
	constructor(dataSource: DataSource) {
		super(InstalledNodes, dataSource.manager);
	}
}
