import { Service } from '@n8n/di';
import { DataSource, Repository } from '@n8n/typeorm';

import { Promotion } from './promotion.entity';

@Service()
export class PromotionRepository extends Repository<Promotion> {
	constructor(dataSource: DataSource) {
		super(Promotion, dataSource.manager);
	}

	async findAllNewestFirst() {
		return await this.find({ order: { createdAt: 'DESC' } });
	}

	async findById(id: string) {
		return await this.findOneBy({ id });
	}
}
