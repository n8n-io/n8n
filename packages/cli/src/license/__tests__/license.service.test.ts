import type { LicenseState } from '@n8n/backend-common';
import { markHttpRequestError } from '@n8n/backend-network';
import type { HttpRequestClient, OutboundHttp } from '@n8n/backend-network';
import type { WorkflowRepository } from '@n8n/db';
import type { TEntitlement } from '@n8n_io/license-sdk';
import { AxiosError } from 'axios';
import { mock } from 'vitest-mock-extended';

import { BadRequestError } from '@/errors/response-errors/bad-request.error';
import type { EventService } from '@/events/event.service';
import type { License } from '@/license';
import { LicenseErrors, LicenseService } from '@/license/license.service';

describe('LicenseService', () => {
	const license = mock<License>();
	const licenseState = mock<LicenseState>();
	const workflowRepository = mock<WorkflowRepository>();
	const entitlement = mock<TEntitlement>({ productId: '123' });
	const eventService = mock<EventService>();
	const request = vi.fn();
	const requests = vi.fn().mockReturnValue(mock<HttpRequestClient>({ request }));
	const outboundHttp = mock<OutboundHttp>({ requests });
	const licenseService = new LicenseService(
		mock(),
		license,
		licenseState,
		workflowRepository,
		mock(),
		eventService,
		outboundHttp,
	);

	license.getMainPlan.mockReturnValue(entitlement);
	license.getTriggerLimit.mockReturnValue(400);
	license.getPlanName.mockReturnValue('Test Plan');
	licenseState.getMaxWorkflowsWithEvaluations.mockReturnValue(2);
	workflowRepository.getActiveTriggerCount.mockResolvedValue(7);
	workflowRepository.getWorkflowsWithEvaluationCount.mockResolvedValue(1);

	beforeEach(() => vi.clearAllMocks());

	class LicenseError extends Error {
		constructor(readonly errorId: string) {
			super(`License error: ${errorId}`);
		}
	}

	describe('getLicenseData', () => {
		it('should return usage and license data', async () => {
			const data = await licenseService.getLicenseData();
			expect(data).toEqual({
				usage: {
					activeWorkflowTriggers: {
						limit: 400,
						value: 7,
						warningThreshold: 0.8,
					},
					workflowsHavingEvaluations: {
						limit: 2,
						value: 1,
					},
				},
				license: {
					planId: '123',
					planName: 'Test Plan',
				},
			});
		});
	});

	describe('activateLicense', () => {
		it('should activate license without eulaUri (initial activation)', async () => {
			license.activate.mockResolvedValueOnce();
			await licenseService.activateLicense('activation-key');
			expect(license.activate).toHaveBeenCalledWith('activation-key');
		});

		it('should activate license with eulaUri and userEmail (EULA acceptance)', async () => {
			license.activate.mockResolvedValueOnce();
			await licenseService.activateLicense(
				'activation-key',
				'https://n8n.io/legal/eula/',
				'user@example.com',
			);
			expect(license.activate).toHaveBeenCalledWith(
				'activation-key',
				'https://n8n.io/legal/eula/',
				'user@example.com',
			);
		});

		it('should throw LicenseEulaRequiredError when EULA_REQUIRED error occurs', async () => {
			const eulaError = new LicenseError('EULA_REQUIRED');
			(eulaError as any).info = { eula: { uri: 'https://n8n.io/legal/eula/' } };
			license.activate.mockRejectedValueOnce(eulaError);

			await expect(licenseService.activateLicense('activation-key')).rejects.toThrow(
				'License activation requires EULA acceptance',
			);
		});

		Object.entries(LicenseErrors).forEach(([errorId, message]) =>
			it(`should handle ${errorId} error`, async () => {
				license.activate.mockRejectedValueOnce(new LicenseError(errorId));
				const execution = licenseService.activateLicense('');

				await expect(execution).rejects.toThrow(BadRequestError);
				await expect(execution).rejects.toThrow(message);
			}),
		);
	});

	describe('renewLicense', () => {
		test('should skip renewal for unlicensed user (Community plan)', async () => {
			license.getPlanName.mockReturnValueOnce('Community');

			await licenseService.renewLicense();

			expect(license.renew).not.toHaveBeenCalled();
			expect(eventService.emit).not.toHaveBeenCalled();
		});

		test('on success', async () => {
			license.renew.mockResolvedValueOnce();
			await licenseService.renewLicense();

			expect(eventService.emit).toHaveBeenCalledWith('license-renewal-attempted', {
				success: true,
			});
		});

		test('on failure', async () => {
			license.renew.mockRejectedValueOnce(new LicenseError('RESERVATION_EXPIRED'));

			const execution = licenseService.renewLicense();
			await expect(execution).rejects.toThrow(BadRequestError);
			await expect(execution).rejects.toThrow('Activation key has expired');

			expect(eventService.emit).toHaveBeenCalledWith('license-renewal-attempted', {
				success: false,
			});
		});
	});

	describe('registerCommunityEdition', () => {
		test('on success', async () => {
			request.mockResolvedValueOnce({ title: 'Title', text: 'Text', licenseKey: 'abc-123' });
			const data = await licenseService.registerCommunityEdition({
				userId: '123',
				email: 'test@ema.il',
				instanceId: '123',
				instanceUrl: 'http://localhost',
				licenseType: 'community-registered',
			});

			expect(data).toEqual({ title: 'Title', text: 'Text' });
			expect(request).toHaveBeenCalledWith({
				url: 'https://enterprise.n8n.io/community-registered',
				method: 'POST',
				body: {
					email: 'test@ema.il',
					instanceId: '123',
					instanceUrl: 'http://localhost',
					licenseType: 'community-registered',
				},
				json: true,
			});
			expect(eventService.emit).toHaveBeenCalledWith('license-community-plus-registered', {
				userId: '123',
				email: 'test@ema.il',
				licenseKey: 'abc-123',
			});
		});

		test('on failure surfaces the upstream error message', async () => {
			// The real client tags the errors it rejects; mirror that so the guard fires.
			const requestError = markHttpRequestError(new AxiosError('Failed'));
			requestError.response = mock<AxiosError['response']>({
				data: { message: 'Email already registered' },
			});
			request.mockRejectedValueOnce(requestError);
			await expect(
				licenseService.registerCommunityEdition({
					userId: '123',
					email: 'test@ema.il',
					instanceId: '123',
					instanceUrl: 'http://localhost',
					licenseType: 'community-registered',
				}),
			).rejects.toThrowError('Failed to register community edition: Email already registered');
			expect(eventService.emit).not.toHaveBeenCalled();
		});

		test('on non-HTTP failure throws a generic error', async () => {
			request.mockRejectedValueOnce(new Error('boom'));
			await expect(
				licenseService.registerCommunityEdition({
					userId: '123',
					email: 'test@ema.il',
					instanceId: '123',
					instanceUrl: 'http://localhost',
					licenseType: 'community-registered',
				}),
			).rejects.toThrowError('Failed to register community edition');
			expect(eventService.emit).not.toHaveBeenCalled();
		});
	});
});
