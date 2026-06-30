import type { EgressCalibrationResponse, EgressPolicyStateResponse } from '@n8n/api-types';
import { UpdateEgressPolicyDto } from '@n8n/api-types';
import { SsrfProtectionService } from '@n8n/backend-network';
import { type AuthenticatedRequest } from '@n8n/db';
import { Body, Delete, Get, GlobalScope, Put, RestController } from '@n8n/decorators';
import type { Response } from 'express';

import { ForbiddenError } from '@/errors/response-errors/forbidden.error';

import { EgressCalibrationService } from './egress-calibration.service';
import { EgressPolicyService } from './egress-policy.service';

/**
 * Admin-only surface for the egress protection product:
 * - read/write the runtime policy (mode + blocked/allowed lists), and
 * - read the calibration view (the worklist of blocked / would-block destinations).
 *
 * Visibility is gated on `egressProtection:manage` (admin). *Editing* is
 * additionally gated on whether the policy is editable: when it is not (e.g. on
 * Cloud via `N8N_EGRESS_PROTECTION_EDITABLE=false`, or when the policy is managed
 * by env via `N8N_EGRESS_PROTECTION_MANAGED_BY_ENV`), GET still works (read-only
 * page) but writes are rejected.
 */
@RestController('/egress-protection')
export class EgressProtectionController {
	constructor(
		private readonly egressPolicyService: EgressPolicyService,
		private readonly egressCalibrationService: EgressCalibrationService,
		private readonly ssrfProtectionService: SsrfProtectionService,
	) {}

	@GlobalScope('egressProtection:manage')
	@Get('/policy')
	async getPolicy(): Promise<EgressPolicyStateResponse> {
		return await this.egressPolicyService.getState();
	}

	@GlobalScope('egressProtection:manage')
	@Put('/policy')
	async updatePolicy(
		req: AuthenticatedRequest,
		_res: Response,
		@Body dto: UpdateEgressPolicyDto,
	): Promise<EgressPolicyStateResponse> {
		if (!this.egressPolicyService.editable) {
			throw new ForbiddenError(
				'Egress protection policy is managed by the platform and cannot be edited on this instance',
			);
		}

		await this.egressPolicyService.updatePolicy(
			{
				mode: dto.mode,
				blockedIpRanges: dto.blockedIpRanges,
				allowedIpRanges: dto.allowedIpRanges,
				allowedHostnames: dto.allowedHostnames,
				blockedHostnames: dto.blockedHostnames,
			},
			req.user.id,
		);

		return await this.egressPolicyService.getState();
	}

	@GlobalScope('egressProtection:manage')
	@Get('/calibration')
	async getCalibration(): Promise<EgressCalibrationResponse> {
		const destinations = await this.egressCalibrationService.listDestinations();
		return {
			mode: this.ssrfProtectionService.mode,
			destinations: destinations.map((d) => ({
				hostname: d.hostname,
				resolvedIp: d.resolvedIp,
				feature: d.feature,
				count: d.count,
				decision: d.decision,
				lastSeen: d.lastSeen.toISOString(),
			})),
		};
	}

	@GlobalScope('egressProtection:manage')
	@Delete('/calibration')
	async clearCalibration(): Promise<{ success: true }> {
		if (!this.egressPolicyService.editable) {
			throw new ForbiddenError(
				'Egress protection policy is managed by the platform and cannot be edited on this instance',
			);
		}
		await this.egressCalibrationService.clear();
		return { success: true };
	}
}
