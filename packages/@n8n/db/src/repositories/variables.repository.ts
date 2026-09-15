import { Service } from '@n8n/di';
import { DataSource, In, IsNull, Repository } from '@n8n/typeorm';

import { Variables } from '../entities';
import { chunkIds } from '../utils/chunk-ids';

export interface VariableKeyScope {
	key: string;
	/** `null` for a global variable. */
	projectId: string | null;
}

@Service()
export class VariablesRepository extends Repository<Variables> {
	constructor(dataSource: DataSource) {
		super(Variables, dataSource.manager);
	}

	async deleteByIds(ids: string[]): Promise<void> {
		await this.delete({ id: In(ids) });
	}

	/** The keys that exist inside these projects or globally, with their scope. Values are not loaded. */
	async findKeysInProjectsOrGlobal(
		keys: string[],
		projectIds: string[],
	): Promise<VariableKeyScope[]> {
		const found: VariableKeyScope[] = [];
		for (const keyBatch of chunkIds(keys)) {
			const globalRows = await this.find({
				where: { key: In(keyBatch), project: IsNull() },
				select: { key: true },
			});
			found.push(...globalRows.map((row) => ({ key: row.key, projectId: null })));

			for (const projectBatch of chunkIds(projectIds)) {
				const projectRows = await this.find({
					where: { key: In(keyBatch), project: { id: In(projectBatch) } },
					select: { key: true, project: { id: true } },
					relations: { project: true },
				});
				for (const row of projectRows) {
					if (row.project) found.push({ key: row.key, projectId: row.project.id });
				}
			}
		}
		return found;
	}
}
