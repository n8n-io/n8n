import type { EgressPolicyStateResponse, UpdateEgressPolicyDto } from '@n8n/api-types';
import type { SsrfProtectionService } from '@n8n/backend-network';
import type { AuthenticatedRequest, EgressBlockedDestination } from '@n8n/db';
import { mock } from 'jest-mock-extended';
import type { Response } from 'express';

import { ForbiddenError } from '@/errors/response-errors/forbidden.error';

import type { EgressCalibrationService } from '../egress-calibration.service';
import type { EgressPolicyService } from '../egress-policy.service';
import { EgressProtectionController } from '../egress-protection.controller';

describe('EgressProtectionController', () => {
	const egressPolicyService = mock<EgressPolicyService>();
	const egressCalibrationService = mock<EgressCalibrationService>();
	const ssrfProtectionService = mock<SsrfProtectionService>();
	const controller = new EgressProtectionController(
		egressPolicyService,
		egressCalibrationService,
		ssrfProtectionService,
	);

	const state: EgressPolicyStateResponse = {
		mode: 'log',
		editable: true,
		managedByEnv: false,
		defaultBlockedIpRanges: ['10.0.0.0/8'],
		blockedIpRanges: [],
		allowedIpRanges: [],
		allowedHostnames: [],
		blockedHostnames: [],
	};

	beforeEach(() => {
		jest.clearAllMocks();
		egressPolicyService.getState.mockResolvedValue(state);
	});

	describe('getPolicy', () => {
		it('returns the policy state', async () => {
			await expect(controller.getPolicy()).resolves.toEqual(state);
		});
	});

	describe('updatePolicy', () => {
		const dto: UpdateEgressPolicyDto = {
			mode: 'enforce',
			blockedIpRanges: ['172.16.0.0/12'],
			allowedIpRanges: [],
			allowedHostnames: [],
			blockedHostnames: ['*.tracker.example'],
		};
		const req = mock<AuthenticatedRequest>({ user: { id: 'user-1' } });
		const res = mock<Response>();

		it('rejects when the policy is not editable', async () => {
			Object.defineProperty(egressPolicyService, 'editable', { value: false, configurable: true });

			await expect(controller.updatePolicy(req, res, dto)).rejects.toThrow(ForbiddenError);
			expect(egressPolicyService.updatePolicy).not.toHaveBeenCalled();
		});

		it('persists the policy and returns the new state when editable', async () => {
			Object.defineProperty(egressPolicyService, 'editable', { value: true, configurable: true });

			const result = await controller.updatePolicy(req, res, dto);

			expect(egressPolicyService.updatePolicy).toHaveBeenCalledWith(
				{
					mode: 'enforce',
					blockedIpRanges: ['172.16.0.0/12'],
					allowedIpRanges: [],
					allowedHostnames: [],
					blockedHostnames: ['*.tracker.example'],
				},
				'user-1',
			);
			expect(result).toEqual(state);
		});
	});

	describe('getCalibration', () => {
		it('maps destinations and reports the effective mode', async () => {
			Object.defineProperty(ssrfProtectionService, 'mode', { value: 'log', configurable: true });
			egressCalibrationService.listDestinations.mockResolvedValue([
				mock<EgressBlockedDestination>({
					hostname: 'evil.example.com',
					resolvedIp: '10.0.0.1',
					feature: 'unknown',
					decision: 'would-block',
					count: 5,
					lastSeen: new Date('2026-06-24T00:00:00.000Z'),
				}),
			]);

			const result = await controller.getCalibration();

			expect(result.mode).toBe('log');
			expect(result.destinations).toEqual([
				{
					hostname: 'evil.example.com',
					resolvedIp: '10.0.0.1',
					feature: 'unknown',
					decision: 'would-block',
					count: 5,
					lastSeen: '2026-06-24T00:00:00.000Z',
				},
			]);
		});
	});

	describe('clearCalibration', () => {
		it('clears when editable', async () => {
			Object.defineProperty(egressPolicyService, 'editable', { value: true, configurable: true });

			await expect(controller.clearCalibration()).resolves.toEqual({ success: true });
			expect(egressCalibrationService.clear).toHaveBeenCalled();
		});

		it('rejects when not editable', async () => {
			Object.defineProperty(egressPolicyService, 'editable', { value: false, configurable: true });

			await expect(controller.clearCalibration()).rejects.toThrow(ForbiddenError);
			expect(egressCalibrationService.clear).not.toHaveBeenCalled();
		});
	});
});
