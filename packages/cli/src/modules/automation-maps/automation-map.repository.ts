import { Service } from '@n8n/di';
import { DataSource, LessThan, Repository } from '@n8n/typeorm';

import { AutomationMap } from './automation-map.entity';

@Service()
export class AutomationMapRepository extends Repository<AutomationMap> {
	constructor(dataSource: DataSource) {
		super(AutomationMap, dataSource.manager);
	}

	async findSaved() {
		return await this.find({ where: { saved: true }, order: { updatedAt: 'DESC' } });
	}

	async findAutoUpdating() {
		return await this.find({ where: { saved: true, autoUpdate: true, status: 'ready' } });
	}

	async deleteUnsavedOlderThan(cutoff: Date) {
		await this.delete({ saved: false, createdAt: LessThan(cutoff) });
	}
}
