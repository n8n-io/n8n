import {
	assertSubAgentTaskPath,
	type ApprovalResumePayload,
	type SerializableAgentState,
} from '@n8n/agents';
import { SUB_AGENT_TASK_DIFFICULTIES } from '@n8n/api-types';
import { z } from 'zod';

import { isIntegrationMessageContext } from '../integrations/integration-message-context';
import type { IntegrationMessageContext } from '../integrations/integration-tool-types';

export const BACKGROUND_SUB_AGENT_METADATA_KEY = 'n8nBackgroundSubAgent';
export const BACKGROUND_APPROVAL_RUN_PREFIX = 'background-job-';
export const PARENT_TASK_CANCELLED_REASON = new DOMException('Parent task cancelled', 'AbortError');

export function parseBackgroundApprovalAction(actionId: string) {
	const match = /^bg:([a-f\d-]{36}):([\w-]{22}):([01s])$/i.exec(actionId);
	if (!match) return undefined;
	const decision = match[3].toLowerCase();
	const resumeData: ApprovalResumePayload = { approved: decision !== '0' };
	if (decision === 's') resumeData.scope = 'session';
	return {
		runId: `${BACKGROUND_APPROVAL_RUN_PREFIX}${match[1]}`,
		toolCallId: match[2],
		resumeData,
	};
}

const backgroundStateSchema = z.object({
	jobId: z.string().min(1),
	taskPath: z.string(),
	resumeContext: z.object({ agentId: z.string().min(1), versionId: z.string().min(1).optional() }),
	difficulty: z.enum(SUB_AGENT_TASK_DIFFICULTIES).optional(),
	sharedWorkspace: z.boolean(),
	messageContext: z.custom<IntegrationMessageContext>(isIntegrationMessageContext).nullable(),
});

export function readBackgroundSubAgentState(checkpoint: SerializableAgentState) {
	const parsed = backgroundStateSchema.safeParse(
		checkpoint.persistence?.hostMetadata?.[BACKGROUND_SUB_AGENT_METADATA_KEY],
	);
	if (!parsed.success) return undefined;
	const { taskPath } = parsed.data;
	try {
		assertSubAgentTaskPath(taskPath);
	} catch {
		return undefined;
	}
	return { ...parsed.data, taskPath };
}
