import { Service } from '@n8n/di';
import { DataSource, Repository } from '@n8n/typeorm';

import { SourceControlConnection } from './source-control-connection.entity';

@Service()
export class SourceControlConnectionRepository extends Repository<SourceControlConnection> {
	constructor(dataSource: DataSource) {
		super(SourceControlConnection, dataSource.manager);
	}

	async findAllWithScopes() {
		return await this.find({ relations: { scopes: true }, order: { createdAt: 'ASC' } });
	}

	async findWithScopes(id: string) {
		return await this.findOne({ where: { id }, relations: { scopes: true } });
	}
}
