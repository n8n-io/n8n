import type { Logger } from '@n8n/backend-common';
import type { InstanceSettingsLoaderConfig } from '@n8n/config';
import { mock } from 'jest-mock-extended';

import type { EgressPolicyService } from '@/egress/egress-policy.service';

import { EgressProtectionInstanceSettingsLoader } from '../loaders/egress-protection.instance-settings-loader';

describe('EgressProtectionInstanceSettingsLoader', () => {
	const logger = mock<Logger>({ scoped: jest.fn().mockReturnThis() });
	const egressPolicyService = mock<EgressPolicyService>();

	const createLoader = (configOverrides: Partial<InstanceSettingsLoaderConfig> = {}) => {
		const config = {
			egressProtectionManagedByEnv: false,
			...configOverrides,
		} as InstanceSettingsLoaderConfig;

		return new EgressProtectionInstanceSettingsLoader(config, egressPolicyService, logger);
	};

	beforeEach(() => {
		jest.resetAllMocks();
		logger.scoped.mockReturnThis();
	});

	it('seeds without forcing when not managed by env', async () => {
		egressPolicyService.seedFromEnv.mockResolvedValue('created');
		const loader = createLoader();

		const result = await loader.run();

		expect(result).toBe('created');
		expect(egressPolicyService.seedFromEnv).toHaveBeenCalledWith({ force: false });
		expect(logger.info).not.toHaveBeenCalled();
	});

	it('skips when a policy row already exists and not managed by env', async () => {
		egressPolicyService.seedFromEnv.mockResolvedValue('skipped');
		const loader = createLoader();

		expect(await loader.run()).toBe('skipped');
		expect(egressPolicyService.seedFromEnv).toHaveBeenCalledWith({ force: false });
	});

	it('forces a re-seed and logs when managed by env', async () => {
		egressPolicyService.seedFromEnv.mockResolvedValue('created');
		const loader = createLoader({ egressProtectionManagedByEnv: true });

		const result = await loader.run();

		expect(result).toBe('created');
		expect(egressPolicyService.seedFromEnv).toHaveBeenCalledWith({ force: true });
		expect(logger.info).toHaveBeenCalledWith(
			expect.stringContaining('N8N_EGRESS_PROTECTION_MANAGED_BY_ENV is enabled'),
		);
	});
});
