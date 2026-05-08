import { z } from 'zod';

/**
 * Canonical names of the interactive agent-builder tools.
 *
 * `toolName` is the discriminator on the wire: SSE `toolSuspended` events,
 * persisted tool-call parts, and the FE InteractivePayload union all dispatch
 * by it. There is no separate `interactionType` field — the tool name IS the
 * interaction kind.
 */
export const ASK_LLM_TOOL_NAME = 'ask_llm' as const;
export const ASK_CREDENTIAL_TOOL_NAME = 'ask_credential' as const;
export const ASK_QUESTION_TOOL_NAME = 'ask_question' as const;

export const interactiveToolNameSchema = z.union([
	z.literal(ASK_LLM_TOOL_NAME),
	z.literal(ASK_CREDENTIAL_TOOL_NAME),
	z.literal(ASK_QUESTION_TOOL_NAME),
]);

export type InteractiveToolName = z.infer<typeof interactiveToolNameSchema>;

// ---------------------------------------------------------------------------
// ask_llm
// ---------------------------------------------------------------------------

export const askLlmInputSchema = z.object({
	purpose: z
		.string()
		.optional()
		.describe(
			'Short sentence describing why the model is needed, e.g. "Main LLM for the Slack triage agent"',
		),
});

export const askLlmResumeSchema = z.object({
	provider: z.string(),
	model: z.string(),
	credentialId: z.string(),
	credentialName: z.string(),
});

export type AskLlmInput = z.infer<typeof askLlmInputSchema>;
export type AskLlmResume = z.infer<typeof askLlmResumeSchema>;

// ---------------------------------------------------------------------------
// ask_credential
// ---------------------------------------------------------------------------

export const askCredentialInputSchema = z.object({
	purpose: z.string().describe('One short sentence describing what this credential is used for'),
	nodeType: z
		.string()
		.optional()
		.describe('The n8n node type requiring this credential, e.g. "n8n-nodes-base.slack"'),
	credentialType: z
		.string()
		.describe(
			'The credential type name to request for this slot, e.g. "slackApi". When the slot accepts multiple credential types, pick the single best match (typically the OAuth or first listed type).',
		),
	slot: z.string().optional().describe('Credential slot name on the node, e.g. "slackApi"'),
});

export const askCredentialResumeSchema = z.union([
	z.object({ credentialId: z.string(), credentialName: z.string() }),
	z.object({ skipped: z.literal(true) }),
]);

export type AskCredentialInput = z.infer<typeof askCredentialInputSchema>;
export type AskCredentialResume = z.infer<typeof askCredentialResumeSchema>;

// ---------------------------------------------------------------------------
// ask_question
// ---------------------------------------------------------------------------

export const askQuestionOptionSchema = z.object({
	label: z.string().describe('Display label for this option'),
	value: z.string().describe('Internal value for this option'),
	description: z.string().optional().describe('Optional additional explanation'),
});

export const askQuestionInputSchema = z.object({
	question: z.string().describe('The question to display to the user'),
	options: z
		.array(askQuestionOptionSchema)
		.min(1)
		.describe(
			'Choices to present. With a single option the tool auto-resolves to that option without rendering a card.',
		),
	allowMultiple: z
		.boolean()
		.optional()
		.describe('If true the user may select more than one option; defaults to false'),
});

export const askQuestionResumeSchema = z.object({
	values: z.array(z.string()).min(1),
});

export type AskQuestionOption = z.infer<typeof askQuestionOptionSchema>;
export type AskQuestionInput = z.infer<typeof askQuestionInputSchema>;
export type AskQuestionResume = z.infer<typeof askQuestionResumeSchema>;

// ---------------------------------------------------------------------------
// Discriminated union of all resume payloads (used by AgentBuildResumeDto)
// ---------------------------------------------------------------------------

export const interactiveResumeDataSchema = z.union([
	askLlmResumeSchema,
	askCredentialResumeSchema,
	askQuestionResumeSchema,
]);

export type InteractiveResumeData = z.infer<typeof interactiveResumeDataSchema>;
