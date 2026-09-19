import {
	decisionResponseSchema,
	reconcileAnswers,
	type DecisionQuestions,
	type DecisionState,
} from './schemas';
import type { DecisionOutcome, DecisionRequest, DecisionService } from './decision-service';

export interface SystemOneClientOptions {
	baseUrl: string;
	apiKey?: string;
	/** Model name the structured-read server routes on. */
	model?: string;
	/** Hard latency budget per request. The compiler's fast path assumes ~1.5s. */
	timeoutMs?: number;
	/** Optional bounded reasoning prefix; use only when evaluation justifies the latency. */
	think?: number;
	fetchImpl?: typeof fetch;
}

const DEFAULT_TIMEOUT_MS = 1500;
const DEFAULT_MODEL = 'jev-latest';

/**
 * HTTP client for the structured-read interposer (`POST /v1/systemone`).
 * Validates the response at runtime and reconciles it against the questions
 * asked; never throws.
 */
export class SystemOneDecisionClient implements DecisionService {
	readonly kind = 'systemone';

	private readonly baseUrl: string;

	private readonly timeoutMs: number;

	private readonly model: string;

	private readonly fetchImpl: typeof fetch;

	constructor(private readonly options: SystemOneClientOptions) {
		this.baseUrl = options.baseUrl.replace(/\/+$/, '');
		this.timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
		this.model = options.model ?? DEFAULT_MODEL;
		this.fetchImpl = options.fetchImpl ?? fetch;
	}

	async decide(request: DecisionRequest): Promise<DecisionOutcome> {
		const started = Date.now();
		const controller = new AbortController();
		const timer = setTimeout(() => controller.abort(new Error('timeout')), this.timeoutMs);
		const onAbort = () => controller.abort(new Error('aborted'));
		request.abortSignal?.addEventListener('abort', onAbort, { once: true });
		try {
			const body = this.buildBody(request.state, request.questions);
			let response: Response;
			try {
				response = await this.fetchImpl(`${this.baseUrl}/v1/systemone`, {
					method: 'POST',
					signal: controller.signal,
					headers: {
						'content-type': 'application/json',
						...(this.options.apiKey ? { authorization: `Bearer ${this.options.apiKey}` } : {}),
					},
					body: JSON.stringify(body),
				});
			} catch (error) {
				const latencyMs = Date.now() - started;
				if (request.abortSignal?.aborted) {
					return { ok: false, reason: 'aborted', message: 'Request aborted.', latencyMs };
				}
				if (controller.signal.aborted) {
					return {
						ok: false,
						reason: 'timeout',
						message: `Decision service exceeded ${this.timeoutMs}ms.`,
						latencyMs,
					};
				}
				return {
					ok: false,
					reason: 'unavailable',
					message: error instanceof Error ? error.message : String(error),
					latencyMs,
				};
			}
			if (!response.ok) {
				const text = await response.text().catch(() => '');
				return {
					ok: false,
					reason: 'http_error',
					message: `Decision service returned ${response.status}: ${text.slice(0, 500)}`,
					latencyMs: Date.now() - started,
				};
			}
			let json: unknown;
			try {
				json = await response.json();
			} catch {
				return {
					ok: false,
					reason: 'malformed',
					message: 'Decision service returned invalid JSON.',
					latencyMs: Date.now() - started,
				};
			}
			const parsed = decisionResponseSchema.safeParse(json);
			if (!parsed.success) {
				return {
					ok: false,
					reason: 'malformed',
					message: `Decision response failed validation: ${parsed.error.issues
						.slice(0, 3)
						.map((issue) => `${issue.path.join('.')}: ${issue.message}`)
						.join('; ')}`,
					latencyMs: Date.now() - started,
				};
			}
			const { answers, problems } = reconcileAnswers(request.questions, parsed.data.answers);
			return {
				ok: true,
				answers,
				problems,
				model: parsed.data.model,
				latencyMs: Date.now() - started,
				reads: parsed.data.diagnostics?.timing?.reads,
			};
		} finally {
			clearTimeout(timer);
			request.abortSignal?.removeEventListener('abort', onAbort);
		}
	}

	private buildBody(state: DecisionState, questions: DecisionQuestions) {
		return {
			model: this.model,
			state,
			questions,
			...(this.options.think !== undefined ? { think: this.options.think } : {}),
		};
	}
}
