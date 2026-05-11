import { Service } from '@n8n/di';
import { DataSource, In, Repository } from '@n8n/typeorm';

import { Variables } from '../entities';

@Service()
export class VariablesRepository extends Repository<Variables> {
	constructor(dataSource: DataSource) {
		super(Variables, dataSource.manager);
	}

	async deleteByIds(ids: string[]): Promise<void> {
		await this.delete({ id: In(ids) });
	}
}
