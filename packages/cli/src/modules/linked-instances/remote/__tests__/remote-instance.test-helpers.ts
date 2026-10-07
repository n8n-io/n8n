import { createMcpHandler, McpServer } from '@modelcontextprotocol/server';
import type { Logger } from '@n8n/backend-common';
import type { CustomFetch, HttpTransport, OutboundHttp } from '@n8n/backend-network';
import { sleep } from '@n8n/utils/sleep';
import { mock, type MockProxy } from 'vitest-mock-extended';
import { z } from 'zod';

import { shapeToStandardSchema } from '@/modules/mcp/tool-schema.util';

import {
	RemoteInstanceClientFactory,
	type RemoteInstanceClient,
	type RemoteInstanceClientInput,
} from '../remote-instance.client';
import { RemoteInstanceError } from '../remote-instance.errors';

export const TOKEN = 'n8n-mcp-token-7f3c9e1a2b4d';
export const ORIGIN = 'https://cloud.example.com';
export const MCP_URL = `${ORIGIN}/mcp-server/http`;
export const BEARER_CHALLENGE = 'Bearer realm="n8n MCP Server", resource_metadata="https://x.test"';

export const TOOL_NAMES = [
	'search_workflows',
	'count_workflows',
	'greet',
	'publish_workflow',
	'echo_failure',
	'slow_tool',
	'huge_tool',
];

interface SeenRequest {
	method: string;
	url: string;
	authorization: string | null;
}

const rpcMethodSchema = z.object({ method: z.string() });

/** An in-process remote n8n: the real v2 server SDK behind the same auth gate n8n uses. */
export function createRemote(token = TOKEN) {
	const state = {
		disabled: false,
		seenMeta: [] as unknown[],
		requests: [] as SeenRequest[],
		rpcMethods: [] as string[],
	};
	let releaseSlowTool = () => {};
	const slowToolDone = new Promise<void>((resolve) => {
		releaseSlowTool = resolve;
	});

	const buildServer = () => {
		const server = new McpServer({ name: 'remote-n8n', version: '1.0.0' });
		const text = (value: string) => ({ content: [{ type: 'text' as const, text: value }] });
		server.registerTool(
			'search_workflows',
			{ description: 'Search', inputSchema: shapeToStandardSchema({ query: z.string() }) },
			async ({ query }, ctx) => {
				state.seenMeta.push(ctx.mcpReq._meta);
				const found = { workflows: [{ id: 'wf-1', name: `Match for ${query}` }] };
				return { ...text('Found 1 workflow'), structuredContent: found };
			},
		);
		server.registerTool('count_workflows', { description: 'Count' }, async () =>
			text('{"count":2}'),
		);
		server.registerTool('greet', { description: 'Greet' }, async () => text('Hello there'));
		server.registerTool('publish_workflow', { description: 'Publish' }, async () => ({
			...text('Workflow wf-9 was not found'),
			isError: true,
		}));
		server.registerTool('echo_failure', { description: 'Echo' }, async () => ({
			...text(`Bad token ${token} ${'x'.repeat(800)}`),
			isError: true,
		}));
		server.registerTool('slow_tool', { description: 'Slow' }, async () => {
			await slowToolDone;
			return text('done');
		});
		server.registerTool('huge_tool', { description: 'Huge' }, async () =>
			text('y'.repeat(6 * 1024 * 1024)),
		);
		return server;
	};
	const handler = createMcpHandler(async () => buildServer(), { legacy: 'stateless' });

	const fetch: CustomFetch = async (input, init) => {
		const request = new Request(input, init);
		const authorization = request.headers.get('authorization');
		state.requests.push({ method: request.method, url: request.url, authorization });
		if (request.method === 'POST') {
			const message = rpcMethodSchema.safeParse(await request.clone().json());
			if (message.success) state.rpcMethods.push(message.data.method);
		}
		if (state.disabled)
			return Response.json({ message: 'MCP access is disabled' }, { status: 404 });
		if (authorization !== `Bearer ${token}`) {
			return Response.json(
				{ message: 'Unauthorized' },
				{ status: 401, headers: { 'WWW-Authenticate': BEARER_CHALLENGE } },
			);
		}
		return await handler.fetch(request);
	};

	return { state, fetch, releaseSlowTool };
}

export type Remote = ReturnType<typeof createRemote>;

const jsonRpcMessageSchema = z.object({
	id: z.number().optional(),
	method: z.string(),
	params: z.record(z.unknown()).optional(),
});

type RpcAnswer = { result: unknown } | { error: { code: number; message: string } };

type RpcHandler = (method: string, params: Record<string, unknown>) => RpcAnswer;

export function initializeResult(params: Record<string, unknown>): RpcAnswer {
	const serverInfo = { name: 'stub', version: '1.0.0' };
	return {
		result: { protocolVersion: params.protocolVersion, capabilities: { tools: {} }, serverInfo },
	};
}

/** A bare JSON-RPC remote that answers HEAD with a Bearer challenge and checks no token. */
export function rpcRemote(answer: RpcHandler): CustomFetch {
	return async (input, init) => {
		const request = new Request(input, init);
		if (request.method === 'HEAD') {
			return new Response(null, { status: 401, headers: { 'WWW-Authenticate': BEARER_CHALLENGE } });
		}
		if (request.method !== 'POST') return new Response(null, { status: 405 });
		const message = jsonRpcMessageSchema.parse(await request.json());
		if (message.id === undefined) return new Response(null, { status: 202 });
		return Response.json({
			jsonrpc: '2.0',
			id: message.id,
			...answer(message.method, message.params ?? {}),
		});
	};
}

type ToolPage = { tools: string[]; nextCursor?: string };

/** Pages its tool list, which the SDK server does not do. */
export function pagedToolsRemote(pageFor: (cursor: unknown) => ToolPage): CustomFetch {
	return rpcRemote((method, params) => {
		if (method === 'initialize') return initializeResult(params);
		const { tools, nextCursor } = pageFor(params.cursor);
		const toolList = tools.map((name) => ({ name, inputSchema: { type: 'object' } }));
		return { result: { tools: toolList, ...(nextCursor ? { nextCursor } : {}) } };
	});
}

/** One stage is the HEAD request or a JSON-RPC request. Notifications and the GET do not wait. */
export interface SlowStage {
	name: string;
	signal: AbortSignal;
}

/** The JSON-RPC method that a POST carries. */
export async function rpcMethodOf(request: Request): Promise<string | undefined> {
	if (request.method !== 'POST') return undefined;
	return rpcMethodSchema.safeParse(await request.clone().json()).data?.method;
}

async function stageOf(request: Request): Promise<string | undefined> {
	if (request.method === 'HEAD') return 'HEAD';
	// The GET opens the optional event stream next to the requests.
	if (request.method !== 'POST') return undefined;
	const message = jsonRpcMessageSchema.parse(await request.clone().json());
	return message.id === undefined ? undefined : message.method;
}

/** Waits `stageMs` before each stage reaches `baseFetch`, and stops waiting when the request aborts. */
export function slowStages(baseFetch: CustomFetch, stageMs: number) {
	const stages: SlowStage[] = [];
	const fetch: CustomFetch = async (input, init) => {
		const request = new Request(input, init);
		const name = await stageOf(request);
		if (name !== undefined) {
			stages.push({ name, signal: request.signal });
			await sleep(stageMs, request.signal);
		}
		return await baseFetch(request);
	};
	return { fetch, stages };
}

type Dispatcher = ReturnType<HttpTransport['getDispatcher']>;

/** The mocks around one or more clients, with a fresh in-process remote. */
export class ClientHarness {
	readonly remote: Remote = createRemote();

	readonly scopedLogger = mock<Logger>();

	readonly outboundHttp = mock<OutboundHttp>();

	/** One for each transport that a client built, in build order. */
	readonly dispatchers: MockProxy<Dispatcher>[] = [];

	private readonly clients: RemoteInstanceClient[] = [];

	constructor() {
		this.useTransportFetch(this.remote.fetch);
	}

	useTransportFetch(transportFetch: CustomFetch): void {
		this.outboundHttp.transport.mockImplementation(() => {
			const dispatcher = mock<Dispatcher>();
			this.dispatchers.push(dispatcher);
			return mock<HttpTransport>({
				asCustomFetch: () => transportFetch,
				getDispatcher: () => dispatcher,
			});
		});
	}

	createClient(input: Partial<RemoteInstanceClientInput> = {}): RemoteInstanceClient {
		const logger = mock<Logger>({ scoped: vi.fn().mockReturnValue(this.scopedLogger) });
		const client = new RemoteInstanceClientFactory(logger, this.outboundHttp).create({
			origin: ORIGIN,
			token: TOKEN,
			...input,
		});
		this.clients.push(client);
		return client;
	}

	async dispose(): Promise<void> {
		this.remote.releaseSlowTool();
		await Promise.all(this.clients.map(async (client) => await client.close()));
	}
}

export async function catchError(promise: Promise<unknown>): Promise<RemoteInstanceError> {
	const error = await promise.then(
		() => undefined,
		(caught: unknown) => caught,
	);
	expect(error).toBeInstanceOf(RemoteInstanceError);
	return error as RemoteInstanceError;
}
