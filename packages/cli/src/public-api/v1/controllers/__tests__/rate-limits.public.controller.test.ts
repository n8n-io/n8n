import type {
	PublicApiRateLimitSettingsResponse,
	RateLimitSettingsQueryPublicDto,
	UpdateRateLimitSettingsPublicDto,
} from '@n8n/api-types';
import type { AuthenticatedRequest, OperationContext } from '@n8n/db';
import type { SecurityContext } from '@n8n/permissions';
import type { Response } from 'express';
import { mock } from 'vitest-mock-extended';

import type { PublicApiRateLimitSettingsService } from '@/public-api/public-api-rate-limit-settings.service';

import { RateLimitsPublicController } from '../rate-limits.public.controller';

describe('RateLimitsPublicController', () => {
	const settingsService = mock<PublicApiRateLimitSettingsService>();
	const controller = new RateLimitsPublicController(settingsService);
	const stop = new Error('Stopping for test');

	beforeEach(() => {
		vi.clearAllMocks();
		settingsService.getSettings.mockResolvedValue(
			mock<PublicApiRateLimitSettingsResponse>({ envManagedFields: [] }),
		);
		settingsService.saveSettings.mockRejectedValue(stop);
	});

	describe('updateRateLimitSettings', () => {
		const updateRateLimitSettings = async (ctx?: OperationContext) => {
			const req = mock<AuthenticatedRequest>({ ctx });
			await controller
				.updateRateLimitSettings(
					req,
					mock<Response>(),
					{ enabled: false } as UpdateRateLimitSettingsPublicDto,
					{} as RateLimitSettingsQueryPublicDto,
				)
				.catch((e: unknown) => {
					if (e !== stop) throw e;
				});
			return req;
		};

		const ctxPassed = () => settingsService.saveSettings.mock.calls[0][2];

		it('passes the request operation context to the settings save', async () => {
			const req = await updateRateLimitSettings({ security: mock<SecurityContext>() });

			expect(req.ctx).toBeDefined();
			expect(ctxPassed()).toBe(req.ctx);
		});

		it('passes no operation context when the request has none', async () => {
			await updateRateLimitSettings(undefined);

			expect(ctxPassed()).toBeUndefined();
		});
	});
});
