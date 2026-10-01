// ---------------------------------------------------------------------------
// LLM judge for the routing grader.
//
// The grader calls the judge only when tool calls cannot decide the route: an
// `ask-user` card (the judge gives the steer) or a reply with no committing
// call (the judge gives the kind and the steer). Verdicts are cached on disk by
// a hash of the full request, so a re-grade makes no API calls and a prompt
// change starts a fresh cache.
//
// It calls the Anthropic Messages API with fetch instead of `createEvalAgent`
// (src/utils/eval-agents.ts), because that factory always turns on adaptive
// thinking and has no temperature setting, which would change the calibrated
// temperature-0 forced-tool verdicts, and its `generate()` hides the HTTP status
// and `retry-after` header that the retry loop reads.
// ---------------------------------------------------------------------------

import { createHash } from 'node:crypto';
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { setTimeout as sleep } from 'node:timers/promises';

import { type AskUserQuestion, isRecord, isSteer, type Steer } from './grade-types';

export const JUDGE_MODEL = 'claude-sonnet-4-6';

export const DEFAULT_JUDGE_CACHE_DIR = resolve(__dirname, '..', '.data', 'routing-judge-cache');

const API_URL = 'https://api.anthropic.com/v1/messages';
const API_VERSION = '2023-06-01';
const TOOL_NAME = 'record_routing_judgment';
const REQUEST_TIMEOUT_MS = 90_000;
const DEFAULT_MAX_ATTEMPTS = 6;
const MAX_BACKOFF_MS = 30_000;

export const JUDGE_KINDS = ['answer', 'clarify', 'decline'] as const;
export type JudgeKind = (typeof JUDGE_KINDS)[number];

const isJudgeKind = (value: unknown): value is JudgeKind =>
	typeof value === 'string' && JUDGE_KINDS.some((kind) => kind === value);

export interface JudgeVerdict {
	kind: JudgeKind;
	steer: Steer;
	reason: string;
}

export interface JudgeInput {
	/** `ask-user` when the Assistant showed a question card, `text` when it only wrote text. */
	mode: 'ask-user' | 'text';
	userMessage: string;
	askUserIntro?: string;
	askUserQuestions: AskUserQuestion[];
	finalText: string;
}

export interface JudgeResult {
	verdict: JudgeVerdict;
	cached: boolean;
}

export interface JudgeStats {
	apiCalls: number;
	cacheHits: number;
	failures: number;
	inputTokens: number;
	outputTokens: number;
}

const SYSTEM_PROMPT = `You grade one reply from the n8n Assistant. n8n is a workflow automation product. The Assistant can build two different artifacts:

- A workflow: a trigger and a fixed graph of steps (nodes) that runs the same way each time. A workflow can contain AI steps, including an "AI Agent" node. It is still a workflow.
- An Agent: a standalone n8n Agent made with the Agent Builder. It has instructions, tools, and memory. It holds conversations or owns an ongoing role that needs judgment. It can also run scheduled tasks.

The Assistant can also answer questions, do a one-time action, or ask the user for more detail.

You get the user's message and the Assistant's reply. The reply is a structured question card from the ask-user tool (questions with options), free text, or both. Record your judgment with the ${TOOL_NAME} tool.

kind:
- answer: The reply deals with the request directly. It gives information, instructions, an explanation, or a result, and it does not need input from the user to continue. An answer that ends with an optional offer ("Do you want me to build this?") is still an answer.
- clarify: The main purpose of the reply is to get a decision or a missing detail from the user before the Assistant continues. It asks one or more questions and stops.
- decline: The reply refuses the request, or it says that it cannot help with it. It can suggest an alternative.

steer is the artifact that the reply pushes the user toward:
- agent: The reply recommends or assumes an Agent, or its questions only make sense for an Agent (persona, tone, what the Agent remembers, where it talks to people). It does not offer a workflow as a real option.
- workflow: The reply recommends or assumes a workflow, or its questions are about workflow details (trigger, schedule, nodes, steps, field mappings). It does not offer an Agent as a real option. A workflow with an AI Agent node is a workflow.
- both: The reply offers an Agent and a workflow as real options, and the user can pick either one. This applies also when the reply marks one of them as recommended.
- none: The reply pushes toward neither artifact. It asks about the goal or the use case without favouring one, it asks only about details that fit both (which app holds the data, which channel), or it only answers or declines.

Rules:
- Judge what the reply does, not what the reply should do.
- The words "agent", "assistant", or "bot" alone do not decide the steer. Decide from what the reply proposes to build.
- Consider the questions, the options, and the text together.
- reason: one sentence that quotes or names the part of the reply that decided the steer.`;

const JUDGE_TOOL = {
	name: TOOL_NAME,
	description: 'Record the kind and the steer of the Assistant reply.',
	input_schema: {
		type: 'object',
		properties: {
			kind: {
				type: 'string',
				enum: [...JUDGE_KINDS],
				description: 'What the reply does: answer, clarify, or decline.',
			},
			steer: {
				type: 'string',
				enum: ['agent', 'workflow', 'both', 'none'],
				description: 'The artifact that the reply pushes the user toward.',
			},
			reason: { type: 'string', description: 'One sentence that justifies the steer.' },
		},
		required: ['kind', 'steer', 'reason'],
		additionalProperties: false,
	},
} as const;

function renderQuestions(input: JudgeInput): string {
	const lines: string[] = [];
	if (input.askUserIntro) lines.push(`Intro: ${input.askUserIntro}`);
	for (const [index, question] of input.askUserQuestions.entries()) {
		lines.push(`${index + 1}. ${question.question}`);
		if (question.options.length === 0) lines.push('   (free-text answer, no options)');
		for (const option of question.options) lines.push(`   - ${option}`);
	}
	return lines.length > 0 ? lines.join('\n') : '(the card has no readable questions)';
}

export function renderJudgePrompt(input: JudgeInput): string {
	const parts = [`<user_message>\n${input.userMessage}\n</user_message>`];
	if (input.mode === 'ask-user') {
		parts.push(`<ask_user_card>\n${renderQuestions(input)}\n</ask_user_card>`);
	}
	parts.push(
		`<assistant_text>\n${input.finalText.trim() || '(no text)'}\n</assistant_text>`,
		input.mode === 'ask-user'
			? 'The Assistant showed the ask-user card above and waited for the answer, so the kind is clarify. Decide the steer from the questions, the options, and the text.'
			: 'The Assistant made no build or action call. Decide the kind and the steer from its text.',
	);
	return parts.join('\n\n');
}

function buildRequestBody(input: JudgeInput) {
	return {
		model: JUDGE_MODEL,
		max_tokens: 1024,
		temperature: 0,
		system: SYSTEM_PROMPT,
		tools: [JUDGE_TOOL],
		tool_choice: { type: 'tool', name: TOOL_NAME },
		messages: [{ role: 'user', content: renderJudgePrompt(input) }],
	};
}

/** Cache key: a hash of the full request, so a prompt or model change starts a fresh cache. */
export function judgeCacheKey(input: JudgeInput): string {
	return createHash('sha256')
		.update(JSON.stringify(buildRequestBody(input)))
		.digest('hex');
}

function parseVerdict(raw: unknown): JudgeVerdict | undefined {
	if (!isRecord(raw) || !isJudgeKind(raw.kind) || !isSteer(raw.steer)) return undefined;
	return {
		kind: raw.kind,
		steer: raw.steer,
		reason: typeof raw.reason === 'string' ? raw.reason : '',
	};
}

function isRetryableStatus(status: number): boolean {
	return status === 408 || status === 409 || status === 429 || status >= 500;
}

function backoffMs(attempt: number, retryAfter: string | null): number {
	const seconds = retryAfter === null ? Number.NaN : Number(retryAfter);
	if (Number.isFinite(seconds) && seconds >= 0) return Math.min(seconds * 1000, MAX_BACKOFF_MS);
	const exponential = 1000 * 2 ** (attempt - 1);
	return Math.min(exponential + Math.floor(Math.random() * 500), MAX_BACKOFF_MS);
}

export interface RoutingJudgeOptions {
	cacheDir: string;
	apiKey?: string;
	maxAttempts?: number;
}

export class RoutingJudge {
	readonly stats: JudgeStats = {
		apiCalls: 0,
		cacheHits: 0,
		failures: 0,
		inputTokens: 0,
		outputTokens: 0,
	};

	/** Identical inputs in one run share one request. */
	private readonly inFlight = new Map<string, Promise<JudgeResult>>();

	constructor(private readonly options: RoutingJudgeOptions) {}

	async judge(input: JudgeInput): Promise<JudgeResult> {
		const body = buildRequestBody(input);
		const key = judgeCacheKey(input);
		const pending = this.inFlight.get(key);
		if (pending) return await pending;

		const promise = this.judgeUncached(key, body, input);
		this.inFlight.set(key, promise);
		try {
			return await promise;
		} catch (error) {
			this.stats.failures++;
			throw error;
		}
	}

	private cachePath(key: string): string {
		return join(this.options.cacheDir, `${key}.json`);
	}

	private async readCache(key: string): Promise<JudgeVerdict | undefined> {
		try {
			const parsed: unknown = JSON.parse(await readFile(this.cachePath(key), 'utf8'));
			return isRecord(parsed) ? parseVerdict(parsed.verdict) : undefined;
		} catch {
			return undefined;
		}
	}

	private async writeCache(key: string, input: JudgeInput, verdict: JudgeVerdict): Promise<void> {
		await mkdir(this.options.cacheDir, { recursive: true });
		const file = this.cachePath(key);
		const temp = `${file}.${process.pid}.tmp`;
		const entry = { model: JUDGE_MODEL, createdAt: new Date().toISOString(), input, verdict };
		await writeFile(temp, `${JSON.stringify(entry, null, 2)}\n`);
		await rename(temp, file);
	}

	private async judgeUncached(
		key: string,
		body: ReturnType<typeof buildRequestBody>,
		input: JudgeInput,
	): Promise<JudgeResult> {
		const cached = await this.readCache(key);
		if (cached) {
			this.stats.cacheHits++;
			return { verdict: cached, cached: true };
		}
		const verdict = await this.callApi(body);
		await this.writeCache(key, input, verdict);
		return { verdict, cached: false };
	}

	private async callApi(body: ReturnType<typeof buildRequestBody>): Promise<JudgeVerdict> {
		const apiKey = this.options.apiKey;
		if (!apiKey) {
			throw new Error('ANTHROPIC_API_KEY is not set, and the verdict is not in the judge cache');
		}
		const maxAttempts = this.options.maxAttempts ?? DEFAULT_MAX_ATTEMPTS;
		let lastError = 'no attempt made';

		for (let attempt = 1; attempt <= maxAttempts; attempt++) {
			let response: Response;
			try {
				this.stats.apiCalls++;
				response = await fetch(API_URL, {
					method: 'POST',
					headers: {
						'content-type': 'application/json',
						'x-api-key': apiKey,
						'anthropic-version': API_VERSION,
					},
					body: JSON.stringify(body),
					signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
				});
			} catch (error) {
				// Network failures and timeouts are transient.
				lastError = error instanceof Error ? error.message : String(error);
				if (attempt < maxAttempts) await sleep(backoffMs(attempt, null));
				continue;
			}

			if (!response.ok) {
				const text = (await response.text()).slice(0, 500);
				lastError = `HTTP ${response.status}: ${text}`;
				if (!isRetryableStatus(response.status)) break;
				if (attempt < maxAttempts) {
					await sleep(backoffMs(attempt, response.headers.get('retry-after')));
				}
				continue;
			}

			const payload: unknown = await response.json();
			if (isRecord(payload) && isRecord(payload.usage)) {
				const { input_tokens: inputTokens, output_tokens: outputTokens } = payload.usage;
				if (typeof inputTokens === 'number') this.stats.inputTokens += inputTokens;
				if (typeof outputTokens === 'number') this.stats.outputTokens += outputTokens;
			}
			const content = isRecord(payload) && Array.isArray(payload.content) ? payload.content : [];
			const toolUse = content.find(
				(block) => isRecord(block) && block.type === 'tool_use' && block.name === TOOL_NAME,
			);
			const verdict = isRecord(toolUse) ? parseVerdict(toolUse.input) : undefined;
			if (verdict) return verdict;
			// A malformed tool input is rare with forced tool use; one more sample usually fixes it.
			lastError = `judge returned no valid ${TOOL_NAME} input`;
		}

		throw new Error(`Judge request failed: ${lastError}`);
	}
}

/** Runs `worker` over `items` with at most `limit` in flight, keeping input order. */
export async function mapWithConcurrency<T, R>(
	items: readonly T[],
	limit: number,
	worker: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
	const results = new Array<R>(items.length);
	let next = 0;
	const runners = Array.from({ length: Math.max(1, Math.min(limit, items.length)) }, async () => {
		while (next < items.length) {
			const index = next++;
			results[index] = await worker(items[index], index);
		}
	});
	await Promise.all(runners);
	return results;
}
