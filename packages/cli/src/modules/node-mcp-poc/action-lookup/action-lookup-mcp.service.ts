import { Service } from '@n8n/di';
import { lazyImport } from '@n8n/utils/lazy-import';

import { NodeActionGatewayService } from './node-action-gateway.service';
import {
	GET_NODE_ACTION_DESCRIPTION,
	RESOLVE_NODE_PARAMETER_DESCRIPTION,
	RUN_NODE_ACTION_DESCRIPTION,
	SEARCH_NODE_ACTIONS_DESCRIPTION,
	getNodeActionInputSchema,
	resolveNodeParameterInputSchema,
	runNodeActionInputSchema,
	searchNodeActionsInputSchema,
} from './action-lookup-tool-definitions';

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function result(value: unknown) {
	if (isRecord(value)) return { content: [], structuredContent: value };
	return {
		content: [
			{
				type: 'text' as const,
				text: typeof value === 'string' ? value : (JSON.stringify(value) ?? String(value)),
			},
		],
	};
}

function errorResult(error: unknown) {
	const message = error instanceof Error ? error.message : 'Node action call failed';
	const toolValidationMatch = /^Invalid tool input at "([^"]+)": (.+)$/.exec(message);
	const actionValidationMatch = /^Invalid action input for "([^"]+)": (.+)$/.exec(message);
	const validationMatch = toolValidationMatch ?? actionValidationMatch;
	const value = validationMatch
		? {
				status: 'error',
				code: 'VALIDATION_ERROR',
				message: 'Action input is invalid.',
				issues: [
					{
						path: validationMatch?.[1] ?? '<root>',
						message: validationMatch?.[2] ?? message,
					},
				],
			}
		: {
				status: 'error',
				code: message === 'Action not found' ? 'NOT_FOUND' : 'ACTION_ERROR',
				message,
			};
	return {
		content: [],
		structuredContent: value,
		isError: true as const,
	};
}

async function call(execute: () => unknown) {
	try {
		return result(await execute());
	} catch (error) {
		return errorResult(error);
	}
}

@Service()
export class ActionLookupMcpService {
	constructor(private readonly gateway: NodeActionGatewayService) {}

	async getServer(endpoint: string) {
		this.gateway.getCatalog(endpoint);
		const { McpServer } = await lazyImport<
			typeof import('@modelcontextprotocol/sdk/server/mcp.js')
		>(async () => await import('@modelcontextprotocol/sdk/server/mcp.js'));
		const server = new McpServer({
			name: `n8n Node Action Lookup POC (${endpoint})`,
			version: '0.1.0',
		});

		server.registerTool(
			'search_node_actions',
			{
				description: SEARCH_NODE_ACTIONS_DESCRIPTION,
				inputSchema: searchNodeActionsInputSchema.shape,
				annotations: {
					readOnlyHint: true,
					destructiveHint: false,
					idempotentHint: true,
					openWorldHint: false,
				},
			},
			async ({ query, limit, cursor }) =>
				await call(() => this.gateway.search(endpoint, query, limit, cursor)),
		);

		server.registerTool(
			'get_node_action',
			{
				description: GET_NODE_ACTION_DESCRIPTION,
				inputSchema: getNodeActionInputSchema.shape,
				annotations: {
					readOnlyHint: true,
					destructiveHint: false,
					idempotentHint: true,
					openWorldHint: false,
				},
			},
			async ({ actionId }) => await call(() => this.gateway.get(endpoint, actionId)),
		);

		server.registerTool(
			'resolve_node_parameter',
			{
				description: RESOLVE_NODE_PARAMETER_DESCRIPTION,
				inputSchema: resolveNodeParameterInputSchema.shape,
				annotations: {
					readOnlyHint: true,
					destructiveHint: false,
					idempotentHint: true,
					openWorldHint: true,
				},
			},
			async ({ actionId, parameter, knownInput, query, cursor }) =>
				await call(
					async () =>
						await this.gateway.resolve(endpoint, {
							actionId,
							parameter,
							knownInput,
							query,
							cursor,
						}),
				),
		);

		server.registerTool(
			'run_node_action',
			{
				description: RUN_NODE_ACTION_DESCRIPTION,
				inputSchema: runNodeActionInputSchema.shape,
				annotations: {
					readOnlyHint: false,
					destructiveHint: true,
					openWorldHint: true,
				},
			},
			async ({ actionId, input }) =>
				await call(async () => await this.gateway.run(endpoint, actionId, input)),
		);

		return server;
	}
}
