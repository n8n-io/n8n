import { Service } from '@n8n/di';
import { DataSource, Repository } from '@n8n/typeorm';

import { InstalledNodes } from './installed-nodes.entity';

@Service()
export class InstalledNodesRepository extends Repository<InstalledNodes> {
	constructor(dataSource: DataSource) {
		super(InstalledNodes, dataSource.manager);
	}
}
