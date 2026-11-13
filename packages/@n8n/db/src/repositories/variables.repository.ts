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

	/** The variables of the given projects. */
	async findByProjectIds(
		projectIds: string[],
	): Promise<Array<{ id: string; key: string; projectId: string }>> {
		if (projectIds.length === 0) return [];
		const rows = await this.find({
			relations: { project: true },
			where: { project: { id: In(projectIds) } },
		});
		return rows.flatMap(({ id, key, project }) =>
			project ? [{ id, key, projectId: project.id }] : [],
		);
	}
}
