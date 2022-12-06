import { Db } from '..';

export class LicenseService {
	static async getActiveTriggerCount(): Promise<number> {
		const qb = Db.collections.Workflow.createQueryBuilder('workflow')
			.select('SUM(workflow.triggerCount)', 'triggerCount')
			.where('workflow.active = :active', { active: true });
		const results: { triggerCount: number } | undefined = await qb.getRawOne();
		if (!results) {
			throw new Error('Could not get active trigger count');
		}
		return results.triggerCount;
	}
}
