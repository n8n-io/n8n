import { Service } from 'typedi';
import { DataSource, Repository } from 'typeorm';
import { InstalledNodes } from '../entities/InstalledNodes';

@Service()
export class InstalledNodesRepository extends Repository<InstalledNodes> {
	constructor(dataSource: DataSource) {
		super(InstalledNodes, dataSource.manager);
	}
}
