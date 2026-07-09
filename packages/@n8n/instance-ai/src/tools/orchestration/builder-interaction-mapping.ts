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

function mapAskCredentialSuspend(
	input: AskCredentialInput,
	requestId: string,
): Record<string, unknown> {
	return {
		requestId,
		message: input.purpose,
		severity: 'info',
		credentialRequests: [
			{
				credentialType: input.credentialType,
				purpose: input.purpose,
				...(input.nodeType ? { nodeType: input.nodeType } : {}),
			},
		],
		credentialFlow: { stage: 'generic' },
	};
}

/** Confirmation-payload fragment for the orchestrator's `ctx.suspend()`. */
export function mapBuilderSuspendPayload(
	toolName: string,
	suspendPayload: Record<string, unknown>,
	requestId: string,
): Record<string, unknown> {
	if (toolName === ASK_QUESTION_TOOL_NAME) {
		const input = parseSuspendInput(suspendPayload, askQuestionInputSchema);
		if (input) return mapAskQuestionSuspend(input, requestId);
	}

	if (toolName === ASK_CREDENTIAL_TOOL_NAME || toolName === ASK_EMBEDDING_CREDENTIAL_TOOL_NAME) {
		const input = parseSuspendInput(suspendPayload, askCredentialInputSchema);
		if (input) return mapAskCredentialSuspend(input, requestId);
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

function translateAskQuestionResume(
	confirmPayload: Record<string, unknown>,
): BuilderResumeTranslation {
	if (confirmPayload.approved === false) {
		return { ok: true, resumeData: builderCancellationResume('User dismissed the question') };
	}

	const values = firstAnswerValues(confirmPayload);
	if (!values) return { ok: false, reason: 'Confirm payload has no answer values' };

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
	if (toolName === ASK_QUESTION_TOOL_NAME) return translateAskQuestionResume(confirmPayload);

	if (toolName === ASK_CREDENTIAL_TOOL_NAME || toolName === ASK_EMBEDDING_CREDENTIAL_TOOL_NAME) {
		return translateAskCredentialResume(confirmPayload);
	}

	return translateApprovalResume(confirmPayload);
}
