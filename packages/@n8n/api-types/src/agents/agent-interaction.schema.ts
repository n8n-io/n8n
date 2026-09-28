import { z } from 'zod';

import { channelConfigSchema, credentialRequestSchema } from '../schemas/instance-ai.schema';

/**
 * Shared interaction contract between the agents-module builder (its own UI
 * chat) and instance AI (running the builder as a sub-agent). Both surfaces
 * suspend/resume with exactly these shapes — no per-surface translation.
 *
 * The tool name is the discriminator on the wire (see
 * `agent-builder-interactive.ts`'s doc comment); these schemas cover the
 * three tools whose suspend/resume payload matches instance-AI's own
 * confirmation-request/confirm-response wire contract:
 * `user_questions_ask`, `credential_ask`/`embedding_credential_ask`, and
 * `channel_configure`.
 */

export const ASK_QUESTIONS_TOOL_NAME = 'user_questions_ask' as const;
export const CONFIGURE_CHANNEL_TOOL_NAME = 'channel_configure' as const;

/**
 * Stable code on `BuilderNotConfiguredError` (`packages/cli/src/modules/agents/builder/errors.ts`)
 * so callers that can't import that class directly (e.g. instance AI) can
 * still detect the unconfigured state by matching the thrown error's `code`.
 */
export const BUILDER_NOT_CONFIGURED_CODE = 'BUILDER_NOT_CONFIGURED' as const;

/**
 * Stable code on `BuilderCheckpointUnavailableError`
 * (`packages/cli/src/modules/agents/builder/errors.ts`), thrown by
 * `AgentsBuilderService.resumeBuild` when the checkpoint being resumed has
 * expired or no longer exists. Pinned here so
 * `isBuilderCheckpointUnavailableError` in instance AI's `build-agent.tool.ts`
 * can detect the state by matching the thrown error's `code`.
 */
export const BUILDER_CHECKPOINT_UNAVAILABLE_CODE = 'BUILDER_CHECKPOINT_UNAVAILABLE' as const;

/**
 * Agent-builder tools whose success should set `configUpdated` on `agent_build`
 * (refresh the agent artifact preview). Includes config writers and publish
 * lifecycle tools. Values must match `BUILDER_TOOLS` in
 * `packages/cli/src/modules/agents/builder/builder-tool-names.ts`.
 */
export const CONFIG_MUTATION_TOOL_NAMES = [
	'config_write',
	'config_patch',
	'agent_publish',
	'agent_unpublish',
] as const;

// ---------------------------------------------------------------------------
// user_questions_ask
// ---------------------------------------------------------------------------

export const interactionQuestionSchema = z.object({
	id: z.string(),
	question: z.string(),
	type: z.enum(['single', 'multi', 'text']),
	options: z.array(z.string()).optional(),
});
export type InteractionQuestion = z.infer<typeof interactionQuestionSchema>;

export const questionsSuspendPayloadSchema = z.object({
	requestId: z.string(),
	message: z.string(),
	severity: z.literal('info'),
	inputType: z.literal('questions'),
	questions: z.array(interactionQuestionSchema),
	introMessage: z.string().optional(),
});
export type QuestionsSuspendPayload = z.infer<typeof questionsSuspendPayloadSchema>;

/** One answered (or explicitly skipped) question — mirrors `questionsConfirmSchema`'s answer shape 1:1. */
export const questionAnswerSchema = z.object({
	questionId: z.string(),
	selectedOptions: z.array(z.string()),
	customText: z.string().optional(),
	skipped: z.boolean().optional(),
});
export type QuestionAnswer = z.infer<typeof questionAnswerSchema>;

/**
 * `approved` has no top-level meaning on the FE's own questions wire DTO
 * (`questionsConfirmSchema`) — it only appears when `toConfirmationData`
 * flattens a dismissal to `{ approved: false }` with no `answers`. Optional
 * here so both shapes parse.
 */
export const questionsResumeSchema = z.object({
	approved: z.boolean().optional(),
	answers: z.array(questionAnswerSchema).optional(),
});
export type QuestionsResumeData = z.infer<typeof questionsResumeSchema>;

// ---------------------------------------------------------------------------
// credential_ask / embedding_credential_ask
// ---------------------------------------------------------------------------

export const credentialSuspendPayloadSchema = z.object({
	requestId: z.string(),
	message: z.string(),
	severity: z.literal('info'),
	credentialRequests: z.array(credentialRequestSchema).min(1),
	credentialFlow: z.object({ stage: z.literal('generic') }),
	// Scopes the FE credential picker to the builder's project — without it the
	// picker falls back to the user's personal project.
	projectId: z.string().optional(),
});
export type CredentialSuspendPayload = z.infer<typeof credentialSuspendPayloadSchema>;

/**
 * Union mirrors every shape the FE's credential-selection confirm DTO can
 * collapse to: a selection (`{ credentials }`), an explicit denial
 * (`{ approved: false }`), or a dismissal (`{ skipped: true }`).
 */
export const credentialResumeSchema = z.union([
	z.object({ credentials: z.record(z.string()) }),
	z.object({ approved: z.literal(false) }),
	z.object({ skipped: z.literal(true) }),
]);
export type CredentialResumeData = z.infer<typeof credentialResumeSchema>;

// ---------------------------------------------------------------------------
// channel_configure
// ---------------------------------------------------------------------------

export const channelSuspendPayloadSchema = z.object({
	requestId: z.string(),
	message: z.string(),
	severity: z.literal('info'),
	channelConfig: channelConfigSchema,
	projectId: z.string(),
});
export type ChannelSuspendPayload = z.infer<typeof channelSuspendPayloadSchema>;

export const channelResumeSchema = z.object({
	approved: z.boolean(),
});
export type ChannelResumeData = z.infer<typeof channelResumeSchema>;
