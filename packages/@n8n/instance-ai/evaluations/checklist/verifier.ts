import type { Message, StreamChunk } from '@n8n/agents';
import { z } from 'zod';

import {
	EPHEMERAL_CACHE,
	createEvalAgent,
	resolveEvalModelConfig,
} from '../../src/utils/eval-agents';
import type { VerificationArtifact } from '../harness/runner';
import { MOCK_EXECUTION_VERIFY_PROMPT } from '../system-prompts/mock-execution-verify';
import type { ChecklistItem, ChecklistResult } from '../types';

// ---------------------------------------------------------------------------
// Structured output schema
// ---------------------------------------------------------------------------

const checklistResultSchema = z.object({
	results: z.array(
		z.object({
			id: z.number(),
			pass: z.boolean(),
			reasoning: z.string(),
			failureCategory: z.string().nullable().optional(),
			rootCause: z.string().nullable().optional(),
		}),
	),
});

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/** Escalating per-attempt caps: stalls fail fast and retry, genuinely slow verifies get room. */
export const VERIFY_ATTEMPT_TIMEOUTS_MS = [60_000, 120_000, 240_000];
/** Abort when the stream goes silent for this long AFTER its first chunk (agents path only).
 *  Pre-first-chunk time is bounded by the attempt cap, not this window. */
export const VERIFY_INACTIVITY_TIMEOUT_MS = 45_000;
const VERIFIER_DEBUG = process.env.N8N_EVAL_VERIFIER_DEBUG === '1';

function jitteredPauseMs(attempt: number): number {
	return 1_000 * attempt + Math.random() * 1_000;
}

async function sleep(ms: number): Promise<void> {
	await new Promise((resolve) => setTimeout(resolve, ms));
}

export interface VerifierAttemptDebug {
	attempt: number;
	status: 'threw' | 'model_error' | 'no_parseable_results' | 'success';
	error: string | null;
	finishReason: unknown;
	usage: unknown;
	hasStructuredOutput: boolean;
	structuredOutput: z.infer<typeof checklistResultSchema> | null;
	assistantText: string;
	parsedResultsCount: number;
	acceptedResultsCount: number;
}

export interface VerifyChecklistResult {
	results: ChecklistResult[];
	attempts: VerifierAttemptDebug[];
}

function parseStructuredOutputFromText(
	text: string,
): z.infer<typeof checklistResultSchema> | undefined {
	const trimmed = text.trim();
	if (trimmed.length === 0) return undefined;

	try {
		const parsed: unknown = JSON.parse(trimmed);
		const validated = checklistResultSchema.safeParse(parsed);
		return validated.success ? validated.data : undefined;
	} catch {
		return undefined;
	}
}

function buildChecklistResults(
	parsed: z.infer<typeof checklistResultSchema> | undefined,
	validIds: Set<number>,
): ChecklistResult[] {
	const results: ChecklistResult[] = [];

	if (!parsed?.results) return results;

	for (const entry of parsed.results) {
		if (typeof entry.id === 'number' && typeof entry.pass === 'boolean' && validIds.has(entry.id)) {
			results.push({
				id: entry.id,
				pass: entry.pass,
				reasoning: entry.reasoning ?? '',
				strategy: 'llm',
				failureCategory:
					entry.failureCategory ?? (!entry.pass ? 'verification_failure' : undefined),
				rootCause: entry.rootCause ?? undefined,
			});
		}
	}

	return results;
}

function logVerifierDebug(label: string, payload?: unknown): void {
	if (!VERIFIER_DEBUG) return;

	if (payload === undefined) {
		console.warn(`[verifier-debug] ${label}`);
		return;
	}

	console.warn(`[verifier-debug] ${label}: ${JSON.stringify(payload, null, 2)}`);
}

function getOpenAiResponsesUrl(baseUrl?: string): string {
	const trimmedBaseUrl = baseUrl?.trim();
	const base = (
		trimmedBaseUrl && trimmedBaseUrl.length > 0 ? trimmedBaseUrl : 'https://api.openai.com/v1'
	).replace(/\/+$/, '');
	return `${base}/responses`;
}

function asRecord(value: unknown): Record<string, unknown> | undefined {
	return value && typeof value === 'object' && !Array.isArray(value)
		? (value as Record<string, unknown>)
		: undefined;
}

function extractOpenAiAssistantText(response: unknown): string {
	const responseRecord = asRecord(response);
	if (!responseRecord) return '';

	const output = responseRecord.output;
	if (!Array.isArray(output)) return '';

	const texts: string[] = [];
	for (const item of output) {
		const itemRecord = asRecord(item);
		if (itemRecord?.type !== 'message') continue;
		const content = itemRecord.content;
		if (!Array.isArray(content)) continue;
		for (const part of content) {
			const partRecord = asRecord(part);
			if (partRecord?.type !== 'output_text' || !('text' in partRecord)) continue;
			const text = partRecord.text;
			texts.push(typeof text === 'string' ? text : JSON.stringify(text));
		}
	}

	return texts.join('');
}

export function supportsOpenAiReasoning(modelId: string): boolean {
	const normalized = modelId.trim().toLowerCase();
	return /^(gpt-5(?:$|[-.])|o[1-9](?:$|[-.]))/.test(normalized);
}

async function runNativeOpenAiVerifier(
	userMessage: string,
	abortSignal: AbortSignal,
): Promise<{
	finishReason: unknown;
	usage: unknown;
	assistantText: string;
	parsed: z.infer<typeof checklistResultSchema> | undefined;
}> {
	const model = resolveEvalModelConfig();
	const requestBody = {
		model: model.providerModelId,
		...(supportsOpenAiReasoning(model.providerModelId) ? { reasoning: { effort: 'high' } } : {}),
		input: [
			{
				role: 'developer',
				content: MOCK_EXECUTION_VERIFY_PROMPT,
			},
			{
				role: 'user',
				content: [
					{
						type: 'input_text',
						text: userMessage,
					},
				],
			},
		],
		text: {
			format: {
				type: 'json_schema',
				strict: true,
				name: 'response',
				schema: {
					type: 'object',
					properties: {
						results: {
							type: 'array',
							items: {
								type: 'object',
								properties: {
									id: { type: 'number' },
									pass: { type: 'boolean' },
									reasoning: { type: 'string' },
									failureCategory: { type: ['string', 'null'] },
									rootCause: { type: ['string', 'null'] },
								},
								required: ['id', 'pass', 'reasoning', 'failureCategory', 'rootCause'],
								additionalProperties: false,
							},
						},
					},
					required: ['results'],
					additionalProperties: false,
					$schema: 'http://json-schema.org/draft-07/schema#',
				},
			},
		},
	};
	const response = await fetch(getOpenAiResponsesUrl(model.url), {
		method: 'POST',
		headers: {
			Authorization: `Bearer ${model.apiKey}`,
			'Content-Type': 'application/json',
		},
		body: JSON.stringify(requestBody),
		signal: abortSignal,
	});

	if (!response.ok) {
		const body = await response.text();
		throw new Error(`OpenAI Responses API ${response.status}: ${body}`);
	}

	const json = (await response.json()) as Record<string, unknown>;
	const assistantText = extractOpenAiAssistantText(json);

	return {
		finishReason: 'status' in json ? json.status : null,
		usage: 'usage' in json ? json.usage : null,
		assistantText,
		parsed: parseStructuredOutputFromText(assistantText),
	};
}

function createAttemptDebug(input: {
	attempt: number;
	status: VerifierAttemptDebug['status'];
	error?: string | null;
	finishReason?: unknown;
	usage?: unknown;
	assistantText?: string;
	parsed?: z.infer<typeof checklistResultSchema>;
	acceptedResultsCount?: number;
}): VerifierAttemptDebug {
	return {
		attempt: input.attempt,
		status: input.status,
		error: input.error ?? null,
		finishReason: input.finishReason ?? null,
		usage: input.usage ?? null,
		hasStructuredOutput: input.parsed !== undefined,
		structuredOutput: input.parsed ?? null,
		assistantText: input.assistantText ?? '',
		parsedResultsCount: input.parsed?.results?.length ?? 0,
		acceptedResultsCount: input.acceptedResultsCount ?? 0,
	};
}

function buildNativeVerifierMessage(
	llmItems: ChecklistItem[],
	artifact: VerificationArtifact,
): string {
	return `## Checklist

${JSON.stringify(llmItems, null, 2)}

## Workflow Context

${artifact.workflowContext}

## Scenario Context

${artifact.scenarioContext}

Verify each checklist item against the workflow + scenario artifact above.`;
}

function buildVerifierMessages(
	llmItems: ChecklistItem[],
	artifact: VerificationArtifact,
): Message[] {
	// Multi-block user message: the workflow context is stable across scenarios of
	// the same build, so we mark it as a cache breakpoint for Anthropic prompt caching.
	return [
		{
			role: 'user',
			content: [
				{
					type: 'text',
					text: artifact.workflowContext,
					providerOptions: EPHEMERAL_CACHE,
				},
				{
					type: 'text',
					text: `## Checklist\n\n${JSON.stringify(llmItems, null, 2)}\n\n${artifact.scenarioContext}\n\nVerify each checklist item against the workflow + scenario artifact above.`,
				},
			],
		},
	];
}

interface StreamedVerifierResult {
	assistantText: string;
	structuredOutput: unknown;
	finishReason: unknown;
	usage: unknown;
	streamError: unknown;
}

/**
 * Drain the agent stream, resetting the inactivity watchdog on every chunk.
 * Each read is raced against the abort signal so a transport that stops
 * emitting (the observed 120s+ hangs) can't pin the attempt to its full cap.
 */
async function consumeVerifierStream(
	stream: ReadableStream<StreamChunk>,
	abortSignal: AbortSignal,
	onActivity: () => void,
): Promise<StreamedVerifierResult> {
	const result: StreamedVerifierResult = {
		assistantText: '',
		structuredOutput: undefined,
		finishReason: null,
		usage: null,
		streamError: undefined,
	};

	const aborted = new Promise<never>((_, reject) => {
		const rejectWithReason = (): void => {
			reject(abortSignal.reason instanceof Error ? abortSignal.reason : new Error('aborted'));
		};
		if (abortSignal.aborted) rejectWithReason();
		else abortSignal.addEventListener('abort', rejectWithReason, { once: true });
	});

	const reader = stream.getReader();
	try {
		while (true) {
			const { done, value } = await Promise.race([reader.read(), aborted]);
			if (done) break;
			onActivity();
			switch (value.type) {
				case 'text-delta':
					result.assistantText += value.delta;
					break;
				case 'finish':
					result.finishReason = value.finishReason;
					result.usage = value.usage ?? null;
					result.structuredOutput = value.structuredOutput;
					break;
				case 'error':
					result.streamError = value.error;
					break;
				default:
					break;
			}
		}
	} finally {
		void reader.cancel().catch(() => {});
		try {
			reader.releaseLock();
		} catch {
			// already released
		}
	}

	return result;
}

export async function verifyChecklist(
	checklist: ChecklistItem[],
	artifact: VerificationArtifact,
): Promise<VerifyChecklistResult> {
	const llmItems = checklist.filter((i) => i.strategy === 'llm');
	if (llmItems.length === 0) return { results: [], attempts: [] };

	const nativeUserMessage = buildNativeVerifierMessage(llmItems, artifact);
	const messages = buildVerifierMessages(llmItems, artifact);

	const validIds = new Set(llmItems.map((i) => i.id));
	const attempts: VerifierAttemptDebug[] = [];
	const model = resolveEvalModelConfig();
	const useNativeOpenAiVerifier = model.provider === 'openai';

	logVerifierDebug('request summary', {
		checklistIds: Array.from(validIds),
		userMessageChars: nativeUserMessage.length,
		path: useNativeOpenAiVerifier ? 'native-openai' : 'agents-wrapper',
	});

	const maxAttempts = VERIFY_ATTEMPT_TIMEOUTS_MS.length;
	for (let attempt = 1; attempt <= maxAttempts; attempt++) {
		// Pause before every retry (`continue` paths included), decorrelating
		// concurrent lanes hitting the provider at the same moment.
		if (attempt > 1) await sleep(jitteredPauseMs(attempt - 1));
		const attemptCapMs = VERIFY_ATTEMPT_TIMEOUTS_MS[attempt - 1];
		const abortController = new AbortController();
		// The runtime's abort chunk carries a generic message — remember why WE aborted.
		let abortReason: string | null = null;
		const abortWith = (reason: string): void => {
			abortReason = reason;
			abortController.abort(new Error(reason));
		};
		const capTimer = setTimeout(
			() => abortWith(`verifier timed out after ${attemptCapMs}ms`),
			attemptCapMs,
		);
		let inactivityTimer: NodeJS.Timeout | undefined;
		const resetInactivity = (): void => {
			if (inactivityTimer) clearTimeout(inactivityTimer);
			inactivityTimer = setTimeout(
				() =>
					abortWith(`verifier stalled: no stream activity for ${VERIFY_INACTIVITY_TIMEOUT_MS}ms`),
				VERIFY_INACTIVITY_TIMEOUT_MS,
			);
		};

		try {
			let assistantText = '';
			let parsed: z.infer<typeof checklistResultSchema> | undefined;
			let finishReason: unknown = null;
			let usage: unknown = null;
			let modelError: string | null = null;
			let hasStructuredOutput = false;

			if (useNativeOpenAiVerifier) {
				// Single non-streaming fetch: the attempt cap is the only watchdog here.
				const nativeResult = await runNativeOpenAiVerifier(
					nativeUserMessage,
					abortController.signal,
				);
				assistantText = nativeResult.assistantText;
				parsed = nativeResult.parsed;
				finishReason = nativeResult.finishReason;
				usage = nativeResult.usage;
				hasStructuredOutput = parsed !== undefined;
			} else {
				const agent = createEvalAgent('eval-checklist-verifier', {
					instructions: MOCK_EXECUTION_VERIFY_PROMPT,
					cache: true,
				}).structuredOutput(checklistResultSchema);

				// The inactivity watchdog arms on the FIRST chunk (inside the consume
				// loop): time-to-first-token on a cache-cold large artifact can exceed
				// the window, and the attempt cap already bounds the pre-stream phase.
				const streamResult = await agent.stream(messages, {
					abortSignal: abortController.signal,
					smoothStream: false,
				});
				const streamed = await consumeVerifierStream(
					streamResult.stream,
					abortController.signal,
					resetInactivity,
				);
				assistantText = streamed.assistantText;
				const parsedStructuredOutput = checklistResultSchema.safeParse(streamed.structuredOutput);
				parsed = parsedStructuredOutput.success
					? parsedStructuredOutput.data
					: parseStructuredOutputFromText(assistantText);
				finishReason = streamed.finishReason;
				usage = streamed.usage;
				hasStructuredOutput = streamed.structuredOutput !== undefined;

				if (streamed.streamError !== undefined) {
					modelError =
						abortReason ??
						(streamed.streamError instanceof Error
							? streamed.streamError.message
							: JSON.stringify(streamed.streamError));
				}

				logVerifierDebug(`attempt ${attempt} raw result`, {
					finishReason,
					error: streamed.streamError ?? null,
					usage,
					hasStructuredOutput,
					structuredOutput: streamed.structuredOutput ?? null,
					assistantTextChars: assistantText.length,
					assistantTextPreview: assistantText.slice(0, 2_000),
				});
			}

			const results = buildChecklistResults(parsed, validIds);

			logVerifierDebug(`attempt ${attempt} parse summary`, {
				parsedResultsCount: parsed?.results?.length ?? 0,
				acceptedResultsCount: results.length,
				parsedIds: parsed?.results?.map((entry) => entry.id) ?? [],
				validIds: Array.from(validIds),
				finishReason,
				hasStructuredOutput,
			});

			if (modelError) {
				attempts.push(
					createAttemptDebug({
						attempt,
						status: 'model_error',
						error: modelError,
						finishReason,
						usage,
						assistantText,
						parsed,
					}),
				);
				console.warn(
					`[verifier] attempt ${attempt}/${maxAttempts} returned model error: ${modelError}`,
				);
				continue;
			}

			if (results.length > 0) {
				attempts.push(
					createAttemptDebug({
						attempt,
						status: 'success',
						finishReason,
						usage,
						assistantText,
						parsed,
						acceptedResultsCount: results.length,
					}),
				);
				results.sort((a, b) => a.id - b.id);
				return { results, attempts };
			}

			attempts.push(
				createAttemptDebug({
					attempt,
					status: 'no_parseable_results',
					finishReason,
					usage,
					assistantText,
					parsed,
					acceptedResultsCount: results.length,
				}),
			);
			console.warn(`[verifier] attempt ${attempt}/${maxAttempts} produced no parseable results`);
		} catch (error: unknown) {
			const msg = abortReason ?? (error instanceof Error ? error.message : String(error));
			attempts.push(
				createAttemptDebug({
					attempt,
					status: 'threw',
					error: msg,
				}),
			);
			console.warn(`[verifier] attempt ${attempt}/${maxAttempts} failed: ${msg}`);
		} finally {
			clearTimeout(capTimer);
			if (inactivityTimer) clearTimeout(inactivityTimer);
		}
	}

	console.warn(`[verifier] exhausted ${maxAttempts} attempts, returning empty result`);
	return { results: [], attempts };
}
