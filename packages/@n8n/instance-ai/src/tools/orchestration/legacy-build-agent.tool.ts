/**
 * Handler for the removed `build-agent` tool. Stored checkpoints can still hold
 * a suspended call to it, and the runtime looks a resumed call up by its name.
 * Without this handler, the user's answer to an open card fails the run. The
 * model can also copy a call from an older conversation, so that call gets
 * directions to the current tools.
 */
import type { BuiltTool, InterruptibleToolContext, ToolContext } from '@n8n/agents';
import { AGENT_BUILDER_TOOL_NAMES, getLegacyBuilderToolNames } from '@n8n/api-types';
import { z } from 'zod';

const passthroughSchema = z.object({}).passthrough();

const suspendedTargetSchema = z.object({
	builderCheckpoint: z.object({
		target: z.object({ agentId: z.string(), name: z.string().optional() }).optional(),
	}),
});

const REMOVED_TOOL_ERROR =
	'`build-agent` no longer exists. Do not call it again. Select the Agent with ' +
	'`agent_builder_select_agent`, passing the `agentRef` or `agentId` from an earlier ' +
	'result for an existing Agent. Then read its config with `agent-context` and change it ' +
	'with the `agent_builder_*` tools.';

const UNAPPLIED_ANSWER_ERROR =
	'The Agent Builder changed while this question was open, so the answer was not applied. ' +
	"`userResponse` holds the user's answer. Select the agent with `agent_builder_select_agent`, " +
	'then apply the answer with the `agent_builder_*` tools.';

function resumeDataOf(ctx: ToolContext | InterruptibleToolContext): unknown {
	return 'resumeData' in ctx ? ctx.resumeData : undefined;
}

function suspendedTargetOf(ctx: ToolContext | InterruptibleToolContext) {
	if (!('suspendPayload' in ctx)) return undefined;
	const parsed = suspendedTargetSchema.safeParse(ctx.suspendPayload);
	return parsed.success ? parsed.data.builderCheckpoint.target : undefined;
}

/**
 * The tool has no input schema, so the runtime never offers it to the model.
 * It still resolves the stored names on resume.
 */
export function createLegacyBuildAgentTool(): BuiltTool {
	return {
		name: AGENT_BUILDER_TOOL_NAMES.BUILD_AGENT,
		legacyNames: getLegacyBuilderToolNames(AGENT_BUILDER_TOOL_NAMES.BUILD_AGENT),
		description: 'Removed. Use `agent_builder_select_agent` and the `agent_builder_*` tools.',
		suspendSchema: passthroughSchema,
		resumeSchema: passthroughSchema,
		handler: async (_input, ctx) => {
			const resumeData = resumeDataOf(ctx);
			if (resumeData === undefined || resumeData === null) {
				return await Promise.resolve({ ok: false, error: REMOVED_TOOL_ERROR });
			}
			const target = suspendedTargetOf(ctx);
			return await Promise.resolve({
				ok: false,
				error: UNAPPLIED_ANSWER_ERROR,
				userResponse: resumeData,
				...(target ? { agentId: target.agentId } : {}),
				...(target?.name ? { agentName: target.name } : {}),
			});
		},
	};
}
