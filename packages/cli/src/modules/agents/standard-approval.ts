import { isDeepStrictEqual } from 'node:util';
import type { SerializableAgentState } from '@n8n/agents';
import {
	APPROVAL_RESUME_SCHEMA,
	APPROVAL_SUSPEND_SCHEMA,
	type ApprovalSuspendPayload,
} from '@n8n/agents/tool';
import { zodToJsonSchema } from '@n8n/ai-utilities/json-schema';
import { z } from 'zod';

/**
 * The resume schemas of a standard approval. The second one adds the optional
 * `reason` that the schema had for a short time, so an approval that a run
 * suspended on then still counts.
 */
const approvalResumeJsonSchemas = [
	zodToJsonSchema(APPROVAL_RESUME_SCHEMA),
	zodToJsonSchema(APPROVAL_RESUME_SCHEMA.extend({ reason: z.string().optional() })),
];

/**
 * Returns the payload of a plain approval: approve or deny, and nothing else to
 * answer. A tool that also asks for its own input has another resume schema.
 */
export function parseStandardApprovalSuspension(suspension: {
	suspendPayload?: unknown;
	resumeSchema?: unknown;
}): ApprovalSuspendPayload | undefined {
	const payload = APPROVAL_SUSPEND_SCHEMA.safeParse(suspension.suspendPayload);
	if (
		!payload.success ||
		!approvalResumeJsonSchemas.some((schema) => isDeepStrictEqual(suspension.resumeSchema, schema))
	) {
		return undefined;
	}
	return payload.data;
}

/**
 * Returns the standard approval that a checkpoint waits for on this tool call,
 * if the checkpoint belongs to the expected conversation.
 */
export function findPendingStandardApproval(
	checkpoint: SerializableAgentState | undefined,
	expected: { runId: string; toolCallId: string; threadId: string; resourceId: string },
): ApprovalSuspendPayload | undefined {
	const pending = checkpoint?.pendingToolCalls[expected.toolCallId];
	const persistence = checkpoint?.persistence;
	if (
		checkpoint?.status !== 'suspended' ||
		persistence?.delegated === true ||
		persistence?.threadId !== expected.threadId ||
		persistence?.resourceId !== expected.resourceId ||
		!pending?.suspended ||
		pending.runId !== expected.runId
	) {
		return undefined;
	}
	return parseStandardApprovalSuspension(pending);
}
