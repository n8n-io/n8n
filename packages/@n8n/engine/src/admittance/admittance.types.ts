/**
 * Admittance gate. Before creating an execution record, the engine consults an
 * `AdmittanceService` to decide whether the execution is admitted; a rejection
 * is surfaced as a backpressure error rather than enqueuing work.
 *
 * `reason` is a free-form string for now. TODO(CAT-2909): real cap-based
 * admittance may replace it with typed rejection codes.
 */

export interface AdmittanceRequest {
	workflowId: string;
}

export type AdmittanceDecision = { accept: true } | { accept: false; reason: string };

export interface AdmittanceService {
	evaluate(request: AdmittanceRequest): Promise<AdmittanceDecision>;
}
