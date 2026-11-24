import { AsyncLocalStorage } from 'node:async_hooks';

import { UnexpectedError } from '@n8n/errors';

/** The host and the credential of one captured request. */
export interface RequestContext {
	authorization?: string;
	origin: string;
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
