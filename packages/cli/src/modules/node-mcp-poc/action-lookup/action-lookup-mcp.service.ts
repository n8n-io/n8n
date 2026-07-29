import { Service } from '@n8n/di';
import { lazyImport } from '@n8n/utils/lazy-import';
import { z } from 'zod';

import { NodeActionGatewayService } from './node-action-gateway.service';

const SEARCH_NODE_ACTIONS_DESCRIPTION = `Start here for every node-action task. Search only the actions available to you.

Rules:
- Describe both the integration and intent; for example: "Google Sheets append row" or "Slack send message".
- Never guess an actionId. Use an exact id returned by this tool.
- If results are empty or irrelevant, retry with a shorter integration name, action verb, or synonym.
- After choosing an action, call get_node_action before resolving parameters or running it.`;

const GET_NODE_ACTION_DESCRIPTION = `Get the authoritative input contract for one action selected with search_node_actions.

Rules:
- Always call this before resolve_node_parameter or run_node_action for the selected action.
- Use only fields listed in input.fields. Do not invent parameters or send credentials, resource, operation, version, resolver names, or n8n editor wrappers.
- Supply every visible required field. Obey each field's when condition.
- Resource fields accept the scalar forms listed in accepts. Object fields accept ordinary JSON objects.
- A field with resolve must be resolved when you do not already know a valid value or its object fields.`;

const RESOLVE_NODE_PARAMETER_DESCRIPTION = `Resolve one dynamic field from a contract returned by get_node_action.

Rules:
- Call this only for a field that has resolve metadata, using its exact field path as parameter.
- Put values already chosen for the action in knownInput, using the public scalar/object shapes from get_node_action.
- Resolve dependencies first. If status is "needsInput", obtain every field in missing and retry.
- Never provide or guess an underlying n8n method name.
- Never silently select an option. Choose the option that matches the user's intent, add its value to knownInput, then follow next.
- Use query to narrow large option lists and cursor to continue pagination.`;

const RUN_NODE_ACTION_DESCRIPTION = `Final step: validate and execute an action after reading its contract and resolving required dynamic fields.

Rules:
- Use the exact actionId returned by search_node_actions.
- Call get_node_action first and include only its public input fields.
- Complete all visible required fields and required dynamic resolutions before running.
- Send resource locators as scalars and resource-mapper values as ordinary objects. Never send credentials, resolver names, n8n expressions, or internal wrappers.
- If validation fails, correct the reported field; do not repeatedly retry unchanged input.`;

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
				inputSchema: {
					query: z.string().min(1),
					limit: z.number().int().min(1).max(50).default(10),
					cursor: z.string().optional(),
				},
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
				inputSchema: {
					actionId: z.string().min(1),
				},
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
				inputSchema: {
					actionId: z.string().min(1),
					parameter: z.string().min(1),
					knownInput: z.record(z.string(), z.unknown()),
					query: z.string().optional(),
					cursor: z.string().optional(),
				},
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
				inputSchema: {
					actionId: z.string().min(1),
					input: z.record(z.string(), z.unknown()),
				},
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
