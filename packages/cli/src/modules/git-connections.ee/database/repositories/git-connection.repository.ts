import { Service } from '@n8n/di';
import { DataSource, Repository } from '@n8n/typeorm';

import { GitConnection } from '../entities/git-connection.entity';

@Service()
export class GitConnectionRepository extends Repository<GitConnection> {
	constructor(dataSource: DataSource) {
		super(GitConnection, dataSource.manager);
	}

	async getManyAndCount(options: { skip: number; take: number }) {
		// TypeORM omits the LIMIT clause when `take` is falsy, so `take: 0` would
		// return every row instead of none — short-circuit to honor the limit.
		if (options.take <= 0) {
			return { count: await this.count(), data: [] };
		}

		const [data, count] = await this.findAndCount({
			order: { id: 'ASC' },
			skip: options.skip,
			take: options.take,
		});
		return { count, data };
	}
}
