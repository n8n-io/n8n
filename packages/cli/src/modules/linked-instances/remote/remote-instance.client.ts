import { Logger } from '@n8n/backend-common';
import { OutboundHttp, type CustomFetch, type HttpTransport } from '@n8n/backend-network';
import { Service } from '@n8n/di';
import { UnexpectedError, UserError } from '@n8n/errors';
import { z } from 'zod';

import { withDeadline } from '@/modules/policy-infrastructure/policy-decision.service';
import { createAuthFetch } from '@/utils/auth-fetch';

import { INSTANCE_MCP_PATH } from '../instance-address';
import type { RemoteInstanceErrorReason } from './remote-instance.errors';
import { readToolResult, toRemoteError, type RemoteStep } from './remote-instance.outcome';
import {
	closeQuietly,
	listAllToolNames,
	openConnection,
	type SdkClient,
} from './remote-instance.sdk';
import { ClientTransports, withSignal, type BuildTransport } from './remote-instance.transports';

export type RemoteProbeFailureReason = 'unreachable' | 'mcp-disabled' | 'unauthorised';

export type RemoteProbeResult =
	| { ok: true; toolNames: string[] }
	| { ok: false; reason: RemoteProbeFailureReason };

export interface RemoteToolCallOptions {
	/** Sent as `_meta['n8n/idempotencyKey']`, so the remote can run a retried call only once. */
	idempotencyKey?: string;
	/** Defaults to 60 s, which is also the upper limit. */
	timeoutMs?: number;
}

/** After `close()`, every other method rejects with an `UnexpectedError`. */
export interface RemoteInstanceClient {
	/** Never throws for a remote failure: a failure is a result. */
	probe(): Promise<RemoteProbeResult>;
	/** @throws {RemoteInstanceError} */
	listToolNames(): Promise<string[]>;
	/**
	 * Returns `structuredContent`, else the text content parsed as JSON, else the text.
	 * @throws {RemoteInstanceError}
	 */
	callTool(
		name: string,
		args: Record<string, unknown>,
		options?: RemoteToolCallOptions,
	): Promise<unknown>;
	/** Closes the connection and the transports. A second call does nothing. */
	close(): Promise<void>;
}

export interface RemoteInstanceClientInput {
	/** Must come from `normaliseInstanceAddress`. */
	origin: string;
	token: string;
	/** Time for the whole probe, from 1 ms to 60 s. Defaults to 15 s. */
	probeDeadlineMs?: number;
}

export const IDEMPOTENCY_KEY_META = 'n8n/idempotencyKey';

// Each probe request has this limit, and the whole probe has the probe deadline.
const PROBE_TIMEOUT_MS = 10_000;
const PROBE_DEADLINE_MS = 15_000;
// The transport closes a response that stays silent for longer, so a longer call timeout has no effect.
const CALL_TIMEOUT_MS = 60_000;
// An auth-scheme starts the header or follows a comma.
const BEARER_CHALLENGE = /(?:^|,)\s*bearer(?:\s|,|$)/i;
// Visible ASCII only: a header value cannot hold other characters.
const TOKEN_PATTERN = /^[\x21-\x7E]{1,4096}$/;

const probeDeadlineSchema = z.number().int().min(1).max(CALL_TIMEOUT_MS).default(PROBE_DEADLINE_MS);

function isHttpOrigin(value: string): boolean {
	if (!URL.canParse(value)) return false;
	const url = new URL(value);
	return (url.protocol === 'https:' || url.protocol === 'http:') && url.origin === value;
}

function parseClientInput(input: RemoteInstanceClientInput) {
	const origin = z.string().refine(isHttpOrigin).safeParse(input.origin);
	if (!origin.success) {
		throw new UnexpectedError('A linked instance client needs a normalised origin');
	}
	if (!z.string().regex(TOKEN_PATTERN).safeParse(input.token).success) {
		throw new UserError('The access token has characters that are not allowed.');
	}
	const probeDeadlineMs = probeDeadlineSchema.safeParse(input.probeDeadlineMs);
	if (!probeDeadlineMs.success) {
		throw new UnexpectedError('A linked instance probe deadline must be from 1 ms to 60 s');
	}
	return { origin: origin.data, token: input.token, probeDeadlineMs: probeDeadlineMs.data };
}

function classifyHeadResponse(response: Response): RemoteProbeFailureReason | 'challenge' {
	if (response.status === 404) return 'mcp-disabled';
	const challenge = response.headers.get('www-authenticate') ?? '';
	if (response.status === 401 && BEARER_CHALLENGE.test(challenge)) return 'challenge';
	return 'unreachable';
}

function isProbeFailureReason(
	reason: RemoteInstanceErrorReason,
): reason is RemoteProbeFailureReason {
	return reason === 'unreachable' || reason === 'mcp-disabled' || reason === 'unauthorised';
}

interface ClientOptions {
	origin: string;
	logger: Logger;
	buildTransport: BuildTransport;
	probeDeadlineMs: number;
}

class McpRemoteInstanceClient implements RemoteInstanceClient {
	// An ES private field: no serialisation or inspection of the client can read it.
	readonly #token: string;

	private readonly mcpUrl: URL;

	private readonly transports: ClientTransports;

	private connection: Promise<SdkClient> | undefined;

	private callFetch: typeof fetch | undefined;

	private closed = false;

	constructor(
		token: string,
		private readonly options: ClientOptions,
	) {
		this.#token = token;
		this.mcpUrl = new URL(`${options.origin}${INSTANCE_MCP_PATH}`);
		this.transports = new ClientTransports(options.buildTransport);
	}

	async probe(): Promise<RemoteProbeResult> {
		this.assertOpen();
		let result: RemoteProbeResult;
		try {
			result = await withDeadline(
				async (signal) => await this.runProbe(signal),
				this.options.probeDeadlineMs,
			);
		} catch {
			// One reason for every failure, so the probe does not tell what is on the network.
			result = { ok: false, reason: 'unreachable' };
		}
		this.options.logger.debug('Probed a linked instance', {
			origin: this.options.origin,
			reason: result.ok ? 'ok' : result.reason,
		});
		return result;
	}

	async listToolNames(): Promise<string[]> {
		return await this.run(
			'list',
			async (client) => await listAllToolNames(client, { timeout: CALL_TIMEOUT_MS }),
		);
	}

	async callTool(
		name: string,
		args: Record<string, unknown>,
		options: RemoteToolCallOptions = {},
	): Promise<unknown> {
		const { idempotencyKey, timeoutMs = CALL_TIMEOUT_MS } = options;
		const timeout = Math.min(Math.max(timeoutMs, 1), CALL_TIMEOUT_MS);
		const meta =
			idempotencyKey === undefined ? {} : { _meta: { [IDEMPOTENCY_KEY_META]: idempotencyKey } };
		return await this.run('call', async (client) => {
			const result = await client.callTool({ name, arguments: args, ...meta }, undefined, {
				timeout,
			});
			return readToolResult(result, this.#token);
		});
	}

	async close(): Promise<void> {
		this.closed = true;
		const pending = this.connection;
		this.connection = undefined;
		this.callFetch = undefined;
		// First, so that a connection that still waits for the remote ends now.
		await this.transports.dispose();
		const client = await pending?.catch(() => undefined);
		if (client) await closeQuietly(client);
	}

	private assertOpen(): void {
		if (this.closed) throw new UnexpectedError('This linked instance client is closed');
	}

	/** All requests share `signal`, so the deadline covers the whole probe. */
	private async runProbe(signal: AbortSignal): Promise<RemoteProbeResult> {
		const probeFetch = withSignal(this.transports.fetchFor(PROBE_TIMEOUT_MS), signal);
		const head = await this.probeHead(probeFetch);
		if (head !== 'challenge') return { ok: false, reason: head };
		return await this.probeTools(probeFetch, signal);
	}

	/** Sends no token: only an n8n MCP endpoint answers 401 with a Bearer challenge. */
	private async probeHead(
		probeFetch: CustomFetch,
	): Promise<RemoteProbeFailureReason | 'challenge'> {
		const response = await probeFetch(this.mcpUrl, { method: 'HEAD', redirect: 'manual' });
		return classifyHeadResponse(response);
	}

	private async probeTools(
		probeFetch: CustomFetch,
		signal: AbortSignal,
	): Promise<RemoteProbeResult> {
		const requestOptions = { timeout: PROBE_TIMEOUT_MS, signal };
		try {
			const client = await openConnection(this.mcpUrl, this.authorised(probeFetch), requestOptions);
			try {
				return { ok: true, toolNames: await listAllToolNames(client, requestOptions) };
			} finally {
				await closeQuietly(client);
			}
		} catch (error) {
			const { reason } = toRemoteError(error, 'connect', this.#token);
			return { ok: false, reason: isProbeFailureReason(reason) ? reason : 'unreachable' };
		}
	}

	private async run<T>(
		step: Exclude<RemoteStep, 'connect'>,
		operation: (client: SdkClient) => Promise<T>,
	): Promise<T> {
		this.assertOpen();
		const client = await this.attempt('connect', async () => await this.connect());
		return await this.attempt(step, async () => await operation(client));
	}

	private async attempt<T>(step: RemoteStep, work: () => Promise<T>): Promise<T> {
		try {
			return await work();
		} catch (error) {
			const failure = toRemoteError(error, step, this.#token);
			this.options.logger.warn('A request to a linked instance failed', {
				origin: this.options.origin,
				step,
				reason: failure.reason,
			});
			throw failure;
		}
	}

	private async connect(): Promise<SdkClient> {
		this.callFetch ??= this.authorised(this.transports.fetchFor(CALL_TIMEOUT_MS));
		const pending = (this.connection ??= openConnection(this.mcpUrl, this.callFetch, {
			timeout: CALL_TIMEOUT_MS,
		}));
		try {
			return await pending;
		} catch (error) {
			// Let the next request open a fresh connection.
			if (this.connection === pending) this.connection = undefined;
			throw error;
		}
	}

	/**
	 * The token goes only to this host. A redirect within the origin keeps it. A redirect to
	 * another port or scheme of this host drops it, and a redirect to another host is refused.
	 */
	private authorised(baseFetch: CustomFetch): typeof fetch {
		return createAuthFetch({
			baseFetch,
			initialHeaders: { Authorization: `Bearer ${this.#token}` },
			allowedDomains: { mode: 'domains', domains: this.mcpUrl.hostname },
		});
	}
}

@Service()
export class RemoteInstanceClientFactory {
	private readonly logger: Logger;

	constructor(
		logger: Logger,
		private readonly outboundHttp: OutboundHttp,
	) {
		this.logger = logger.scoped('mcp');
	}

	create(input: RemoteInstanceClientInput): RemoteInstanceClient {
		const { origin, token, probeDeadlineMs } = parseClientInput(input);
		return new McpRemoteInstanceClient(token, {
			origin,
			logger: this.logger,
			buildTransport: (timeoutMs) => this.enforcedTransport(timeoutMs),
			probeDeadlineMs,
		});
	}

	/**
	 * Applies the SSRF policy even when the instance turns it off, because users type the address.
	 * Private targets need `N8N_SSRF_ALLOWED_IP_RANGES`. The transport pins the checked address.
	 */
	private enforcedTransport(timeoutMs: number): HttpTransport {
		return this.outboundHttp.transport({
			proxy: 'env',
			useDefaultSsrfPolicy: 'enforced',
			timeouts: { headersTimeout: timeoutMs, bodyTimeout: timeoutMs },
		});
	}
}
