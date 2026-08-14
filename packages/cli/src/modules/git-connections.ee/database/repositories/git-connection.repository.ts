import { Service } from '@n8n/di';
import { DataSource, Repository } from '@n8n/typeorm';

import { GitConnection } from '../entities/git-connection.entity';

@Service()
export class GitConnectionRepository extends Repository<GitConnection> {
	constructor(dataSource: DataSource) {
		super(GitConnection, dataSource.manager);
	}

	async getManyAndCount(options: { skip: number; take: number }) {
		const [data, count] = await this.findAndCount({
			order: { id: 'ASC' },
			skip: options.skip,
			take: options.take,
		});
		return { count, data };
	}
}
