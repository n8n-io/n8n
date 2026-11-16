import type { User } from '@n8n/db';
import { BadRequestError } from '@n8n/errors';
import { mock } from 'vitest-mock-extended';

import type { UserService } from '@/services/user.service';

import type {
	InstanceAiAdapterService,
	InstanceAiFeatureFlags,
} from '../../instance-ai.adapter.service';
import { InstanceAiApprovalModeService } from '../approval-mode.service';

function userWith(approvalMode?: 'manual' | 'auto'): User {
	return {
		id: 'user-1',
		settings: { instanceAi: { credentialId: 'cred-1', ...(approvalMode ? { approvalMode } : {}) } },
	} as User;
}

describe('InstanceAiApprovalModeService', () => {
	const adapterService = mock<InstanceAiAdapterService>();
	const userService = mock<UserService>();
	const service = new InstanceAiApprovalModeService(adapterService, userService);

	function flagOn(approvalModesEnabled: boolean) {
		adapterService.resolveExperimentGates.mockResolvedValue(
			mock<InstanceAiFeatureFlags>({ approvalModesEnabled }),
		);
	}

	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe('resolveMode', () => {
		it('is Manual for everyone while approval modes are off', () => {
			expect(service.resolveMode(userWith('auto'), false)).toBe('manual');
			expect(service.resolveMode(userWith(), false)).toBe('manual');
		});

		it('defaults to Auto for a user without a saved choice', () => {
			expect(service.resolveMode(userWith(), true)).toBe('auto');
		});

		it("keeps the user's saved choice", () => {
			expect(service.resolveMode(userWith('manual'), true)).toBe('manual');
		});
	});

	describe('getPreferences', () => {
		it('reports the mode and whether the user can choose one', async () => {
			flagOn(true);

			await expect(service.getPreferences(userWith('manual'))).resolves.toEqual({
				approvalMode: 'manual',
				approvalModesAvailable: true,
			});
		});

		it('reports Manual and no choice while approval modes are off', async () => {
			flagOn(false);

			await expect(service.getPreferences(userWith('auto'))).resolves.toEqual({
				approvalMode: 'manual',
				approvalModesAvailable: false,
			});
		});
	});

	describe('saveMode', () => {
		it('saves the mode next to the other Assistant settings of the user', async () => {
			flagOn(true);

			await expect(service.saveMode(userWith(), 'manual')).resolves.toEqual({
				approvalMode: 'manual',
				approvalModesAvailable: true,
			});
			expect(userService.updateSettings).toHaveBeenCalledWith('user-1', {
				instanceAi: { credentialId: 'cred-1', approvalMode: 'manual' },
			});
		});

		it('refuses to save while approval modes are off', async () => {
			flagOn(false);

			await expect(service.saveMode(userWith(), 'auto')).rejects.toThrow(BadRequestError);
			expect(userService.updateSettings).not.toHaveBeenCalled();
		});
	});
});
