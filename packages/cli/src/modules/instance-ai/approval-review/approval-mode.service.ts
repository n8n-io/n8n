import type { InstanceAiApprovalMode, InstanceAiApprovalPreferences } from '@n8n/api-types';
import type { User } from '@n8n/db';
import { Service } from '@n8n/di';
import { BadRequestError } from '@n8n/errors';

import { UserService } from '@/services/user.service';

import { InstanceAiAdapterService } from '../instance-ai.adapter.service';

/**
 * The user's approval mode. Auto needs the rollout flag. Without it, every run
 * is Manual. With it, a user without a saved choice gets Auto.
 */
@Service()
export class InstanceAiApprovalModeService {
	constructor(
		private readonly adapterService: InstanceAiAdapterService,
		private readonly userService: UserService,
	) {}

	/** Whether the user can choose Auto. The judge falls back to the main model, so only the rollout flag decides. */
	isAvailable(approvalModesEnabled: boolean): boolean {
		return approvalModesEnabled;
	}

	resolveMode(user: User, approvalModesEnabled: boolean): InstanceAiApprovalMode {
		if (!this.isAvailable(approvalModesEnabled)) return 'manual';
		return user.settings?.instanceAi?.approvalMode ?? 'auto';
	}

	async getPreferences(user: User): Promise<InstanceAiApprovalPreferences> {
		const { approvalModesEnabled } = await this.adapterService.resolveExperimentGates(user);
		return {
			approvalMode: this.resolveMode(user, approvalModesEnabled),
			approvalModesAvailable: this.isAvailable(approvalModesEnabled),
		};
	}

	async saveMode(
		user: User,
		approvalMode: InstanceAiApprovalMode,
	): Promise<InstanceAiApprovalPreferences> {
		const { approvalModesEnabled } = await this.adapterService.resolveExperimentGates(user);
		if (!this.isAvailable(approvalModesEnabled)) {
			throw new BadRequestError('Approval modes are not available for this user');
		}
		await this.userService.updateSettings(user.id, {
			instanceAi: { ...user.settings?.instanceAi, approvalMode },
		});
		return { approvalMode, approvalModesAvailable: true };
	}
}
