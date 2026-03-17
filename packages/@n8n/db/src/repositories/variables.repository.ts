import { Service } from '@n8n/di';
import { Brackets, DataSource, In, Repository } from '@n8n/typeorm';

import { Variables } from '../entities';

@Service()
export class VariablesRepository extends Repository<Variables> {
	constructor(dataSource: DataSource) {
		super(Variables, dataSource.manager);
	}

	async deleteByIds(ids: string[]): Promise<void> {
		await this.delete({ id: In(ids) });
	}

	async findIdsByKeysForProject(keys: string[], projectId: string): Promise<string[]> {
		if (keys.length === 0) return [];

		const rows = await this.createQueryBuilder('variable')
			.select('variable.id', 'id')
			.where('variable.key IN (:...keys)', { keys })
			.andWhere(
				new Brackets((qb) => {
					qb.where('variable.projectId = :projectId', { projectId }).orWhere(
						'variable.projectId IS NULL',
					);
				}),
			)
			.getRawMany<{ id: string }>();

		return rows.map(({ id }) => id);
	}
}
