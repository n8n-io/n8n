import { Tool } from '@n8n/agents';
import { INSTANCE_AI_MCP_SERVER_TARGET_METADATA_KEY } from '@n8n/api-types';
import { isRecord } from '@n8n/utils/is-record';
import { z } from 'zod';

import { sanitizeInputSchema } from '../agent/sanitize-mcp-schemas';
import { getThread } from '../storage/thread-patch';
import type { InstanceAiContext, InstanceAiMcpServerBuilderService } from '../types';
import { DOMAIN_TOOL_IDS } from './tool-ids';

const serverIdField = z
	.string()
	.optional()
	.describe('The MCP server ID. Omit it to use the server this conversation is bound to');

const behaviorField = z
	.enum(['read', 'write', 'delete'])
	.describe(
		'read: only reads data. write: creates or changes data. delete: deletes data. AI clients use it to decide whether to ask first',
	);

// Fields that several actions share must carry the same description, or the agent
// framework rejects the discriminated union. Keep one text per shared field here.
const NAME_TEXT =
	'Name. A tool name is what the AI client sees: snake_case, starting with a verb. In update_tool, null resets it to the default';
const DESCRIPTION_TEXT =
	'Description. Server: what it is for. Tool: what it does, what it returns and when to use it (in update_tool, null resets it). Resource: what it holds';
const TARGET_ID_TEXT =
	'The workflow ID or agent ID from search_targets, or the skill ID from search_skills for a skill resource';
const QUERY_TEXT = 'Part of the name. Omit to list recent ones';
const TOOL_ID_TEXT = 'The tool ID from get';

const inputField = z.object({
	name: z.string(),
	type: z.enum(['string', 'number', 'boolean', 'object', 'array']),
	description: z.string().optional(),
	required: z.boolean().optional(),
});

const actions = z.discriminatedUnion('action', [
	z.object({
		action: z.literal('get').describe('Read the server: settings, tools, resources, access'),
		serverId: serverIdField,
	}),
	z.object({
		action: z.literal('update').describe('Change server fields. Send only the fields to change'),
		serverId: serverIdField,
		name: z.string().optional().describe(NAME_TEXT),
		description: z.string().optional().describe(DESCRIPTION_TEXT),
		instructions: z
			.string()
			.optional()
			.describe('Sent to every AI client that connects. How to use the tools together'),
		slug: z.string().optional().describe('URL name: lowercase letters, numbers and dashes'),
		active: z.boolean().optional(),
		accessMode: z
			.enum(['public', 'apiKey', 'oauth'])
			.optional()
			.describe(
				'public: anyone with the URL. apiKey: one key for each team or client. oauth: people sign in with their n8n account',
			),
		rateLimitPerMinute: z.number().int().min(0).optional(),
		shareVisibility: z.enum(['instance', 'public']).optional(),
		confirmDestructive: z
			.boolean()
			.optional()
			.describe('Ask the person to confirm before a tool that deletes data'),
		confirmWrite: z
			.boolean()
			.optional()
			.describe('Ask the person to confirm before a tool that changes data'),
	}),
	z.object({
		action: z
			.literal('search_targets')
			.describe(
				'Search the workflows and agents that can become tools. A workflow needs a "When Executed by Another Workflow" trigger (compatible: true)',
			),
		query: z.string().optional().describe(QUERY_TEXT),
	}),
	z.object({
		action: z.literal('search_skills').describe('Search skills that can become resources'),
		query: z.string().optional().describe(QUERY_TEXT),
	}),
	z.object({
		action: z.literal('add_tool').describe('Add a workflow or an agent as a tool'),
		serverId: serverIdField,
		kind: z.enum(['workflow', 'agent']).describe('What the tool runs'),
		targetId: z.string().describe(TARGET_ID_TEXT),
		name: z.string().optional().describe(NAME_TEXT),
		description: z.string().optional().describe(DESCRIPTION_TEXT),
		behavior: behaviorField.optional(),
	}),
	z.object({
		action: z
			.literal('update_tool')
			.describe('Change a tool for this server only. The workflow or agent stays the same'),
		serverId: serverIdField,
		toolId: z.string().describe(TOOL_ID_TEXT),
		targetId: z.string().optional().describe(TARGET_ID_TEXT),
		name: z.string().nullable().optional().describe(NAME_TEXT),
		description: z.string().nullable().optional().describe(DESCRIPTION_TEXT),
		behavior: behaviorField.optional(),
		inputs: z
			.array(inputField)
			.nullable()
			.optional()
			.describe('Override the inputs. null resets to the inputs of the workflow'),
		enabled: z.boolean().optional(),
	}),
	z.object({
		action: z.literal('remove_tool'),
		serverId: serverIdField,
		toolId: z.string().describe(TOOL_ID_TEXT),
	}),
	z.object({
		action: z
			.literal('add_resource')
			.describe(
				'Add a skill (resourceKind skill, targetId) or a text (resourceKind text, name, content) that AI clients can read',
			),
		serverId: serverIdField,
		// Not "kind": add_tool owns that field with other enum values.
		resourceKind: z.enum(['skill', 'text']).describe('What the resource holds'),
		targetId: z.string().optional().describe(TARGET_ID_TEXT),
		name: z.string().optional().describe(NAME_TEXT),
		description: z.string().optional().describe(DESCRIPTION_TEXT),
		content: z.string().optional().describe('Markdown text, for resourceKind text'),
	}),
	z.object({
		action: z.literal('remove_resource'),
		serverId: serverIdField,
		resourceId: z.string(),
	}),
]);

type Input = z.infer<typeof actions>;

/** The server the thread is bound to, from its metadata. */
export async function readBoundMcpServerId(context: InstanceAiContext) {
	if (!context.threadMemory || !context.threadId) return undefined;
	const thread = await getThread(context.threadMemory, context.threadId).catch(() => null);
	const target = thread?.metadata?.[INSTANCE_AI_MCP_SERVER_TARGET_METADATA_KEY];
	return isRecord(target) && typeof target.serverId === 'string' ? target.serverId : undefined;
}

function pick(input: Record<string, unknown>, omit: string[]) {
	return Object.fromEntries(
		Object.entries(input).filter(([key, value]) => !omit.includes(key) && value !== undefined),
	);
}

export function createMcpServerBuilderTool(context: InstanceAiContext) {
	const service: InstanceAiMcpServerBuilderService | undefined = context.mcpServerBuilderService;

	return new Tool(DOMAIN_TOOL_IDS.MCP_SERVER_BUILDER)
		.description(
			'Build an n8n MCP server: read it, change its settings, add or remove tools (workflows and agents) and resources (skills and texts), and search what can be added. ' +
				'Each change shows at once on the server page that the user is looking at. ' +
				'To add a tool that has no workflow yet, first build the workflow with a "When Executed by Another Workflow" trigger that declares its inputs, then add it here.',
		)
		.input(sanitizeInputSchema(actions))
		.handler(async (input: Input) => {
			if (!service) return { error: 'MCP servers are not available on this instance.' };

			const resolveServerId = async (value: string | undefined) => {
				const id = value ?? (await readBoundMcpServerId(context));
				if (!id) {
					throw new Error(
						'No MCP server is bound to this conversation. Ask the user to open the server page.',
					);
				}
				return id;
			};

			switch (input.action) {
				case 'get':
					return await service.get(await resolveServerId(input.serverId));
				case 'update':
					return await service.update(
						await resolveServerId(input.serverId),
						pick(input, ['action', 'serverId']),
					);
				case 'search_targets':
					return { targets: await service.searchTargets(input.query) };
				case 'search_skills':
					return { skills: await service.searchSkills(input.query) };
				case 'add_tool':
					return await service.addTool(
						await resolveServerId(input.serverId),
						pick(input, ['action', 'serverId']),
					);
				case 'update_tool':
					return await service.updateTool(
						await resolveServerId(input.serverId),
						input.toolId,
						pick(input, ['action', 'serverId', 'toolId']),
					);
				case 'remove_tool':
					return await service.removeTool(await resolveServerId(input.serverId), input.toolId);
				case 'add_resource': {
					const { resourceKind, ...rest } = pick(input, ['action', 'serverId']);
					return await service.addResource(await resolveServerId(input.serverId), {
						...rest,
						kind: resourceKind,
					});
				}
				case 'remove_resource':
					return await service.removeResource(
						await resolveServerId(input.serverId),
						input.resourceId,
					);
			}
		})
		.build();
}
