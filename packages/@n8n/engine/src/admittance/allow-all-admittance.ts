import type { AdmittanceDecision, AdmittanceRequest, AdmittanceService } from './admittance.types';

/**
 * Default admittance policy: accept every request.
 *
 * Real cap-based admittance (per design doc §3.8 / §7.1 — global, per-workflow,
 * and queue-depth limits) is a follow-up ticket. This impl exists so the
 * StartExecution API can be wired up end-to-end without blocking on the cap
 * design.
 */
export class AllowAllAdmittance implements AdmittanceService {
	// eslint-disable-next-line @typescript-eslint/require-await -- satisfies async interface; impl has no async work
	async evaluate(_request: AdmittanceRequest): Promise<AdmittanceDecision> {
		return { accept: true };
	}
}
