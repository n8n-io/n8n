import type { LicenseState } from '@n8n/backend-common';
import type { WorkflowRepository } from '@n8n/db';
import type { TEntitlement } from '@n8n_io/license-sdk';
import axios, { AxiosError } from 'axios';
import { mock } from 'jest-mock-extended';

import { BadRequestError } from '@/errors/response-errors/bad-request.error';
import type { EventService } from '@/events/event.service';
import type { License } from '@/license';
import { LicenseErrors, LicenseService } from '@/license/license.service';

jest.mock('axios');

describe('LicenseService', () => {
	const license = mock<License>();
	const licenseState = mock<LicenseState>();
	const workflowRepository = mock<WorkflowRepository>();
	const entitlement = mock<TEntitlement>({ productId: '123' });
	const eventService = mock<EventService>();
	const licenseService = new LicenseService(
		mock(),
		license,
		licenseState,
		workflowRepository,
		mock(),
		eventService,
	);

	license.getMainPlan.mockReturnValue(entitlement);
	license.getTriggerLimit.mockReturnValue(400);
	license.getPlanName.mockReturnValue('Test Plan');
	licenseState.getMaxWorkflowsWithEvaluations.mockReturnValue(2);
	workflowRepository.getActiveTriggerCount.mockResolvedValue(7);
	workflowRepository.getWorkflowsWithEvaluationCount.mockResolvedValue(1);

	beforeEach(() => jest.clearAllMocks());

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
		Object.entries(LicenseErrors).forEach(([errorId, message]) =>
			it(`should handle ${errorId} error`, async () => {
				license.activate.mockRejectedValueOnce(new LicenseError(errorId));
				await expect(licenseService.activateLicense('')).rejects.toThrowError(
					new BadRequestError(message),
				);
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
			await expect(licenseService.renewLicense()).rejects.toThrowError(
				new BadRequestError('Activation key has expired'),
			);

			expect(eventService.emit).toHaveBeenCalledWith('license-renewal-attempted', {
				success: false,
			});
		});
	});

	describe('registerCommunityEdition', () => {
		test('on success', async () => {
			jest
				.spyOn(axios, 'post')
				.mockResolvedValueOnce({ data: { title: 'Title', text: 'Text', licenseKey: 'abc-123' } });
			const data = await licenseService.registerCommunityEdition({
				userId: '123',
				email: 'test@ema.il',
				instanceId: '123',
				instanceUrl: 'http://localhost',
				licenseType: 'community-registered',
			});

			expect(data).toEqual({ title: 'Title', text: 'Text' });
			expect(eventService.emit).toHaveBeenCalledWith('license-community-plus-registered', {
				userId: '123',
				email: 'test@ema.il',
				licenseKey: 'abc-123',
			});
		});

		test('on failure', async () => {
			jest.spyOn(axios, 'post').mockRejectedValueOnce(new AxiosError('Failed'));
			await expect(
				licenseService.registerCommunityEdition({
					userId: '123',
					email: 'test@ema.il',
					instanceId: '123',
					instanceUrl: 'http://localhost',
					licenseType: 'community-registered',
				}),
			).rejects.toThrowError('Failed');
			expect(eventService.emit).not.toHaveBeenCalled();
		});
	});
});
