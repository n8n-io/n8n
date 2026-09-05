import type { Response } from 'express';
import assert from 'node:assert';

/**
 * Body the engine API returns for every non-2xx response.
 *
 * Part of the engine's HTTP contract, so hosts can read a failure without
 * restating the shape. `error` is a stable machine-readable code
 * (`invalid_graph`, `admittance_rejected`, `not_found`, ...); `reason` and
 * `details` carry the human-readable specifics and are present per code.
 */
export interface EngineErrorResponse {
	error: string;
	reason?: string;
	details?: unknown;
}

/** Sends an error response. Shared, so every route and middleware answers in one shape. */
export function fail(res: Response, status: number, body: EngineErrorResponse): void {
	assert(status >= 400, `fail() sends error responses only, but got status ${status}`);
	res.status(status).json(body);
}
