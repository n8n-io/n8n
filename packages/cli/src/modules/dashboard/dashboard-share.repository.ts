import { Service } from '@n8n/di';
import { DataSource, Repository } from '@n8n/typeorm';

import { DashboardShare } from './dashboard-share.entity';

@Service()
export class DashboardShareRepository extends Repository<DashboardShare> {
	constructor(dataSource: DataSource) {
		super(DashboardShare, dataSource.manager);
	}

	async findByDashboardId(dashboardId: string): Promise<DashboardShare[]> {
		return await this.find({
			where: { dashboardId },
			relations: ['user'],
		});
	}

	async findByUserId(userId: string): Promise<DashboardShare[]> {
		return await this.find({ where: { userId } });
	}

	async deleteByDashboardId(dashboardId: string): Promise<number> {
		const result = await this.delete({ dashboardId });
		return result.affected ?? 0;
	}
}
