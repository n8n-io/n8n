import {
	ASK_CREDENTIAL_TOOL_NAME,
	ASK_EMBEDDING_CREDENTIAL_TOOL_NAME,
	ASK_QUESTION_TOOL_NAME,
	askCredentialInputSchema,
	askCredentialResumeSchema,
	askQuestionInputSchema,
	askQuestionResumeSchema,
	type AskCredentialInput,
	type AskQuestionInput,
} from '@n8n/api-types';
import { isRecord } from '@n8n/utils/is-record';
import type { z } from 'zod';

/**
 * Pure translation between the agents-module builder's interactive-tool
 * suspend/resume payloads and instance-AI's confirmation-request protocol.
 * No I/O — the orchestration tool (build-agent) owns the actual suspend/
 * resume calls and just plumbs values through these functions.
 */

export type BuilderResumeTranslation =
	| { ok: true; resumeData: Record<string, unknown> }
	| { ok: false; reason: string };

/**
 * Tool names for the two builder tools injected cli-side only when the builder
 * runs as an instance-AI sub-agent. Source of truth is
 * `BUILDER_EXTRA_TOOL_NAMES` in `packages/cli/src/modules/agents/instance-ai-builder-extra-tools.ts` —
 * instance-ai cannot import from cli, so these mirror that file's string literals.
 */
const CONFIGURE_CHANNEL_TOOL_NAME = 'configure_channel';
const ASK_QUESTIONS_TOOL_NAME = 'ask_questions';

/** Cancellation resume for interactions the builder can't surface yet (e.g. `ask_llm`, until its FE kind ships). */
export function builderCancellationResume(message: string): {
	_type: 'agent.cancellation';
	message: string;
} {
	return { _type: 'agent.cancellation', message };
}

/**
 * The builder's `.suspend(...)` calls embed the tool input directly (no
 * `{ input: ... }` wrapper) — see ask-question.tool.ts / ask-credential.tool.ts.
 * Parse defensively against both shapes in case an intermediate layer nests it.
 */
function parseSuspendInput<T>(
	suspendPayload: Record<string, unknown>,
	schema: z.ZodType<T>,
): T | undefined {
	const direct = schema.safeParse(suspendPayload);
	if (direct.success) return direct.data;

	const nestedInput = suspendPayload.input;
	if (!isRecord(nestedInput)) return undefined;

	const nested = schema.safeParse(nestedInput);
	return nested.success ? nested.data : undefined;
}

/** Array.isArray narrows to `any[]` in lib.es5.d.ts; redeclare with an `unknown[]` predicate. */
function isUnknownArray(value: unknown): value is unknown[] {
	return Array.isArray(value);
}

function toDisplayMessage(value: unknown, fallback: string): string {
	if (typeof value === 'string' && value) return value;
	if (typeof value === 'number' || typeof value === 'boolean') return String(value);
	return fallback;
}

function genericApprovalSuspend(
	suspendPayload: Record<string, unknown>,
	requestId: string,
): Record<string, unknown> {
	return {
		requestId,
		message: toDisplayMessage(suspendPayload.message, 'The agent builder needs your input'),
		severity: 'info',
		inputType: 'approval',
	};
}

function mapAskQuestionSuspend(
	input: AskQuestionInput,
	requestId: string,
): Record<string, unknown> {
	const type = input.allowMultiple ? 'multi' : input.options.length ? 'single' : 'text';
	return {
		requestId,
		message: input.question,
		severity: 'info',
		inputType: 'questions',
		questions: [
			{
				id: 'q1',
				question: input.question,
				type,
				options: input.options.map((option) => option.label),
			},
		],
	};
}

/** Enrichment the orchestration tool can supply — the builder's own suspend payload doesn't carry it. */
export interface AskCredentialSuspendEnrichment {
	existingCredentials?: Array<{ id: string; name: string }>;
}

function mapAskCredentialSuspend(
	input: AskCredentialInput,
	requestId: string,
	enrichment: AskCredentialSuspendEnrichment,
): Record<string, unknown> {
	return {
		requestId,
		message: input.purpose,
		severity: 'info',
		credentialRequests: [
			{
				credentialType: input.credentialType,
				reason: input.purpose,
				existingCredentials: enrichment.existingCredentials ?? [],
			},
		],
		credentialFlow: { stage: 'generic' },
	};
}

/**
 * `configure_channel`'s suspend schema (`configureChannelSuspendSchema` in
 * instance-ai-builder-extra-tools.ts) already matches the FE wire shape 1:1
 * — `message`/`severity`/`channelConfig`/`projectId` — because it was built
 * to reuse `channelConfigSchema` so `InstanceAiChannelSetup`/`map-chunk.ts`'s
 * `channelConfigSchema` parse keep working unchanged. So this only swaps in
 * the orchestrator-side requestId; `channelConfig` must survive byte-for-byte.
 */
function mapConfigureChannelSuspendPayload(
	suspendPayload: Record<string, unknown>,
	requestId: string,
): Record<string, unknown> {
	return { ...suspendPayload, requestId };
}

/**
 * `ask_questions`'s suspend schema (`askQuestionsSuspendSchema` in
 * instance-ai-builder-extra-tools.ts) already carries `inputType: 'questions'`
 * + `questions` in the FE wire shape (the existing questions wizard card), so
 * this only swaps in the orchestrator-side requestId — no reconstruction.
 */
function mapAskQuestionsSuspendPayload(
	suspendPayload: Record<string, unknown>,
	requestId: string,
): Record<string, unknown> {
	return { ...suspendPayload, requestId };
}

/** Confirmation-payload fragment for the orchestrator's `ctx.suspend()`. */
export function mapBuilderSuspendPayload(
	toolName: string,
	suspendPayload: Record<string, unknown>,
	requestId: string,
	enrichment: AskCredentialSuspendEnrichment = {},
): Record<string, unknown> {
	// Both injected tools take precedence over the generic approval fallback —
	// checked unconditionally (no schema-parse-then-fallback) since their
	// suspend payloads are already validated at the tool boundary by `.suspend(schema)`.
	if (toolName === CONFIGURE_CHANNEL_TOOL_NAME) {
		return mapConfigureChannelSuspendPayload(suspendPayload, requestId);
	}

	if (toolName === ASK_QUESTIONS_TOOL_NAME) {
		return mapAskQuestionsSuspendPayload(suspendPayload, requestId);
	}

	if (toolName === ASK_QUESTION_TOOL_NAME) {
		const input = parseSuspendInput(suspendPayload, askQuestionInputSchema);
		if (input) return mapAskQuestionSuspend(input, requestId);
	}

	if (toolName === ASK_CREDENTIAL_TOOL_NAME || toolName === ASK_EMBEDDING_CREDENTIAL_TOOL_NAME) {
		const input = parseSuspendInput(suspendPayload, askCredentialInputSchema);
		if (input) return mapAskCredentialSuspend(input, requestId, enrichment);
	}

	return genericApprovalSuspend(suspendPayload, requestId);
}

function firstAnswerValues(confirmPayload: Record<string, unknown>): string[] | undefined {
	const answers = confirmPayload.answers;
	if (!isUnknownArray(answers) || answers.length === 0) return undefined;

	const [first] = answers;
	if (!isRecord(first)) return undefined;

	const selectedOptions = isUnknownArray(first.selectedOptions)
		? first.selectedOptions.filter((value): value is string => typeof value === 'string')
		: [];
	const customText =
		typeof first.customText === 'string' && first.customText ? [first.customText] : [];
	const values = [...selectedOptions, ...customText];

	return values.length > 0 ? values : undefined;
}

/**
 * `questionsConfirmSchema` (the FE wire DTO) has no top-level `approved` field, so its
 * absence means approved (implicit-approval wire pattern) — only an explicit `false`
 * is a dismissal. A skipped answer, or one with no selected/custom values, is treated
 * as a cancellation rather than a hard failure: the FE questions card lets the user
 * skip a question (see `skipQuestion()`/`goToNextInternal()` in InstanceAiQuestions.vue),
 * which is a legitimate outcome, not a malformed payload.
 */
function translateAskQuestionResume(
	confirmPayload: Record<string, unknown>,
): BuilderResumeTranslation {
	if (confirmPayload.approved === false) {
		return { ok: true, resumeData: builderCancellationResume('User dismissed the question') };
	}

	const answers = confirmPayload.answers;
	if (!isUnknownArray(answers) || answers.length === 0) {
		return { ok: false, reason: 'Confirm payload has no answer values' };
	}

	const [first] = answers;
	const skipped = isRecord(first) && first.skipped === true;
	const values = firstAnswerValues(confirmPayload);
	if (skipped || !values) {
		return { ok: true, resumeData: builderCancellationResume('User skipped the question') };
	}

	const parsed = askQuestionResumeSchema.safeParse({ values });
	if (!parsed.success) return { ok: false, reason: parsed.error.message };
	return { ok: true, resumeData: parsed.data };
}

function translateAskCredentialResume(
	confirmPayload: Record<string, unknown>,
): BuilderResumeTranslation {
	if (confirmPayload.skipped === true || confirmPayload.approved === false) {
		const parsed = askCredentialResumeSchema.safeParse({ skipped: true });
		if (!parsed.success) return { ok: false, reason: parsed.error.message };
		return { ok: true, resumeData: parsed.data };
	}

	const parsed = askCredentialResumeSchema.safeParse({
		credentialId: confirmPayload.credentialId,
		credentialName: confirmPayload.credentialName,
	});
	if (!parsed.success) return { ok: false, reason: parsed.error.message };
	return { ok: true, resumeData: parsed.data };
}

/**
 * `configure_channel`'s FE card (`InstanceAiChannelSetup.vue`'s `submitConfirmation`)
 * always confirms with `{ kind: 'approval', approved }`, which `toConfirmationData`
 * (cli instance-ai.service.ts ~L320) passes straight through as `{ approved }`.
 * A dismissal/closed-card default (`cancelledConfirmation` in run-state-registry.ts)
 * is also `{ approved: false }`. Default to `false` for a missing/non-boolean field
 * too, matching the cli tool's `configureChannelResumeSchema` (non-optional `approved`).
 */
function translateConfigureChannelResume(
	confirmPayload: Record<string, unknown>,
): BuilderResumeTranslation {
	return { ok: true, resumeData: { approved: confirmPayload.approved === true } };
}

/**
 * VERIFIED FE ANSWER SHAPE (read, not assumed — see `questionsConfirmSchema` in
 * `@n8n/api-types/dto/instance-ai/instance-ai-confirm-request.dto.ts`):
 * the FE questions wizard submits `{ kind: 'questions', answers: [{ questionId,
 * selectedOptions, customText?, skipped? }] }`. `toConfirmationData` (cli
 * instance-ai.service.ts ~L318-329) flattens this to `{ approved: true, answers }`;
 * a dismissal collapses to `{ approved: false }` with no `answers` key (resumeData
 * spread ~L4222-4231, which only adds `answers` `...(data.answers ? {...} : {})`).
 * The cli-injected `ask_questions` tool's resume schema is exactly
 * `{ approved?: boolean, answers?: unknown[] }` and does its own per-answer
 * `isRecord`/`questionId` handling (instance-ai-builder-extra-tools.ts), so this
 * passes the confirm payload through unchanged instead of re-deriving fields.
 */
function translateAskQuestionsResume(confirmPayload: unknown): BuilderResumeTranslation {
	if (!isRecord(confirmPayload)) {
		return { ok: false, reason: 'Confirm payload is not an object' };
	}
	return { ok: true, resumeData: confirmPayload };
}

function translateApprovalResume(
	confirmPayload: Record<string, unknown>,
): BuilderResumeTranslation {
	if (typeof confirmPayload.approved !== 'boolean') {
		return { ok: false, reason: 'Confirm payload missing a boolean `approved` field' };
	}
	return { ok: true, resumeData: { approved: confirmPayload.approved } };
}

/** Translate the instance-AI confirm response into the builder tool's resume shape. */
export function translateConfirmToBuilderResume(
	toolName: string,
	confirmPayload: Record<string, unknown>,
): BuilderResumeTranslation {
	// Both injected tools take precedence over the generic approval fallback.
	if (toolName === CONFIGURE_CHANNEL_TOOL_NAME) {
		return translateConfigureChannelResume(confirmPayload);
	}

	if (toolName === ASK_QUESTIONS_TOOL_NAME) {
		return translateAskQuestionsResume(confirmPayload);
	}

	if (toolName === ASK_QUESTION_TOOL_NAME) return translateAskQuestionResume(confirmPayload);

	if (toolName === ASK_CREDENTIAL_TOOL_NAME || toolName === ASK_EMBEDDING_CREDENTIAL_TOOL_NAME) {
		return translateAskCredentialResume(confirmPayload);
	}

	return translateApprovalResume(confirmPayload);
}
