import type { UpdateSecurityPolicyDto } from '@n8n/api-types';
import type { InstanceSettingsLoaderConfig } from '@n8n/config';
import type { AuthenticatedRequest, OperationContext } from '@n8n/db';
import type { SecurityContext } from '@n8n/permissions';
import type { Response } from 'express';
import { mock } from 'vitest-mock-extended';

import type { SecuritySettingsService } from '@/services/security-settings.service';

import { SecurityPolicyPublicController } from '../security-policy.public.controller';

describe('SecurityPolicyPublicController', () => {
	const securitySettingsService = mock<SecuritySettingsService>();
	const instanceSettingsLoaderConfig = mock<InstanceSettingsLoaderConfig>({
		securityPolicyManagedByEnv: false,
	});
	const controller = new SecurityPolicyPublicController(
		securitySettingsService,
		instanceSettingsLoaderConfig,
	);
	const stop = new Error('Stopping for test');

	beforeEach(() => {
		vi.clearAllMocks();
		securitySettingsService.updateSecuritySettings.mockRejectedValue(stop);
	});

	describe('updateSecurityPolicy', () => {
		const updateSecurityPolicy = async (ctx?: OperationContext) => {
			const req = mock<AuthenticatedRequest>({ ctx });
			await controller
				.updateSecurityPolicy(req, mock<Response>(), {
					personalSpacePublishing: true,
					personalSpaceSharing: true,
				} as UpdateSecurityPolicyDto)
				.catch((e: unknown) => {
					if (e !== stop) throw e;
				});
			return req;
		};

		const ctxPassed = () => securitySettingsService.updateSecuritySettings.mock.calls[0][2];

		it('passes the request operation context to the settings update', async () => {
			const req = await updateSecurityPolicy({ security: mock<SecurityContext>() });

			expect(req.ctx).toBeDefined();
			expect(ctxPassed()).toBe(req.ctx);
		});

		it('passes no operation context when the request has none', async () => {
			await updateSecurityPolicy(undefined);

			expect(ctxPassed()).toBeUndefined();
		});
	});
});
