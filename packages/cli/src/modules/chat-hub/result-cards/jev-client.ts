import type { Logger } from '@n8n/backend-common';
import type { JevAnswers, JevQuestions, JevState } from '@n8n/chat-hub';
import { Service } from '@n8n/di';

export type JevProvider = 'typesafe' | 'vercel' | 'openrouter';

const PROVIDERS: Record<
	JevProvider,
	{ url: string; model: string; booleanType: 'noul' | 'boolean' }
> = {
	typesafe: {
		url: 'https://api.typesafe.ai/v1/systemone',
		model: 'jev-1.13.0',
		booleanType: 'noul',
	},
	vercel: {
		url: 'https://ai-gateway.vercel.sh/v1/evaluate',
		model: 'typesafe-ai/jev',
		booleanType: 'boolean',
	},
	openrouter: {
		url: 'https://openrouter.ai/api/alpha/decisions',
		model: 'typesafe/jev-1.13',
		booleanType: 'noul',
	},
};

const DEFAULT_TIMEOUT_MS = 2000;

export interface JevClientOptions {
	provider: JevProvider;
	apiKey: string;
	baseUrl?: string;
	model?: string;
	timeoutMs?: number;
	fetchImpl?: typeof fetch;
}

export interface JevDecision {
	answers: JevAnswers;
	latencyMs: number;
	inputTokens?: number;
	outputTokens?: number;
}

interface JevResponseBody {
	answers?: Record<string, unknown>;
	usage?: { input_tokens?: number; output_tokens?: number };
}

const asNumber = (value: unknown): number | undefined =>
	typeof value === 'number' && Number.isFinite(value) ? value : undefined;

/**
 * Coerce a raw Jev response into `JevAnswers`. The three providers spell the
 * boolean answer differently (`noul`, `probability`, `boolean`); all become
 * `{ noul }`. Answers of unknown shape are dropped so the mapper falls back to
 * its defaults for them.
 */
export function normalizeAnswers(raw: Record<string, unknown>): JevAnswers {
	const answers: JevAnswers = {};
	for (const [id, value] of Object.entries(raw)) {
		if (value === null || typeof value !== 'object') continue;
		const answer = value as Record<string, unknown>;
		const noul = asNumber(answer.noul) ?? asNumber(answer.probability) ?? asNumber(answer.boolean);
		const score = asNumber(answer.score);
		if (typeof answer.choice === 'string') {
			answers[id] = {
				choice: answer.choice,
				confidence: asNumber(answer.confidence),
				probabilities: answer.probabilities as Record<string, number> | undefined,
			};
		} else if (noul !== undefined) {
			answers[id] = { noul };
		} else if (score !== undefined) {
			answers[id] = { score };
		}
	}
	return answers;
}

/**
 * HTTP client for Jev (TypeSafe AI's decision model). One `decide` call sends the
 * state and question set and returns normalized answers. Never throws: HTTP
 * errors, network errors and timeouts all resolve to `undefined`, which the
 * chooser treats as "use the deterministic defaults".
 */
export class JevClient {
	constructor(
		private readonly options: JevClientOptions,
		private readonly logger: Logger,
	) {}

	async decide(state: JevState, questions: JevQuestions): Promise<JevDecision | undefined> {
		const timeoutMs = this.options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
		const controller = new AbortController();
		const timer = setTimeout(() => controller.abort(), timeoutMs);
		const started = Date.now();
		try {
			// Unknown provider ids (e.g. from a mistyped env var) fall back to the direct endpoint.
			const provider = PROVIDERS[this.options.provider] ?? PROVIDERS.typesafe;
			const url = this.options.baseUrl || provider.url;
			const model = this.options.model || provider.model;
			const body = {
				model,
				state,
				questions: Object.fromEntries(
					Object.entries(questions).map(([id, question]) => [
						id,
						question.type === 'noul' ? { ...question, type: provider.booleanType } : question,
					]),
				),
			};

			const response = await (this.options.fetchImpl ?? fetch)(url, {
				method: 'POST',
				headers: {
					Authorization: `Bearer ${this.options.apiKey}`,
					'Content-Type': 'application/json',
				},
				body: JSON.stringify(body),
				signal: controller.signal,
			});
			if (!response.ok) {
				this.logger.warn(`Jev responded with HTTP ${response.status}`);
				return undefined;
			}
			const json = (await response.json()) as JevResponseBody;
			const decision: JevDecision = {
				answers: normalizeAnswers(json.answers ?? {}),
				latencyMs: Date.now() - started,
				inputTokens: json.usage?.input_tokens,
				outputTokens: json.usage?.output_tokens,
			};
			this.logger.debug('Jev decision', {
				model,
				latencyMs: decision.latencyMs,
				inputTokens: decision.inputTokens,
				outputTokens: decision.outputTokens,
				questions: Object.keys(questions).length,
			});
			return decision;
		} catch (error) {
			if (controller.signal.aborted) {
				this.logger.warn(`Jev call timed out after ${timeoutMs} ms`);
			} else {
				this.logger.warn(
					`Jev call failed: ${error instanceof Error ? error.message : String(error)}`,
				);
			}
			return undefined;
		} finally {
			clearTimeout(timer);
		}
	}
}

/** Indirection so the chooser can be unit-tested without touching the network. */
@Service()
export class JevClientFactory {
	create(options: JevClientOptions, logger: Logger): JevClient {
		return new JevClient(options, logger);
	}
}
