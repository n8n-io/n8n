import type { InstanceAiAgentPreviewHandoffContext } from '@n8n/api-types';
import type { User } from '@n8n/db';
import { ForbiddenError } from '@n8n/errors';
import type { Scope } from '@n8n/permissions';
import { UserError } from 'n8n-workflow';

import {
	AGENT_PREVIEW_CONTEXT_CLOSE_TAG,
	AGENT_PREVIEW_CONTEXT_OPEN_TAG,
} from './internal-messages';
import type { AgentSessionDetail } from '@/modules/agents/agent-context.contracts';
import { userHasScopes } from '@/permissions.ee/check-access';

export type AgentTestHandoffResult = {
	block: string;
	/** Always non-empty — session title when set, otherwise `Session #N`. */
	titleFallback: string;
	/** Payload to persist as `instanceAiAgentBuilderTarget` after a successful resolve. */
	target: { agentId: string; projectId: string };
};

const ESCAPED_AGENT_PREVIEW_CONTEXT_OPEN_TAG = '&lt;agent-preview-context&gt;';
const ESCAPED_AGENT_PREVIEW_CONTEXT_CLOSE_TAG = '&lt;/agent-preview-context&gt;';

/** Neutralize delimiter tags in title-derived text placed inside the context block. */
function escapeAgentTestContextDelimiters(value: string): string {
	return value
		.replaceAll(AGENT_PREVIEW_CONTEXT_OPEN_TAG, ESCAPED_AGENT_PREVIEW_CONTEXT_OPEN_TAG)
		.replaceAll(AGENT_PREVIEW_CONTEXT_CLOSE_TAG, ESCAPED_AGENT_PREVIEW_CONTEXT_CLOSE_TAG);
}

/**
 * Resolve an agent-preview handoff reference into an LLM-facing context block.
 * The block is a reference only — it does NOT embed the transcript. The
 * orchestrator reads the transcript on demand via the `get-session` tool, and
 * only changes the agent when the user explicitly asks to edit it.
 * Ownership is enforced by `getThreadDetail`.
 * On success, callers must bind `target` before streaming so the builder tools
 * edit the shared agent. On throw, do not bind.
 */
export async function resolveAgentTestHandoff(
	context: InstanceAiAgentPreviewHandoffContext,
	options: {
		projectId: string;
		userId: string;
		getThreadDetail: (
			threadId: string,
			projectId: string,
			agentId: string,
			userId: string,
		) => Promise<AgentSessionDetail | null>;
	},
): Promise<AgentTestHandoffResult> {
	const detail = await options.getThreadDetail(
		context.threadId,
		options.projectId,
		context.agentId,
		options.userId,
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
	const safeSessionLabel = escapeAgentTestContextDelimiters(sessionLabel);

	const refJson = JSON.stringify({
		source: context.source,
		agentId: context.agentId,
		threadId: context.threadId,
		...(context.executionId ? { executionId: context.executionId } : {}),
		...(context.agentName
			? { agentName: escapeAgentTestContextDelimiters(context.agentName) }
			: {}),
		...(context.agentIcon
			? { agentIcon: escapeAgentTestContextDelimiters(context.agentIcon) }
			: {}),
		...(context.sessionTitle
			? { sessionTitle: escapeAgentTestContextDelimiters(context.sessionTitle) }
			: {}),
	});

	const prose = [
		`The user shared a real preview-chat transcript for agent \`${context.agentId}\` (${safeSessionLabel}).`,
		'Call `get-session` to read the transcript before commenting on the agent.',
		'For review/analysis requests (e.g. "review the tone", "assess behavior"), answer directly from the transcript — do NOT modify the agent.',
		'Only change the agent when the user explicitly asks to update, improve, or fix it. Then load the `agent-builder` skill and call `agent_builder_select_agent` with this `agentId` before any other builder tool.',
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

export async function canAccessAgentTestHandoff(user: User, projectId: string): Promise<boolean> {
	const requiredScopes: Scope[] = ['agent:read', 'agent:update'];
	return await userHasScopes(user, requiredScopes, false, { projectId });
}

export async function assertAgentTestHandoffScopes(user: User, projectId: string): Promise<void> {
	if (!(await canAccessAgentTestHandoff(user, projectId))) {
		throw new ForbiddenError(
			'You do not have permission to load or edit agent previews in this project.',
		);
	}
}
