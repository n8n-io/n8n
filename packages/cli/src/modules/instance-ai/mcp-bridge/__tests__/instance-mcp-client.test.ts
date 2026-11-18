import {
	CLIENT_INFO_META_KEY,
	createMcpHandler,
	inputRequired,
	inputResponse,
	McpServer,
} from '@modelcontextprotocol/server';
import { isRecord } from '@n8n/utils/is-record';
import { z } from 'zod';

import { shapeToStandardSchema } from '@/modules/mcp/tool-schema.util';

import { createInProcessFetch } from '../in-process-fetch';
import { ASSISTANT_MCP_CLIENT_INFO, InstanceMcpClient } from '../instance-mcp-client';

const INSTRUCTIONS = 'Stub server instructions';
const RESOURCE_URI = 'n8n://stub/reference';
const CONFIRM_KEY = 'confirm';

/** Every call reaches a fresh instance, as on the public endpoint. */
const buildStubServer = () => {
	const server = new McpServer({ name: 'stub', version: '1.0.0' }, { instructions: INSTRUCTIONS });

	server.registerTool(
		'echo',
		{
			description: 'Echoes the text and names the caller.',
			inputSchema: shapeToStandardSchema({ text: z.string() }),
			outputSchema: shapeToStandardSchema({ text: z.string(), caller: z.string() }),
		},
		(args, ctx) => {
			// The envelope's keys are lost in the SDK's emitted types; the values are there.
			const envelope: Record<string, unknown> | undefined = ctx.mcpReq.envelope;
			const clientInfo = envelope?.[CLIENT_INFO_META_KEY];
			const caller =
				isRecord(clientInfo) && typeof clientInfo.name === 'string' ? clientInfo.name : '';
			const output = { text: args.text, caller };
			return {
				content: [{ type: 'text', text: JSON.stringify(output) }],
				structuredContent: output,
			};
		},
	);

	// A confirmation gate in the multi-round-trip shape: the first round asks,
	// the retry carries the answer and the echoed state.
	server.registerTool(
		'archive',
		{
			description: 'Archives after a confirmation.',
			inputSchema: shapeToStandardSchema({ id: z.string() }),
		},
		(args, ctx) => {
			const answer = inputResponse(ctx.mcpReq.inputResponses, CONFIRM_KEY);
			if (answer.kind === 'missing') {
				return inputRequired({
					inputRequests: {
						[CONFIRM_KEY]: inputRequired.elicit({
							message: `Archive ${args.id}?`,
							requestedSchema: {
								type: 'object',
								properties: { reason: { type: 'string', title: 'Reason' } },
							},
						}),
					},
					requestState: `pending:${args.id}`,
				});
			}
			const state = ctx.mcpReq.requestState<string>();
			const text =
				answer.kind === 'elicit'
					? `${answer.action}:${state ?? ''}:${String(answer.content?.reason ?? '')}`
					: 'unexpected';
			return { content: [{ type: 'text', text }] };
		},
	);

	server.registerTool(
		'wait',
		{ description: 'Waits for cancellation.', inputSchema: shapeToStandardSchema({}) },
		async (_args, ctx) =>
			await new Promise((_resolve, reject) => {
				ctx.mcpReq.signal.addEventListener('abort', () => reject(new Error('cancelled')));
			}),
	);

	server.registerResource(
		'reference',
		RESOURCE_URI,
		{ description: 'A reference document', mimeType: 'text/plain' },
		() => ({ contents: [{ uri: RESOURCE_URI, mimeType: 'text/plain', text: 'reference text' }] }),
	);

	return server;
};

describe('InstanceMcpClient', () => {
	let client: InstanceMcpClient;
	let closed = false;

	beforeEach(async () => {
		closed = false;
		const handler = createMcpHandler(() => buildStubServer(), { legacy: 'reject' });
		client = await InstanceMcpClient.connect({
			fetch: createInProcessFetch(handler),
			onClose: async () => {
				closed = true;
				await handler.close();
			},
		});
	});

	afterEach(async () => {
		await client.close();
	});

	it('negotiates the modern revision and reads the server instructions', () => {
		expect(client.instructions).toBe(INSTRUCTIONS);
		expect(client.serverCapabilities?.tools).toBeDefined();
		expect(client.serverVersion).toEqual({ name: 'stub', version: '1.0.0' });
	});

	it('lists tools with their JSON input schemas', async () => {
		const tools = await client.listTools();
		const echo = tools.find((tool) => tool.name === 'echo');

		expect(tools.map((tool) => tool.name).sort()).toEqual(['archive', 'echo', 'wait']);
		expect(echo?.inputSchema).toMatchObject({
			type: 'object',
			properties: { text: { type: 'string' } },
			required: ['text'],
		});
		expect(echo?.outputSchema).toMatchObject({ type: 'object' });
	});

	it('calls a tool, stamps the client identity on the request, and returns structured content', async () => {
		const result = await client.callTool('echo', { text: 'hi' });

		expect(client.isInputRequired(result)).toBe(false);
		expect(result).toMatchObject({
			structuredContent: { text: 'hi', caller: ASSISTANT_MCP_CLIENT_INFO.name },
		});
	});

	it('reads a resource', async () => {
		const resources = await client.listResources();
		const result = await client.readResource(RESOURCE_URI);

		expect(resources.map((resource) => resource.uri)).toEqual([RESOURCE_URI]);
		expect(result.contents[0]).toMatchObject({ uri: RESOURCE_URI, text: 'reference text' });
	});

	it('surfaces an input_required result and completes the call on retry with the answer', async () => {
		const first = await client.callTool('archive', { id: 'wf-1' });

		if (!client.isInputRequired(first)) throw new Error('expected input_required');
		expect(first.inputRequests?.[CONFIRM_KEY]).toMatchObject({
			method: 'elicitation/create',
			params: { message: 'Archive wf-1?' },
		});
		expect(first.requestState).toBe('pending:wf-1');

		const second = await client.callTool(
			'archive',
			{ id: 'wf-1' },
			{
				inputResponses: { [CONFIRM_KEY]: { action: 'accept', content: { reason: 'stale' } } },
				requestState: first.requestState,
			},
		);

		expect(client.isInputRequired(second)).toBe(false);
		expect(second).toMatchObject({
			content: [{ type: 'text', text: 'accept:pending:wf-1:stale' }],
		});
	});

	it('cancels an in-flight call through the abort signal', async () => {
		const controller = new AbortController();
		const pending = client.callTool('wait', {}, { signal: controller.signal });
		controller.abort();

		await expect(pending).rejects.toThrow();
	});

	it('tears down the handler on close', async () => {
		await client.close();

		expect(closed).toBe(true);
	});
});
