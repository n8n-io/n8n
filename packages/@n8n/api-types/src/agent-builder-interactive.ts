import { z } from 'zod';

import {
	ASK_QUESTIONS_TOOL_NAME,
	CONFIGURE_CHANNEL_TOOL_NAME,
} from './agents/agent-interaction.schema';

/**
 * Canonical names of the interactive agent-builder tools.
 *
 * `toolName` is the discriminator on the wire: SSE `toolSuspended` events,
 * persisted tool-call parts, and the FE InteractivePayload union all dispatch
 * by it. There is no separate `interactionType` field — the tool name IS the
 * interaction kind.
 */
export const ASK_CREDENTIAL_TOOL_NAME = 'ask_credential' as const;
export const ASK_EMBEDDING_CREDENTIAL_TOOL_NAME = 'ask_embedding_credential' as const;
export { ASK_QUESTIONS_TOOL_NAME, CONFIGURE_CHANNEL_TOOL_NAME };
/**
 * Frontend-only discriminator for generic approval cards.
 *
 * Approval suspensions keep the underlying tool name on the wire, so the FE
 * maps them to this value before dispatching to the approval card component.
 */
export const APPROVAL_TOOL_NAME = 'approval' as const;

export const interactiveToolNameSchema = z.union([
	z.literal(ASK_CREDENTIAL_TOOL_NAME),
	z.literal(ASK_EMBEDDING_CREDENTIAL_TOOL_NAME),
	z.literal(ASK_QUESTIONS_TOOL_NAME),
	z.literal(CONFIGURE_CHANNEL_TOOL_NAME),
]);

export type InteractiveToolName = z.infer<typeof interactiveToolNameSchema>;

// ---------------------------------------------------------------------------
// ask_credential
// ---------------------------------------------------------------------------

export const askCredentialInputSchema = z.object({
	purpose: z.string().describe('One short sentence describing what this credential is used for'),
	nodeType: z
		.string()
		.optional()
		.describe('The n8n node type requiring this credential, e.g. "n8n-nodes-base.slack"'),
	credentialType: z.string().describe('The credential type name to request, e.g. "slackApi"'),
	credentialSlot: z
		.string()
		.optional()
		.describe('Credential key on node.credentials, e.g. "slackApi"'),
});

export type AskCredentialInput = z.infer<typeof askCredentialInputSchema>;

/**
 * Suspend/resume for `ask_credential` and `ask_embedding_credential` now use
 * the shared instance-AI-compatible contract (`agents/agent-interaction.schema.ts`,
 * re-exported below) instead of a builder-only shape — see that module for
 * the full suspend payload (`credentialSuspendPayloadSchema`).
 */

// ---------------------------------------------------------------------------
// Cancellation
// ---------------------------------------------------------------------------

export const cancellationResumeSchema = z.object({
	_type: z.literal('agent.cancellation'),
	message: z.string().min(1),
});

export type CancellationResumeData = z.infer<typeof cancellationResumeSchema>;
