import { getLicense } from '@/License';
import type { ILicenseReadResponse } from '@/Interfaces';
import * as Db from '@/Db';

export class LicenseService {
	static async getActiveTriggerCount(): Promise<number> {
		const totalTriggerCount = await Db.collections.Workflow.sum('triggerCount', { active: true });
		return totalTriggerCount ?? 0;
	}

	// Helper for getting the basic license data that we want to return
	static async getLicenseData(): Promise<ILicenseReadResponse> {
		const triggerCount = await LicenseService.getActiveTriggerCount();
		const license = getLicense();
		const mainPlan = license.getMainPlan();

		return {
			usage: {
				executions: {
					value: triggerCount,
					limit: license.getTriggerLimit(),
					warningThreshold: 0.8,
				},
			},
			license: {
				planId: mainPlan?.productId ?? '',
				planName: license.getPlanName(),
			},
		};
	}
}
