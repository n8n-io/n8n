import { InstalledPackages } from '@n8n/db';
import { Service } from '@n8n/di';
// eslint-disable-next-line n8n-local-rules/misplaced-n8n-typeorm-import
import { DataSource, Repository } from '@n8n/typeorm';

@Service()
export class PackagesRepository extends Repository<InstalledPackages> {
	constructor(dataSource: DataSource) {
		super(InstalledPackages, dataSource.manager);
	}
}
