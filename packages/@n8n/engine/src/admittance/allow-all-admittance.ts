import type { AdmittanceDecision, AdmittanceRequest, AdmittanceService } from './admittance.types';

/**
 * Default admittance policy: accept every request. Lets the StartExecution API
 * be wired up end-to-end without blocking on the cap design.
 *
 * TODO(CAT-2909): real cap-based admittance (global, per-workflow, and
 * queue-depth limits).
 */
export class AllowAllAdmittance implements AdmittanceService {
	// eslint-disable-next-line @typescript-eslint/require-await -- satisfies async interface; impl has no async work
	async evaluate(_request: AdmittanceRequest): Promise<AdmittanceDecision> {
		return { accept: true };
	}
}
