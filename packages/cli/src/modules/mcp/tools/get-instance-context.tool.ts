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

import type { InstanceContextService } from '@/modules/instance-ai/instance-context.service';
import type { Telemetry } from '@/telemetry';

import { USER_CALLED_MCP_TOOL_EVENT } from '../mcp.constants';
import type { ToolDefinition, UserCalledMCPToolEventPayload } from '../mcp.types';

export const GET_INSTANCE_CONTEXT_TOOL_NAME = 'get_instance_context';
export const INSTANCE_CONTEXT_RESOURCE_URI = 'n8n://instance/context';

const DESCRIPTION =
	'Read the opening picture of this n8n instance: which workflows exist, what has recently been ' +
	'created, changed or deleted, and what has run and failed. Call it once at the start of a ' +
	'session, before asking the user what they want to do — when they are vague ("fix it", ' +
	'"carry on"), the answer is usually the most recent thing here. Returns prose, not records: ' +
	'use search_workflows, get_workflow_details or get_instance_activity with the ids it names.';

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
		.describe(
			'Set when this instance has nothing to show yet — no workflows, no recent changes, no runs. A fresh instance, not an error.',
		),
} satisfies z.ZodRawShape;

/**
 * Every read is a fresh snapshot. The delta machinery behind the per-turn block tracks what a
 * thread has already been shown; the MCP server is stateless and has no thread, so there is
 * nothing to track against and nothing to carry forward.
 */
export async function readInstanceContext(
	user: User,
	instanceContext: InstanceContextService,
	projectId?: string,
): Promise<string | null> {
	const built = await instanceContext.buildBlock({
		user,
		scope: {
			surface: 'mcp',
			// The block names workflows and runs, never credentials, so the credential grant does
			// not change what it can say.
			credentialGranted: false,
			...(projectId !== undefined ? { projectId } : {}),
		},
		cursor: null,
	});

	return built?.block ?? null;
}

export const createGetInstanceContextTool = (
	user: User,
	instanceContext: InstanceContextService,
	telemetry: Telemetry,
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
			const context = await readInstanceContext(user, instanceContext, projectId);
			const payload = context === null ? { empty: true } : { context };

			telemetryPayload.results = { success: true, data: { empty: context === null } };
			telemetry.track(USER_CALLED_MCP_TOOL_EVENT, telemetryPayload);

			return {
				content: [
					{ type: 'text', text: context ?? 'Nothing has been built on this instance yet.' },
				],
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

export const INSTANCE_CONTEXT_RESOURCE_DESCRIPTION =
	'What exists on this n8n instance, what changed recently, and what has run. Read this at the ' +
	'start of a session to pick up work already in progress.';
