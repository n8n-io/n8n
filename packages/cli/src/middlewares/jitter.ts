import type { RequestHandler } from 'express';

export interface JitterOptions {
	/** Minimum delay in milliseconds. @default 100 */
	minMs?: number;
	/** Maximum delay in milliseconds. @default 300 */
	maxMs?: number;
}

/**
 * Creates middleware that adds random delay to responses to prevent timing attacks.
 * Useful for security-sensitive endpoints where response time could leak information.
 */
export const createJitterMiddleware = (options: JitterOptions = {}): RequestHandler => {
	const minMs = options.minMs ?? 100;
	const maxMs = options.maxMs ?? 300;

	return async (_req, _res, next) => {
		const delay = Math.floor(Math.random() * (maxMs - minMs + 1)) + minMs;

		await new Promise((resolve) => setTimeout(resolve, delay));

		next();
	};
};
