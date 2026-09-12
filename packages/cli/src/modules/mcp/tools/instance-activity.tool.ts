/**
 * The instance activity log, read by an external MCP client: what has recently been created,
 * changed, published or deleted here, and who did it.
 *
 * Two tools rather than the one action-dispatching tool Instance AI uses. MCP tools take a flat
 * `z.ZodRawShape` and have no schema sanitizer, so a discriminated union would have to be
 * flattened into one object whose branch-required fields are all optional — the shape that makes
 * `expand` with no id representable. Two tools make that unrepresentable instead.
 */
import type { User } from '@n8n/db';
import z from 'zod';

import type {
	InstanceContextScope,
	InstanceContextService,
} from '@/modules/instance-ai/instance-context.service';
import type { Telemetry } from '@/telemetry';

import { USER_CALLED_MCP_TOOL_EVENT } from '../mcp.constants';
import type { ToolDefinition, UserCalledMCPToolEventPayload } from '../mcp.types';
import { createLimitSchema } from './schemas';

const MAX_RESULTS = 100;
const DEFAULT_LIMIT = 30;

export const GET_INSTANCE_ACTIVITY_TOOL_NAME = 'get_instance_activity';
export const EXPAND_INSTANCE_ACTIVITY_TOOL_NAME = 'expand_instance_activity';

const entrySchema = z.object({
	id: z.number().describe('Entry id, which expand_instance_activity takes'),
	at: z.string().describe('ISO timestamp of the entry'),
	category: z
		.string()
		.describe("What kind of resource the entry is about: 'workflow' or 'credential'"),
	action: z.string().describe('What happened: created, saved, published, deleted, archived, …'),
	resourceType: z.string().optional().describe('What resourceId points at'),
	resourceId: z
		.string()
		.optional()
		.describe('Id of the resource, to pass to search_workflows, get_workflow_details, …'),
	resourceName: z.string().optional().describe('Name the resource had at the time'),
	byCurrentUser: z.boolean().describe('Whether the authenticated user is the one who did it'),
	detail: z.record(z.unknown()).optional().describe('Extra fields the entry carried'),
});

const listInputSchema = {
	category: z
		.enum(['workflow', 'credential'])
		.optional()
		.describe('Restrict to one kind of entry.'),
	resourceId: z
		.string()
		.min(1)
		.optional()
		.describe('Restrict to one resource, e.g. a single workflow id.'),
	beforeId: z
		.number()
		.int()
		.optional()
		.describe('Page backwards — only entries older than this id.'),
	projectId: z
		.string()
		.min(1)
		.optional()
		.describe(
			'Read one project instead of every project you can see. Obtain it from search_projects. Read-only, so it narrows what you can already see rather than widening it.',
		),
	limit: createLimitSchema(MAX_RESULTS),
} satisfies z.ZodRawShape;

const listOutputSchema = {
	entries: z.array(entrySchema).describe('Matching log entries, newest first'),
	count: z.number().int().min(0).describe('Number of entries returned'),
	hasMore: z
		.boolean()
		.describe(
			'The log holds more below this page. A short or empty page can still have more below it, so do not read one as "nothing has happened" while this is true.',
		),
	nextBeforeId: z
		.number()
		.int()
		.optional()
		.describe(
			'Pass this back as beforeId to read the next page. Present whenever hasMore is true, including when this page returned no entries.',
		),
} satisfies z.ZodRawShape;

const expandInputSchema = {
	id: z.number().int().describe('The entry id, as returned by get_instance_activity.'),
	projectId: z
		.string()
		.min(1)
		.optional()
		.describe('Restrict the lookup to one project. Obtain it from search_projects.'),
} satisfies z.ZodRawShape;

const expandOutputSchema = {
	entry: entrySchema.optional().describe('The entry, absent when the id did not resolve'),
	resourceHistory: z
		.array(entrySchema)
		.optional()
		.describe('Everything else the log holds about the same resource, newest first'),
	liveRecordHint: z
		.string()
		.optional()
		.describe('The tool call that fetches the live record, when one applies'),
	notFound: z
		.boolean()
		.optional()
		.describe(
			'Set when the id no longer resolves. Entries are pruned on a retention window, so this is an ordinary outcome rather than an error — carry on without it.',
		),
} satisfies z.ZodRawShape;

type ListParams = {
	category?: 'workflow' | 'credential';
	resourceId?: string;
	beforeId?: number;
	projectId?: string;
	limit?: number;
};

type ExpandParams = { id: number; projectId?: string };

/**
 * `credentialGranted` reports whether the caller's token carries `credential:read`. The reader
 * treats it as one half of the gate and checks the caller's real access for the other half, so a
 * token scope alone never opens credential history.
 */
const buildScope = (
	projectId: string | undefined,
	credentialGranted: boolean,
): InstanceContextScope => ({
	surface: 'mcp',
	credentialGranted,
	...(projectId !== undefined ? { projectId } : {}),
});

export const createGetInstanceActivityTool = (
	user: User,
	instanceContext: InstanceContextService,
	telemetry: Telemetry,
	options: { credentialGranted: boolean },
): ToolDefinition<typeof listInputSchema> => ({
	name: GET_INSTANCE_ACTIVITY_TOOL_NAME,
	config: {
		description:
			'Read the instance activity log — what has recently been created, changed, published, ' +
			'or deleted in this n8n instance, and who did it. Use it to pick up work already in ' +
			'progress: when the user is vague ("fix it", "carry on", "what should I look at"), the ' +
			'answer is usually the most recent thing here. Returns log entries, not live records — ' +
			'each entry carries the id to pass to search_workflows, get_workflow_details or ' +
			'get_workflow_execution. An entry may name a resource that has since been deleted. ' +
			'Check `hasMore` before concluding a short page is the whole story, and page with `nextBeforeId`.',
		inputSchema: listInputSchema,
		outputSchema: listOutputSchema,
		annotations: {
			title: 'Get Instance Activity',
			readOnlyHint: true,
			destructiveHint: false,
			idempotentHint: true,
			openWorldHint: false,
		},
	},
	handler: async ({ category, resourceId, beforeId, projectId, limit }: ListParams) => {
		const telemetryPayload: UserCalledMCPToolEventPayload = {
			user_id: user.id,
			tool_name: GET_INSTANCE_ACTIVITY_TOOL_NAME,
			parameters: { category, resourceId, beforeId, projectId, limit },
		};

		try {
			// Clamped as well as schema-bounded, as `list_workflow_tags` and `search_workflows` do:
			// this figure sizes a database read, so it should not depend on validation upstream.
			const { entries, hasMore, nextBeforeId } = await instanceContext.listPage({
				user,
				scope: buildScope(projectId, options.credentialGranted),
				limit: Math.min(Math.max(1, limit ?? DEFAULT_LIMIT), MAX_RESULTS),
				...(category !== undefined ? { category } : {}),
				...(resourceId !== undefined ? { resourceId } : {}),
				...(beforeId !== undefined ? { beforeId } : {}),
			});

			const payload = {
				entries,
				count: entries.length,
				hasMore,
				...(nextBeforeId !== undefined ? { nextBeforeId } : {}),
			};

			telemetryPayload.results = { success: true, data: { count: payload.count, hasMore } };
			telemetry.track(USER_CALLED_MCP_TOOL_EVENT, telemetryPayload);

			return {
				content: [{ type: 'text', text: JSON.stringify(payload) }],
				structuredContent: payload,
			};
		} catch (error) {
			telemetryPayload.results = {
				success: false,
				error: error instanceof Error ? error.message : String(error),
			};
			telemetry.track(USER_CALLED_MCP_TOOL_EVENT, telemetryPayload);
			throw error;
		}
	},
});

export const createExpandInstanceActivityTool = (
	user: User,
	instanceContext: InstanceContextService,
	telemetry: Telemetry,
	options: { credentialGranted: boolean },
): ToolDefinition<typeof expandInputSchema> => ({
	name: EXPAND_INSTANCE_ACTIVITY_TOOL_NAME,
	config: {
		description:
			'Open one activity log entry by its id and get everything else the log knows about the ' +
			'same resource — how a workflow got to its current state, at a glance. Returns ' +
			'`notFound` when the id no longer resolves, which pruning makes an ordinary outcome.',
		inputSchema: expandInputSchema,
		outputSchema: expandOutputSchema,
		annotations: {
			title: 'Expand Instance Activity Entry',
			readOnlyHint: true,
			destructiveHint: false,
			idempotentHint: true,
			openWorldHint: false,
		},
	},
	handler: async ({ id, projectId }: ExpandParams) => {
		const telemetryPayload: UserCalledMCPToolEventPayload = {
			user_id: user.id,
			tool_name: EXPAND_INSTANCE_ACTIVITY_TOOL_NAME,
			parameters: { id, projectId },
		};

		try {
			const expansion = await instanceContext.expand({
				id,
				user,
				scope: buildScope(projectId, options.credentialGranted),
			});

			// A pruned id and one the caller may not see answer the same way, so the tool cannot be
			// used to find out what exists outside its scope.
			const payload = expansion
				? {
						entry: expansion.entry,
						resourceHistory: expansion.resourceHistory,
						...(expansion.liveRecordHint ? { liveRecordHint: expansion.liveRecordHint } : {}),
					}
				: { notFound: true };

			telemetryPayload.results = { success: true, data: { found: expansion !== null } };
			telemetry.track(USER_CALLED_MCP_TOOL_EVENT, telemetryPayload);

			return {
				content: [{ type: 'text', text: JSON.stringify(payload) }],
				structuredContent: payload,
			};
		} catch (error) {
			telemetryPayload.results = {
				success: false,
				error: error instanceof Error ? error.message : String(error),
			};
			telemetry.track(USER_CALLED_MCP_TOOL_EVENT, telemetryPayload);
			throw error;
		}
	},
});
