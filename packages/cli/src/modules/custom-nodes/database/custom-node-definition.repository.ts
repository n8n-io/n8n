import { Service } from '@n8n/di';
import { DataSource, Like, Repository } from '@n8n/typeorm';

import { CustomNodeDefinitionEntity } from './custom-node-definition.entity';
import type { CustomNodeDefinitionType } from './custom-node-definition.entity';

@Service()
export class CustomNodeDefinitionRepository extends Repository<CustomNodeDefinitionEntity> {
	constructor(dataSource: DataSource) {
		super(CustomNodeDefinitionEntity, dataSource.manager);
	}

	async findAllOrdered() {
		return await this.find({ order: { createdAt: 'ASC' } });
	}

	async findByType(type: CustomNodeDefinitionType) {
		return await this.find({ where: { type }, order: { createdAt: 'ASC' } });
	}

	async countAll() {
		return await this.count();
	}

	async findIdsWithPrefix(prefix: string) {
		const rows = await this.find({ select: { id: true }, where: { id: Like(`${prefix}%`) } });
		return rows.map((row) => row.id);
	}

	async deleteWithIdPrefix(prefix: string) {
		await this.delete({ id: Like(`${prefix}%`) });
	}
}
