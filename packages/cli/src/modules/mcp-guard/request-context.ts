import { AsyncLocalStorage } from 'node:async_hooks';

import { UnexpectedError } from '@n8n/errors';

/** The host and the credential of one captured request. */
export interface RequestContext {
	authorization?: string;
	origin: string;
	// The secret that the profile took out of the path of this request.
	pathSecret?: string;
	// Aborts when the guarded call takes too long. A model call of the hydration stops with it.
	signal?: AbortSignal;
}

const storage = new AsyncLocalStorage<RequestContext>();

/**
 * Runs `fn` with the context of one request. A hydration of this request reads it, also after an
 * await. Two requests of one chat at the same time keep their own credential and host.
 */
export const runWithRequestContext = async <T>(
	context: RequestContext,
	fn: () => Promise<T>,
): Promise<T> => await storage.run(context, fn);

export function currentRequestContext(): RequestContext {
	const context = storage.getStore();
	if (!context) throw new UnexpectedError('mcp-guard: no request context');
	return context;
}

type FetchLike = (input: string | URL | Request, init?: RequestInit) => Promise<Response>;

/** Wraps a fetch so that its requests also stop when the signal of the current request aborts. */
export const withRequestSignal =
	(base: FetchLike = fetch): FetchLike =>
	async (input, init) => {
		const { signal } = currentRequestContext();
		const own = init?.signal;
		const combined = signal && own ? AbortSignal.any([signal, own]) : (signal ?? own);
		return await base(input, { ...init, signal: combined });
	};
