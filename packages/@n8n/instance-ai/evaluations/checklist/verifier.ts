import type { Message } from '@n8n/agents';
import { z } from 'zod';

import {
	EPHEMERAL_CACHE,
	createEvalAgent,
	extractText,
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

const MAX_VERIFY_ATTEMPTS = 2;
const VERIFY_ATTEMPT_TIMEOUT_MS = 120_000;
const VERIFIER_DEBUG = process.env.N8N_EVAL_VERIFIER_DEBUG === '1';

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

	for (let attempt = 1; attempt <= MAX_VERIFY_ATTEMPTS; attempt++) {
		const abortController = new AbortController();
		const timer = setTimeout(
			() =>
				abortController.abort(new Error(`verifier timed out after ${VERIFY_ATTEMPT_TIMEOUT_MS}ms`)),
			VERIFY_ATTEMPT_TIMEOUT_MS,
		);

		try {
			let assistantText = '';
			let parsed: z.infer<typeof checklistResultSchema> | undefined;
			let finishReason: unknown = null;
			let usage: unknown = null;
			let modelError: string | null = null;
			let hasStructuredOutput = false;

			if (useNativeOpenAiVerifier) {
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

				const result = await agent.generate(messages, { abortSignal: abortController.signal });
				assistantText = extractText(result);
				const parsedStructuredOutput = checklistResultSchema.safeParse(result.structuredOutput);
				parsed = parsedStructuredOutput.success
					? parsedStructuredOutput.data
					: parseStructuredOutputFromText(assistantText);
				finishReason = 'finishReason' in result ? result.finishReason : null;
				usage = 'usage' in result ? result.usage : null;
				hasStructuredOutput = result.structuredOutput !== undefined;

				if (result.error) {
					modelError =
						result.error instanceof Error ? result.error.message : JSON.stringify(result.error);
				}

				logVerifierDebug(`attempt ${attempt} raw result`, {
					resultKeys: Object.keys(result as Record<string, unknown>),
					finishReason,
					error: 'error' in result ? result.error : null,
					model: 'model' in result ? result.model : null,
					usage,
					messages: 'messages' in result ? result.messages : null,
					hasStructuredOutput,
					structuredOutput: result.structuredOutput ?? null,
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
					`[verifier] attempt ${attempt}/${MAX_VERIFY_ATTEMPTS} returned model error: ${modelError}`,
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
			console.warn(
				`[verifier] attempt ${attempt}/${MAX_VERIFY_ATTEMPTS} produced no parseable results`,
			);
		} catch (error: unknown) {
			const msg = error instanceof Error ? error.message : String(error);
			attempts.push(
				createAttemptDebug({
					attempt,
					status: 'threw',
					error: msg,
				}),
			);
			console.warn(`[verifier] attempt ${attempt}/${MAX_VERIFY_ATTEMPTS} failed: ${msg}`);
		} finally {
			clearTimeout(timer);
		}
	}

	console.warn(`[verifier] exhausted ${MAX_VERIFY_ATTEMPTS} attempts, returning empty result`);
	return { results: [], attempts };
}
