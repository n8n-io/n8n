import { Tool } from '@n8n/agents';
import {
	MCP_SERVER_DESCRIPTION_MAX_LENGTH,
	mcpServerNameSchema,
	mcpServerSlugSchema,
	mcpServerToolNameSchema,
	type McpServerDetailResponse,
	type McpServerResponse,
	type McpServerToolResponse,
} from '@n8n/api-types';
import { nanoid } from 'nanoid';
import { z } from 'zod';

import { sanitizeInputSchema } from '../agent/sanitize-mcp-schemas';
import type {
	CustomMcpServerRef,
	InstanceAiContext,
	InstanceAiCustomMcpServerService,
} from '../types';
import {
	confirmationResumeSchema,
	confirmationSuspendSchema,
	type ConfirmationSuspendPayload,
	type ConfirmationToolContext,
} from './data-tables/confirmation';
import { DOMAIN_TOOL_IDS } from './tool-ids';

// The provider schema needs one description for each field name that several actions share.
const projectIdField = z
	.string()
	.optional()
	.describe(
		'A project ID. For list, only the servers of this project, and without it the servers of every project that the user can see. For other actions, the project of the server from the list action, and without it the project of this conversation or else the personal project',
	);
const serverIdField = z.string().describe('The server ID from the list action');
const toolIdField = z.string().describe('The tool ID from the get action');
// The server and the tool descriptions have the same length limit.
const descriptionField = z
	.string()
	.trim()
	.max(MCP_SERVER_DESCRIPTION_MAX_LENGTH)
	.optional()
	.describe(
		'For a server: what the server is for. AI clients get it as the server instructions. For a tool: when an AI client should call the tool, and what it returns',
	);

const serverRefShape = { serverId: serverIdField, projectId: projectIdField };

const listAction = z.object({
	action: z.literal('list').describe('List the custom MCP servers'),
	projectId: projectIdField,
});

const getAction = z.object({
	action: z.literal('get').describe('Read one server with its tools'),
	...serverRefShape,
});

const createAction = z.object({
	action: z.literal('create').describe('Create a server with no tools'),
	projectId: projectIdField,
	name: mcpServerNameSchema,
	slug: mcpServerSlugSchema
		.optional()
		.describe(
			'The last part of the server URL. It never changes. Default: made from the name. Pass it only when the user asks for one',
		),
	description: descriptionField,
});

const updateAction = z.object({
	action: z
		.literal('update')
		.describe('Change the name or the description of a server. The URL does not change'),
	...serverRefShape,
	name: mcpServerNameSchema.optional(),
	description: descriptionField,
});

const deleteAction = z.object({
	action: z
		.literal('delete')
		.describe(
			'Delete a server. AI clients lose access at once, and the URL is never used again. Only when the user asks for it',
		),
	...serverRefShape,
});

const toolCandidatesAction = z.object({
	action: z
		.literal('tool-candidates')
		.describe(
			'List the workflows of the project of the server. reason is null when the workflow can be a tool, and else says why it cannot',
		),
	...serverRefShape,
});

const addToolsAction = z.object({
	action: z
		.literal('add-tools')
		.describe(
			'Add workflows as tools. Each tool gets the workflow name and description. Then improve the text with generate or update-tool',
		),
	...serverRefShape,
	workflowIds: z
		.array(z.string().min(1))
		.min(1)
		.max(100)
		.describe('Workflow IDs from tool-candidates whose reason is null'),
});

const updateToolAction = z.object({
	action: z
		.literal('update-tool')
		.describe('Change the name or the description of a tool, with your own text'),
	...serverRefShape,
	toolId: toolIdField,
	toolName: mcpServerToolNameSchema
		.optional()
		.describe('The name that AI clients call. Lowercase letters, numbers, and underscores'),
	description: descriptionField,
});

const generateAction = z.object({
	action: z
		.literal('generate')
		.describe(
			'Write the tool name and description again with AI, from the workflow, as the "Generate" button does. Use it after add-tools',
		),
	...serverRefShape,
	toolId: toolIdField,
	field: z
		.enum(['toolName', 'description'])
		.optional()
		.describe('Only this field. Default: both fields'),
});

const removeToolAction = z.object({
	action: z
		.literal('remove-tool')
		.describe('Remove a tool from a server. The workflow stays as it is'),
	...serverRefShape,
	toolId: toolIdField,
});

const inputSchema = z.discriminatedUnion('action', [
	listAction,
	getAction,
	createAction,
	updateAction,
	deleteAction,
	toolCandidatesAction,
	addToolsAction,
	updateToolAction,
	generateAction,
	removeToolAction,
]);

type Input = z.infer<typeof inputSchema>;
type ActionInput<A extends Input['action']> = Extract<Input, { action: A }>;

const DESCRIPTION =
	'Build the custom MCP servers of a project: a builder puts workflows on a server, and the people of the project connect AI clients, such as Claude or Cursor, to it. ' +
	'Not `mcp-servers`, which connects third-party MCP servers to this conversation. ' +
	'To build a server: create it, read tool-candidates, add the workflows that fit with add-tools, then improve the tool text with generate. ' +
	'A workflow that is not published, or has no "When Executed by Another Workflow" trigger, cannot be a tool. Fix it with the workflow tools first.';

/** One grant covers every write that is not a delete, as one "Allow for this chat" answer. */
const WRITE_GRANT_KEY = `${DOMAIN_TOOL_IDS.CUSTOM_MCP_SERVERS}:write`;

const BLOCKED_RESULT = { success: false, denied: true, reason: 'Action blocked by admin' };

/**
 * `write`: every change that is not a delete. It asks first, unless the user allowed writes
 * for this conversation. `delete` has its own admin permission and never takes that grant.
 */
type ApprovalKind = 'write' | 'delete';

async function withApproval<T extends object>(
	context: InstanceAiContext,
	ctx: ConfirmationToolContext,
	kind: ApprovalKind,
	request: () => Promise<Omit<ConfirmationSuspendPayload, 'requestId'>>,
	run: () => Promise<T>,
) {
	const permission = kind === 'delete' ? context.permissions?.deleteMcpServer : undefined;
	if (permission === 'blocked') return BLOCKED_RESULT;

	const { resumeData } = ctx;
	const granted =
		permission === 'always_allow' ||
		(kind === 'write' && context.sessionApprovedToolKeys?.has(WRITE_GRANT_KEY) === true);
	if (!granted && !resumeData) {
		return await ctx.suspend({ requestId: nanoid(), ...(await request()) });
	}
	if (resumeData && !resumeData.approved) {
		return { success: false, denied: true, reason: 'User denied the action' };
	}
	if (kind === 'write' && resumeData?.approved && resumeData.scope === 'session') {
		await context.grantSessionToolApproval?.(WRITE_GRANT_KEY);
	}
	return { success: true, ...(await run()) };
}

function requireService(context: InstanceAiContext): InstanceAiCustomMcpServerService {
	const service = context.customMcpServerService;
	if (!service) throw new Error('Custom MCP servers are not available on this instance.');
	return service;
}

function summary(server: McpServerResponse) {
	return {
		id: server.id,
		projectId: server.projectId,
		projectName: server.project.name,
		name: server.name,
		slug: server.slug,
		description: server.description,
	};
}

function toolSummary(tool: McpServerToolResponse) {
	return {
		id: tool.id,
		workflowId: tool.targetId,
		toolName: tool.toolName,
		description: tool.description,
		brokenReason: tool.brokenReason,
	};
}

function toRef(input: { serverId: string; projectId?: string }): CustomMcpServerRef {
	return { serverId: input.serverId, projectId: input.projectId };
}

function findTool(server: McpServerDetailResponse, toolId: string): McpServerToolResponse {
	const tool = server.tools.find(({ id }) => id === toolId);
	if (!tool) throw new Error(`The server has no tool with the ID "${toolId}".`);
	return tool;
}

function changesMessage(
	changes: { name?: string; description?: string },
	nameChange: (name: string) => string,
	descriptionChange: string,
): string {
	return [
		changes.name !== undefined ? nameChange(changes.name) : undefined,
		changes.description !== undefined ? descriptionChange : undefined,
	]
		.filter((part) => part !== undefined)
		.join(' ');
}

function countWorkflows(count: number): string {
	return count === 1 ? '1 workflow' : `${count} workflows`;
}

async function handleUpdate(
	context: InstanceAiContext,
	service: InstanceAiCustomMcpServerService,
	input: ActionInput<'update'>,
	ctx: ConfirmationToolContext,
) {
	const changes = { name: input.name, description: input.description };
	if (changes.name === undefined && changes.description === undefined) {
		return { success: false, refused: true, reason: 'Pass a name or a description to change.' };
	}
	return await withApproval(
		context,
		ctx,
		'write',
		async () => ({
			message: changesMessage(
				changes,
				(name) => `Rename the server to "${name}".`,
				'Change the description of the server. AI clients get it as the server instructions.',
			),
			resourceName: (await service.get(toRef(input))).name,
			severity: 'info',
		}),
		async () => ({
			server: summary(await service.update(toRef(input), changes)),
		}),
	);
}

async function handleAddTools(
	context: InstanceAiContext,
	service: InstanceAiCustomMcpServerService,
	input: ActionInput<'add-tools'>,
	ctx: ConfirmationToolContext,
) {
	return await withApproval(
		context,
		ctx,
		'write',
		async () => {
			const [server, candidates] = await Promise.all([
				service.get(toRef(input)),
				service.listToolCandidates(toRef(input)),
			]);
			const names = new Map(candidates.map(({ workflowId, name }) => [workflowId, name]));
			const workflows = input.workflowIds.map((id) => names.get(id) ?? id).join(', ');
			return {
				message: `Add ${countWorkflows(input.workflowIds.length)} as tools: ${workflows}.`,
				resourceName: server.name,
				severity: 'info',
			};
		},
		async () => ({
			tools: (await service.addTools(toRef(input), input.workflowIds)).map(toolSummary),
		}),
	);
}

async function handleUpdateTool(
	context: InstanceAiContext,
	service: InstanceAiCustomMcpServerService,
	input: ActionInput<'update-tool'>,
	ctx: ConfirmationToolContext,
) {
	const changes = { toolName: input.toolName, description: input.description };
	if (changes.toolName === undefined && changes.description === undefined) {
		return {
			success: false,
			refused: true,
			reason: 'Pass a toolName or a description to change.',
		};
	}
	const tool = findTool(await service.get(toRef(input)), input.toolId);
	return await withApproval(
		context,
		ctx,
		'write',
		async () => ({
			message: `${changesMessage(
				{ name: changes.toolName, description: changes.description },
				(name) => `Change the tool name to "${name}".`,
				'Change the tool description.',
			)} AI clients see the change at once.`,
			resourceName: tool.toolName,
			severity: 'info',
		}),
		async () => ({
			tool: toolSummary(await service.updateTool(toRef(input), input.toolId, changes)),
		}),
	);
}

const DRAFTS_NOT_AVAILABLE =
	'AI drafts are not available for this user. Write the text with update-tool.';

async function handleGenerate(
	context: InstanceAiContext,
	service: InstanceAiCustomMcpServerService,
	input: ActionInput<'generate'>,
	ctx: ConfirmationToolContext,
) {
	const server = await service.get(toRef(input));
	if (!server.toolDraftsAvailable) {
		return { success: false, refused: true, reason: DRAFTS_NOT_AVAILABLE };
	}
	const tool = findTool(server, input.toolId);
	const fields = {
		toolName: 'the tool name',
		description: 'the tool description',
	} as const;
	const target = input.field ? fields[input.field] : `${fields.toolName} and ${fields.description}`;
	return await withApproval(
		context,
		ctx,
		'write',
		async () => ({
			message: `Write ${target} again with AI, from the workflow.`,
			resourceName: tool.toolName,
			severity: 'info',
		}),
		async () => {
			const result = await service.generateTool(toRef(input), input.toolId, input.field);
			// The Assistant can turn off between the card and the approval.
			if (result.status === 'not_available') throw new Error(DRAFTS_NOT_AVAILABLE);
			return { tool: toolSummary(result.tool) };
		},
	);
}

async function handleRemoveTool(
	context: InstanceAiContext,
	service: InstanceAiCustomMcpServerService,
	input: ActionInput<'remove-tool'>,
	ctx: ConfirmationToolContext,
) {
	const server = await service.get(toRef(input));
	const tool = findTool(server, input.toolId);
	return await withApproval(
		context,
		ctx,
		'write',
		async () => ({
			message: `Remove the tool from ${server.name}. AI clients cannot call it after this.`,
			resourceName: tool.toolName,
			severity: 'warning',
		}),
		async () => {
			await service.removeTool(toRef(input), input.toolId);
			return { toolId: input.toolId };
		},
	);
}

async function handleDelete(
	context: InstanceAiContext,
	service: InstanceAiCustomMcpServerService,
	input: ActionInput<'delete'>,
	ctx: ConfirmationToolContext,
) {
	return await withApproval(
		context,
		ctx,
		'delete',
		async () => {
			const server = await service.get(toRef(input));
			return {
				message: `Delete the server. AI clients lose access to its tools now. Its URL /mcp-servers/${server.slug} stays reserved. You cannot undo this.`,
				resourceName: server.name,
				severity: 'destructive',
			};
		},
		async () => {
			await service.delete(toRef(input));
			return { serverId: input.serverId };
		},
	);
}

export function createCustomMcpServersTool(context: InstanceAiContext) {
	return new Tool(DOMAIN_TOOL_IDS.CUSTOM_MCP_SERVERS)
		.description(DESCRIPTION)
		.input(sanitizeInputSchema(inputSchema))
		.suspend(confirmationSuspendSchema)
		.resume(confirmationResumeSchema)
		.handler(async (input: Input, ctx: ConfirmationToolContext) => {
			const service = requireService(context);
			switch (input.action) {
				case 'list':
					return { servers: (await service.list(input.projectId)).map(summary) };
				case 'get': {
					const { tools, toolDraftsAvailable, ...server } = await service.get(toRef(input));
					return {
						server: summary(server),
						tools: tools.map(toolSummary),
						generateAvailable: toolDraftsAvailable,
					};
				}
				case 'create': {
					const { action: _action, ...create } = input;
					return await withApproval(
						context,
						ctx,
						'write',
						async () => ({
							message:
								'Create a custom MCP server. AI clients can connect to it after you add tools.',
							resourceName: input.name,
							severity: 'info',
						}),
						async () => ({ server: summary(await service.create(create)) }),
					);
				}
				case 'update':
					return await handleUpdate(context, service, input, ctx);
				case 'delete':
					return await handleDelete(context, service, input, ctx);
				case 'tool-candidates':
					return { candidates: await service.listToolCandidates(toRef(input)) };
				case 'add-tools':
					return await handleAddTools(context, service, input, ctx);
				case 'update-tool':
					return await handleUpdateTool(context, service, input, ctx);
				case 'generate':
					return await handleGenerate(context, service, input, ctx);
				case 'remove-tool':
					return await handleRemoveTool(context, service, input, ctx);
			}
		})
		.build();
}
