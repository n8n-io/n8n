import type { InstanceAiAgentPreviewHandoffContext } from '@n8n/api-types';
import { UserError } from 'n8n-workflow';

import {
	AGENT_PREVIEW_CONTEXT_CLOSE_TAG,
	AGENT_PREVIEW_CONTEXT_OPEN_TAG,
} from './internal-messages';
import type { AgentExecutionService } from '../agents/agent-execution.service';

export type AgentPreviewHandoffResult = {
	block: string;
	/** Always non-empty — session title when set, otherwise `Session #N`. */
	titleFallback: string;
	/** Payload to persist as `instanceAiAgentBuilderTarget` after a successful resolve. */
	target: { agentId: string; projectId: string };
};

const ESCAPED_AGENT_PREVIEW_CONTEXT_OPEN_TAG = '&lt;agent-preview-context&gt;';
const ESCAPED_AGENT_PREVIEW_CONTEXT_CLOSE_TAG = '&lt;/agent-preview-context&gt;';

/** Neutralize delimiter tags in title-derived text placed inside the context block. */
function escapeAgentPreviewContextDelimiters(value: string): string {
	return value
		.replaceAll(AGENT_PREVIEW_CONTEXT_OPEN_TAG, ESCAPED_AGENT_PREVIEW_CONTEXT_OPEN_TAG)
		.replaceAll(AGENT_PREVIEW_CONTEXT_CLOSE_TAG, ESCAPED_AGENT_PREVIEW_CONTEXT_CLOSE_TAG);
}

/**
 * Resolve an agent-preview handoff reference into an LLM-facing context block.
 * The block is a reference only — it does NOT embed the transcript. The
 * orchestrator reads the transcript on demand via the `get-session` tool, and
 * only calls `build-agent` when the user explicitly asks to edit the agent.
 * Ownership is enforced by `getThreadDetail` (project + agent scoped).
 * On success, callers must bind `target` before streaming so `build-agent`
 * edits the shared agent. On throw, do not bind.
 */
export async function resolveAgentPreviewHandoff(
	context: InstanceAiAgentPreviewHandoffContext,
	options: {
		projectId: string;
		getThreadDetail: AgentExecutionService['getThreadDetail'];
	},
): Promise<AgentPreviewHandoffResult> {
	const detail = await options.getThreadDetail(
		context.threadId,
		options.projectId,
		context.agentId,
	);
	if (!detail) {
		throw new UserError('Preview session not found');
	}
	if (
		context.executionId &&
		!detail.executions.some((execution) => execution.id === context.executionId)
	) {
		throw new UserError('Preview session turn not found');
	}

	const trimmedTitle = detail.thread.title?.trim() ?? '';
	const titleFallback =
		trimmedTitle.length > 0 ? trimmedTitle : `Session #${detail.thread.sessionNumber}`;
	const sessionLabel =
		trimmedTitle.length > 0
			? `"${trimmedTitle}" (session #${detail.thread.sessionNumber})`
			: `session #${detail.thread.sessionNumber}`;
	const safeSessionLabel = escapeAgentPreviewContextDelimiters(sessionLabel);

	const refJson = JSON.stringify({
		source: context.source,
		agentId: context.agentId,
		threadId: context.threadId,
		...(context.executionId ? { executionId: context.executionId } : {}),
		...(context.agentName
			? { agentName: escapeAgentPreviewContextDelimiters(context.agentName) }
			: {}),
		...(context.agentIcon
			? { agentIcon: escapeAgentPreviewContextDelimiters(context.agentIcon) }
			: {}),
		...(context.sessionTitle
			? { sessionTitle: escapeAgentPreviewContextDelimiters(context.sessionTitle) }
			: {}),
	});

	const prose = [
		`The user shared a real preview-chat transcript for agent \`${context.agentId}\` (${safeSessionLabel}).`,
		'Call `get-session` to read the transcript before commenting on the agent.',
		'For review/analysis requests (e.g. "review the tone", "assess behavior"), answer directly from the transcript — do NOT modify the agent.',
		'Only call `build-agent` when the user explicitly asks to update, improve, or fix the agent. The builder sub-agent cannot see this chat — pass `agentId` and the relevant findings from the transcript in `message`.',
	].join('\n');

	const block = [
		AGENT_PREVIEW_CONTEXT_OPEN_TAG,
		refJson,
		'',
		prose,
		AGENT_PREVIEW_CONTEXT_CLOSE_TAG,
	].join('\n');

	return {
		block,
		titleFallback,
		target: { agentId: context.agentId, projectId: options.projectId },
	};
}
