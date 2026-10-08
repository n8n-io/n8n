import type { CustomFetch, HttpTransport } from '@n8n/backend-network';
import { limitResponseBody } from '@n8n/backend-network/transport';
import { UnexpectedError } from '@n8n/errors';

import { RemoteInstanceError } from './remote-instance.errors';

/** Builds an SSRF-enforced transport that ends each request that takes longer than `timeoutMs`. */
export type BuildTransport = (timeoutMs: number) => HttpTransport;

const MAX_RESPONSE_BYTES = 5 * 1024 * 1024;

/** The message of the `unreachable` error for a response body over the size cap. */
export const RESPONSE_OVER_LIMIT_MESSAGE = 'The linked instance sent a response over 5 MiB.';

/**
 * Reads the whole body within the size cap before the SDK sees it. The SDK reports a
 * failed event stream only to `onerror`, so a streamed failure would wait for the timeout.
 */
async function readWithinLimit(response: Response): Promise<Response> {
	if (!response.body) return response;
	const limited = limitResponseBody(response, {
		maxBytes: MAX_RESPONSE_BYTES,
		createError: () => new RemoteInstanceError('unreachable', RESPONSE_OVER_LIMIT_MESSAGE),
	});
	const body = await limited.arrayBuffer();
	return new Response(body.byteLength > 0 ? body : null, {
		status: response.status,
		statusText: response.statusText,
		headers: response.headers,
	});
}

function withResponseLimit(baseFetch: CustomFetch): CustomFetch {
	return async (input, init) => await readWithinLimit(await baseFetch(input, init));
}

/** Also stops each request when `signal` aborts. The SDK sets its own signal on every request. */
export function withSignal(baseFetch: CustomFetch, signal: AbortSignal): CustomFetch {
	return async (input, init) =>
		await baseFetch(input, {
			...init,
			signal: init?.signal ? AbortSignal.any([init.signal, signal]) : signal,
		});
}

async function destroyQuietly(transport: HttpTransport): Promise<void> {
	try {
		await transport.getDispatcher().destroy();
	} catch {
		// A dispatcher that cannot be destroyed has nothing left that the client needs.
	}
}

interface BuiltTransport {
	transport: HttpTransport;
	fetch: CustomFetch;
}

/** The outbound HTTP of one client: one transport for each time limit, built on first use. */
export class ClientTransports {
	private readonly built = new Map<number, BuiltTransport>();

	private disposed = false;

	constructor(private readonly build: BuildTransport) {}

	/**
	 * A fetch on the transport for `timeoutMs` that refuses a response body over 5 MiB.
	 * @throws {UnexpectedError} after `dispose()`
	 */
	fetchFor(timeoutMs: number): CustomFetch {
		if (this.disposed) {
			throw new UnexpectedError('The transports of a closed linked instance client are gone');
		}
		let entry = this.built.get(timeoutMs);
		if (!entry) {
			const transport = this.build(timeoutMs);
			entry = { transport, fetch: withResponseLimit(transport.asCustomFetch()) };
			this.built.set(timeoutMs, entry);
		}
		return entry.fetch;
	}

	/** Destroys each dispatcher, which also ends the requests that are still open. */
	async dispose(): Promise<void> {
		this.disposed = true;
		const transports = [...this.built.values()].map((entry) => entry.transport);
		this.built.clear();
		await Promise.all(transports.map(destroyQuietly));
	}
}
