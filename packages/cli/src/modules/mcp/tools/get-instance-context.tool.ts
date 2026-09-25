/**
 * The opening view of an instance: what exists here, what changed lately, and what has run.
 *
 * Instance AI is handed this on every turn. An MCP client has no turn to attach it to, so it is
 * offered three ways at once — as a resource, as this tool, and as a line in the server
 * instructions naming both. The SDK reference beside it settled that shape already: resources
 * reach the clients that read them, the tool reaches the rest, and the instructions are what makes
 * either get called.
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

export const GET_INSTANCE_CONTEXT_TOOL_NAME = 'get_instance_context';
export const INSTANCE_CONTEXT_RESOURCE_URI = 'n8n://instance/context';

/** Said only when the read succeeded and the instance is genuinely empty — never on failure. */
export const EMPTY_INSTANCE_CONTEXT_TEXT = 'Nothing has been built on this instance yet.';

/**
 * Said when the estate exists but none of it is exposed to MCP. `availableInMCP` defaults to
 * withheld, so this is what every instance that predates the setting reports — and it must not be
 * confused with an empty instance, which would send a client off to rebuild what it cannot see.
 */
export const NOTHING_EXPOSED_TEXT =
	'No workflows on this instance are exposed to MCP, so there is nothing to report here. ' +
	'Ask the user to expose one in Settings, under MCP.';

const DESCRIPTION =
	'Read the opening picture of this n8n instance: which workflows exist, what has recently been ' +
	'created, changed or deleted, and what has run and failed. Call it once at the start of a ' +
	'session, before asking the user what they want to do — when they are vague ("fix it", ' +
	'"carry on"), the answer is usually the most recent thing here. Returns prose, not records: ' +
	'pass the workflow ids it names to search_workflows or get_workflow_details, and a bracketed ' +
	'activity id to expand_instance_activity. get_instance_activity pages further back.';

const inputSchema = {
	projectId: z
		.string()
		.min(1)
		.optional()
		.describe(
			'Read one project instead of every project you can see. Obtain it from search_projects.',
		),
} satisfies z.ZodRawShape;

const outputSchema = {
	context: z
		.string()
		.optional()
		.describe('The instance context, as prose. Absent when there is nothing to report.'),
	empty: z
		.boolean()
		.optional()
		.describe('Set when there is nothing to report. Read `nothingExposed` for the reason.'),
	nothingExposed: z
		.boolean()
		.optional()
		.describe(
			'Present when the answer is empty. True means workflows exist here but none are exposed to MCP, so the estate is real and simply out of reach — do not treat it as a fresh instance. False means the instance genuinely holds nothing yet.',
		),
} satisfies z.ZodRawShape;

/**
 * Every read is a fresh snapshot. The delta machinery behind the per-turn block tracks what a
 * thread has already been shown; the MCP server is stateless and has no thread, so there is
 * nothing to track against and nothing to carry forward.
 */
export type InstanceContextRead =
	| { kind: 'context'; text: string }
	/** Nothing exists in scope at all. */
	| { kind: 'empty' }
	/** Things exist, but none of them are exposed to this surface. */
	| { kind: 'withheld' };

export async function readInstanceContext(
	user: User,
	instanceContext: InstanceContextService,
	options: { executionGranted: boolean },
	projectId?: string,
): Promise<InstanceContextRead> {
	const scope = buildScope(options.executionGranted, projectId);
	// Registration has already checked the shared instance flag.
	const built = await instanceContext.buildBlock({ user, scope, cursor: null, enabled: true });
	if (built.state === 'injected') return { kind: 'context', text: built.block };

	// An empty block has two very different causes, and the client acts on them differently.
	return (await instanceContext.hasWithheldWorkflows(user, scope))
		? { kind: 'withheld' }
		: { kind: 'empty' };
}

/** The text a client sees for each outcome. */
export function instanceContextText(read: InstanceContextRead): string {
	if (read.kind === 'context') return read.text;
	return read.kind === 'withheld' ? NOTHING_EXPOSED_TEXT : EMPTY_INSTANCE_CONTEXT_TEXT;
}

const buildScope = (executionGranted: boolean, projectId?: string): InstanceContextScope => ({
	surface: 'mcp',
	executionGranted,
	// Deliberately withheld, not a no-op: the feed does carry credential entries, and the
	// conversation block renders them. No per-call grant reaches this read, so it takes the
	// conservative floor and the block never names a credential.
	credentialGranted: false,
	...(projectId !== undefined ? { projectId } : {}),
});

export const createGetInstanceContextTool = (
	user: User,
	instanceContext: InstanceContextService,
	telemetry: Telemetry,
	options: { executionGranted: boolean },
): ToolDefinition<typeof inputSchema> => ({
	name: GET_INSTANCE_CONTEXT_TOOL_NAME,
	config: {
		description: DESCRIPTION,
		inputSchema,
		outputSchema,
		annotations: {
			title: 'Get Instance Context',
			readOnlyHint: true,
			destructiveHint: false,
			idempotentHint: true,
			openWorldHint: false,
		},
	},
	handler: async ({ projectId }: { projectId?: string }) => {
		const telemetryPayload: UserCalledMCPToolEventPayload = {
			user_id: user.id,
			tool_name: GET_INSTANCE_CONTEXT_TOOL_NAME,
			parameters: { projectId },
		};

		try {
			// A failed read throws rather than answering `empty`. The instructions tell an agent to
			// treat an empty instance as "start from a blank page", so reporting a database failure
			// that way would send it off to rebuild work that already exists.
			const read = await readInstanceContext(user, instanceContext, options, projectId);
			const text = instanceContextText(read);

			const payload =
				read.kind === 'context'
					? { context: text }
					: { empty: true, nothingExposed: read.kind === 'withheld' };

			telemetryPayload.results = {
				success: true,
				data: { empty: read.kind !== 'context', outcome: read.kind },
			};
			telemetry.track(USER_CALLED_MCP_TOOL_EVENT, telemetryPayload);

			return { content: [{ type: 'text', text }], structuredContent: payload };
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

export const INSTANCE_CONTEXT_RESOURCE_DESCRIPTION =
	'What exists on this n8n instance, what changed recently, and what has run. Read this at the ' +
	'start of a session to pick up work already in progress.';
