import type * as SdkClientModule from '@modelcontextprotocol/sdk/client/index.js';
import type * as SdkTransportModule from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import type * as SdkTypesModule from '@modelcontextprotocol/sdk/types.js';
import { Logger } from '@n8n/backend-common';
import { OutboundHttp, type CustomFetch } from '@n8n/backend-network';
import { limitResponseBody } from '@n8n/backend-network/transport';
import { Service } from '@n8n/di';
import { UnexpectedError, UserError } from '@n8n/errors';
import { lazyImport } from '@n8n/utils/lazy-import';
import { truncate } from '@n8n/utils/string/truncate';
import { jsonParse } from 'n8n-workflow';
import { z } from 'zod';

import { createAuthFetch } from '@/utils/auth-fetch';

import { INSTANCE_MCP_PATH } from '../instance-address';
import { RemoteInstanceError, type RemoteInstanceErrorReason } from './remote-instance.errors';

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

export interface RemoteInstanceClient {
	/** Never throws. */
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
	close(): Promise<void>;
}

export const IDEMPOTENCY_KEY_META = 'n8n/idempotencyKey';

const PROBE_TIMEOUT_MS = 10_000;
// The transport closes a response that stays silent for longer, so a longer call timeout has no effect.
const CALL_TIMEOUT_MS = 60_000;
const MAX_RESPONSE_BYTES = 5 * 1024 * 1024;
const MAX_TOOL_ERROR_LENGTH = 500;
const MAX_TOOL_LIST_PAGES = 20;
const CLIENT_INFO = { name: 'n8n-linked-instance', version: '1.0.0' };
// An auth-scheme starts the header or follows a comma.
const BEARER_CHALLENGE = /(?:^|,)\s*bearer(?:\s|,|$)/i;
// Visible ASCII only: a header value cannot hold other characters.
const TOKEN_PATTERN = /^[\x21-\x7E]{1,4096}$/;

const textBlockSchema = z.object({ type: z.literal('text'), text: z.string() });

const toolResultSchema = z.object({
	content: z.array(z.unknown()).optional(),
	structuredContent: z.record(z.unknown()).optional(),
	isError: z.boolean().optional(),
});

interface McpSdk {
	Client: typeof SdkClientModule.Client;
	StreamableHTTPClientTransport: typeof SdkTransportModule.StreamableHTTPClientTransport;
	StreamableHTTPError: typeof SdkTransportModule.StreamableHTTPError;
	McpError: typeof SdkTypesModule.McpError;
	requestTimeoutCode: number;
}

type SdkClient = InstanceType<McpSdk['Client']>;

let sdkPromise: Promise<McpSdk> | undefined;
// Set once the SDK loads, so error classification can stay synchronous.
let loadedSdk: McpSdk | undefined;

// The SDK is large and only linked instances need it, so it loads on first use.
async function loadSdk(): Promise<McpSdk> {
	sdkPromise ??= Promise.all([
		lazyImport<typeof SdkClientModule>(
			async () => await import('@modelcontextprotocol/sdk/client/index.js'),
		),
		lazyImport<typeof SdkTransportModule>(
			async () => await import('@modelcontextprotocol/sdk/client/streamableHttp.js'),
		),
		lazyImport<typeof SdkTypesModule>(
			async () => await import('@modelcontextprotocol/sdk/types.js'),
		),
	]).then(([clientModule, transportModule, typesModule]) => ({
		Client: clientModule.Client,
		StreamableHTTPClientTransport: transportModule.StreamableHTTPClientTransport,
		StreamableHTTPError: transportModule.StreamableHTTPError,
		McpError: typesModule.McpError,
		requestTimeoutCode: Number(typesModule.ErrorCode.RequestTimeout),
	}));
	loadedSdk = await sdkPromise;
	return loadedSdk;
}

function isHttpOrigin(value: string): boolean {
	if (!URL.canParse(value)) return false;
	const url = new URL(value);
	return (url.protocol === 'https:' || url.protocol === 'http:') && url.origin === value;
}

function parseClientInput(input: { origin: string; token: string }) {
	const origin = z.string().refine(isHttpOrigin).safeParse(input.origin);
	if (!origin.success) {
		throw new UnexpectedError('A linked instance client needs a normalised origin');
	}
	if (!z.string().regex(TOKEN_PATTERN).safeParse(input.token).success) {
		throw new UserError('The access token has characters that are not allowed.');
	}
	return { origin: origin.data, token: input.token };
}

/**
 * Reads the whole body within the size cap before the SDK sees it. The SDK reports a
 * failed event stream only to `onerror`, so a streamed failure would wait for the timeout.
 */
async function readWithinLimit(response: Response): Promise<Response> {
	if (!response.body) return response;
	const limited = limitResponseBody(response, {
		maxBytes: MAX_RESPONSE_BYTES,
		createError: () =>
			new RemoteInstanceError('unreachable', 'The linked instance sent a response over 5 MiB.'),
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

function fromHttpStatus(status: number | undefined): RemoteInstanceError {
	if (status === 401 || status === 403) return new RemoteInstanceError('unauthorised');
	if (status === 404) return new RemoteInstanceError('mcp-disabled');
	return new RemoteInstanceError('unreachable');
}

function remoteText(text: string, token: string): string | undefined {
	if (text.trim() === '') return undefined;
	return truncate(text.split(token).join('[REDACTED]'), MAX_TOOL_ERROR_LENGTH);
}

/** Never sets `cause`: SDK errors can hold raw response text. */
function toRemoteError(
	error: unknown,
	fallback: 'unreachable' | 'tool-error',
	token: string,
): RemoteInstanceError {
	if (error instanceof RemoteInstanceError) return error;
	const sdk = loadedSdk;
	if (sdk && error instanceof sdk.StreamableHTTPError) return fromHttpStatus(error.code);
	if (!sdk || !(error instanceof sdk.McpError)) return new RemoteInstanceError('unreachable');
	if (error.code === sdk.requestTimeoutCode) return new RemoteInstanceError('timeout');
	if (fallback === 'unreachable') return new RemoteInstanceError('unreachable');
	return new RemoteInstanceError('tool-error', remoteText(error.message, token));
}

function readToolResult(raw: unknown, token: string): unknown {
	const parsed = toolResultSchema.safeParse(raw);
	if (!parsed.success) {
		throw new RemoteInstanceError(
			'tool-error',
			'The linked instance sent a tool result in an unknown format.',
		);
	}
	const { content = [], structuredContent, isError } = parsed.data;
	const text = content
		.flatMap((block) => {
			const textBlock = textBlockSchema.safeParse(block);
			return textBlock.success ? [textBlock.data.text] : [];
		})
		.join('\n');
	if (isError === true) throw new RemoteInstanceError('tool-error', remoteText(text, token));
	if (structuredContent !== undefined) return structuredContent;
	return jsonParse<unknown>(text, { fallbackValue: text });
}

async function closeQuietly(client: SdkClient): Promise<void> {
	await client.close().catch(() => {});
}

async function openConnection(url: URL, fetchFn: typeof fetch, timeoutMs: number) {
	const sdk = await loadSdk();
	const client = new sdk.Client(CLIENT_INFO, { capabilities: {} });
	try {
		await client.connect(new sdk.StreamableHTTPClientTransport(url, { fetch: fetchFn }), {
			timeout: timeoutMs,
		});
		return client;
	} catch (error) {
		await closeQuietly(client);
		throw error;
	}
}

async function listAllToolNames(client: SdkClient, timeoutMs: number): Promise<string[]> {
	const names: string[] = [];
	let cursor: string | undefined;
	for (let page = 0; page < MAX_TOOL_LIST_PAGES; page++) {
		const result = await client.listTools(cursor ? { cursor } : undefined, { timeout: timeoutMs });
		names.push(...result.tools.map((tool) => tool.name));
		cursor = result.nextCursor;
		if (!cursor) break;
	}
	return names;
}

interface ClientDeps {
	origin: string;
	token: string;
	logger: Logger;
	/** Builds a fetch on the SSRF-enforced transport with the given time limit. */
	transportFetch: (timeoutMs: number) => CustomFetch;
}

class McpRemoteInstanceClient implements RemoteInstanceClient {
	private readonly mcpUrl: URL;

	private connection: Promise<SdkClient> | undefined;

	private callFetch: typeof fetch | undefined;

	constructor(private readonly deps: ClientDeps) {
		this.mcpUrl = new URL(`${deps.origin}${INSTANCE_MCP_PATH}`);
	}

	async probe(): Promise<RemoteProbeResult> {
		let result: RemoteProbeResult;
		try {
			const transportFetch = this.deps.transportFetch(PROBE_TIMEOUT_MS);
			const head = await this.probeHead(transportFetch);
			result =
				head === 'challenge' ? await this.probeTools(transportFetch) : { ok: false, reason: head };
		} catch {
			// One reason for every failure, so the probe does not tell what is on the network.
			result = { ok: false, reason: 'unreachable' };
		}
		this.deps.logger.debug('Probed a linked instance', {
			origin: this.deps.origin,
			reason: result.ok ? 'ok' : result.reason,
		});
		return result;
	}

	async listToolNames(): Promise<string[]> {
		return await this.run(
			'unreachable',
			async (client) => await listAllToolNames(client, CALL_TIMEOUT_MS),
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
		return await this.run('tool-error', async (client) => {
			const result = await client.callTool({ name, arguments: args, ...meta }, undefined, {
				timeout,
			});
			return readToolResult(result, this.deps.token);
		});
	}

	async close(): Promise<void> {
		const pending = this.connection;
		this.connection = undefined;
		const client = await pending?.catch(() => undefined);
		if (client) await closeQuietly(client);
	}

	/** Sends no token: only an n8n MCP endpoint answers 401 with a Bearer challenge. */
	private async probeHead(
		transportFetch: CustomFetch,
	): Promise<RemoteProbeFailureReason | 'challenge'> {
		const response = await withResponseLimit(transportFetch)(this.mcpUrl, {
			method: 'HEAD',
			redirect: 'manual',
			signal: AbortSignal.timeout(PROBE_TIMEOUT_MS),
		});
		return classifyHeadResponse(response);
	}

	private async probeTools(transportFetch: CustomFetch): Promise<RemoteProbeResult> {
		try {
			const authorisedFetch = this.authorised(transportFetch);
			const client = await openConnection(this.mcpUrl, authorisedFetch, PROBE_TIMEOUT_MS);
			try {
				return { ok: true, toolNames: await listAllToolNames(client, PROBE_TIMEOUT_MS) };
			} finally {
				await closeQuietly(client);
			}
		} catch (error) {
			const { reason } = toRemoteError(error, 'unreachable', this.deps.token);
			return { ok: false, reason: isProbeFailureReason(reason) ? reason : 'unreachable' };
		}
	}

	private async run<T>(
		fallback: 'unreachable' | 'tool-error',
		operation: (client: SdkClient) => Promise<T>,
	): Promise<T> {
		try {
			return await operation(await this.connect());
		} catch (error) {
			const failure = toRemoteError(error, fallback, this.deps.token);
			this.deps.logger.warn('A request to a linked instance failed', {
				origin: this.deps.origin,
				reason: failure.reason,
			});
			throw failure;
		}
	}

	private async connect(): Promise<SdkClient> {
		this.callFetch ??= this.authorised(this.deps.transportFetch(CALL_TIMEOUT_MS));
		const pending = (this.connection ??= openConnection(
			this.mcpUrl,
			this.callFetch,
			CALL_TIMEOUT_MS,
		));
		try {
			return await pending;
		} catch (error) {
			// Let the next request open a fresh connection.
			if (this.connection === pending) this.connection = undefined;
			throw error;
		}
	}

	/** The token goes only to this origin's host, and a redirect to another origin drops it. */
	private authorised(transportFetch: CustomFetch): typeof fetch {
		return createAuthFetch({
			baseFetch: withResponseLimit(transportFetch),
			initialHeaders: { Authorization: `Bearer ${this.deps.token}` },
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

	/** `origin` must come from `normaliseInstanceAddress`. */
	create(input: { origin: string; token: string }): RemoteInstanceClient {
		const { origin, token } = parseClientInput(input);
		return new McpRemoteInstanceClient({
			origin,
			token,
			logger: this.logger,
			transportFetch: (timeoutMs) => this.enforcedFetch(timeoutMs),
		});
	}

	/**
	 * Applies the SSRF policy even when the instance turns it off, because users type the address.
	 * Private targets need `N8N_SSRF_ALLOWED_IP_RANGES`. The transport pins the checked address.
	 */
	private enforcedFetch(timeoutMs: number): CustomFetch {
		return this.outboundHttp
			.transport({
				proxy: 'env',
				useDefaultSsrfPolicy: 'enforced',
				timeouts: { headersTimeout: timeoutMs, bodyTimeout: timeoutMs },
			})
			.asCustomFetch();
	}
}
