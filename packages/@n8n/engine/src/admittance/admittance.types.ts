/**
 * Admittance gate — see design doc §7.1.
 *
 * Before the engine creates an execution record, it consults an
 * `AdmittanceService` to decide whether the execution should be admitted.
 * If rejected, the API returns a backpressure error rather than enqueuing.
 *
 * The reason is intentionally a free-form string for now. Future tickets
 * may introduce typed rejection codes (e.g. for retry/no-retry classification)
 * — design doc flags admittance as "roughly designed, needs tuning".
 */

export interface AdmittanceRequest {
	workflowId: string;
}

export type AdmittanceDecision = { accept: true } | { accept: false; reason: string };

export interface AdmittanceService {
	evaluate(request: AdmittanceRequest): Promise<AdmittanceDecision>;
}
