/**
 * Body the engine API returns for every non-2xx response.
 *
 * Part of the engine's HTTP contract, so hosts can read a failure without
 * restating the shape. `error` is a stable machine-readable code
 * (`invalid_graph`, `admittance_rejected`, ...); `reason` and `details` carry
 * the human-readable specifics and are present per code.
 */
export interface EngineErrorResponse {
	error: string;
	reason?: string;
	details?: unknown;
}
