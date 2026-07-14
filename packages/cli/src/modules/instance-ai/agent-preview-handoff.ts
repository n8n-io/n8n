import type { InstanceAiAgentPreviewHandoffContext } from '@n8n/api-types';
import { UserError } from 'n8n-workflow';

import {
	AGENT_PREVIEW_CONTEXT_CLOSE_TAG,
	AGENT_PREVIEW_CONTEXT_OPEN_TAG,
} from './internal-messages';
import type { AgentExecutionService } from '../agents/agent-execution.service';
import { formatPreviewSessionContext } from '../agents/builder/format-preview-context';

export type AgentPreviewHandoffTarget = {
	agentId: string;
	projectId: string;
};

export type AgentPreviewHandoffResult = {
	block: string;
	/** Always non-empty — session title when set, otherwise `Session #N`. */
	titleFallback: string;
	/** Payload to persist as `instanceAiAgentBuilderTarget` after a successful resolve. */
	target: AgentPreviewHandoffTarget;
};

/**
 * Resolve an agent-preview handoff reference into an LLM-facing context block.
 * Ownership is enforced by `getThreadDetail` (project + agent scoped).
 * On success, callers must bind `target` before streaming so `build-agent`
 * edits the shared agent. On throw, do not bind.
 */
export async function resolveAgentPreviewHandoff(
	context: InstanceAiAgentPreviewHandoffContext,
	options: {
		projectId: string;
		agentsModuleActive: boolean;
		getThreadDetail: AgentExecutionService['getThreadDetail'];
	},
): Promise<AgentPreviewHandoffResult> {
	if (!options.agentsModuleActive) {
		throw new UserError('Agent preview handoff is not available');
	}

	const detail = await options.getThreadDetail(
		context.threadId,
		options.projectId,
		context.agentId,
	);
	if (!detail) {
		throw new UserError('Preview session not found');
	}

	const transcript = formatPreviewSessionContext(
		detail.thread,
		detail.executions,
		context.executionId,
	);
	if (transcript === null) {
		throw new UserError('Preview session turn not found');
	}

	const trimmedTitle = detail.thread.title?.trim() ?? '';
	const titleFallback =
		trimmedTitle.length > 0 ? trimmedTitle : `Session #${detail.thread.sessionNumber}`;
	const sessionLabel =
		trimmedTitle.length > 0
			? `"${trimmedTitle}" (session #${detail.thread.sessionNumber})`
			: `session #${detail.thread.sessionNumber}`;

	const refJson = JSON.stringify({
		source: context.source,
		agentId: context.agentId,
		threadId: context.threadId,
		...(context.executionId ? { executionId: context.executionId } : {}),
	});

	const prose = [
		`The user shared a real preview-chat transcript for agent \`${context.agentId}\` (${sessionLabel}).`,
		'Analyze how the agent behaved and improve its configuration via `build-agent`.',
		'The builder sub-agent cannot see this chat — when you call `build-agent`, pass `agentId` and include the relevant findings from this transcript in `message`.',
	].join('\n');

	const block = [
		AGENT_PREVIEW_CONTEXT_OPEN_TAG,
		refJson,
		'',
		prose,
		'',
		transcript,
		AGENT_PREVIEW_CONTEXT_CLOSE_TAG,
	].join('\n');

	return {
		block,
		titleFallback,
		target: { agentId: context.agentId, projectId: options.projectId },
	};
}
