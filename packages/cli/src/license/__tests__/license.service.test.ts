import type { TEntitlement } from '@n8n_io/license-sdk';
import { mock } from 'jest-mock-extended';

import type { WorkflowRepository } from '@/databases/repositories/workflow.repository';
import { BadRequestError } from '@/errors/response-errors/bad-request.error';
import type { EventService } from '@/events/event.service';
import type { License } from '@/license';
import { LicenseErrors, LicenseService } from '@/license/license.service';

describe('LicenseService', () => {
	const license = mock<License>();
	const workflowRepository = mock<WorkflowRepository>();
	const entitlement = mock<TEntitlement>({ productId: '123' });
	const eventService = mock<EventService>();
	const licenseService = new LicenseService(
		mock(),
		license,
		workflowRepository,
		mock(),
		eventService,
	);

	license.getMainPlan.mockReturnValue(entitlement);
	license.getTriggerLimit.mockReturnValue(400);
	license.getPlanName.mockReturnValue('Test Plan');
	workflowRepository.getActiveTriggerCount.mockResolvedValue(7);

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
					executions: {
						limit: 400,
						value: 7,
						warningThreshold: 0.8,
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
});
