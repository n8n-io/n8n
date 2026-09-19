import { decisionResponseSchema, reconcileAnswers } from './schemas';
import type {
	DecisionFailureReason,
	DecisionOutcome,
	DecisionRequest,
	DecisionService,
} from './decision-service';

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

	constructor(private readonly options: SystemOneClientOptions) {}

	async decide(request: DecisionRequest): Promise<DecisionOutcome> {
		const { apiKey, think, timeoutMs = DEFAULT_TIMEOUT_MS, fetchImpl = fetch } = this.options;
		const started = Date.now();
		const fail = (reason: DecisionFailureReason, message: string): DecisionOutcome => ({
			ok: false,
			reason,
			message,
			latencyMs: Date.now() - started,
		});
		const controller = new AbortController();
		const timer = setTimeout(() => controller.abort(new Error('timeout')), timeoutMs);
		const onAbort = () => controller.abort(new Error('aborted'));
		request.abortSignal?.addEventListener('abort', onAbort, { once: true });
		try {
			const { state, questions } = request;
			const model = this.options.model ?? DEFAULT_MODEL;
			const body = { model, state, questions, ...(think !== undefined ? { think } : {}) };
			let response: Response;
			try {
				response = await fetchImpl(`${this.options.baseUrl.replace(/\/+$/, '')}/v1/systemone`, {
					method: 'POST',
					signal: controller.signal,
					headers: {
						'content-type': 'application/json',
						...(apiKey ? { authorization: `Bearer ${apiKey}` } : {}),
					},
					body: JSON.stringify(body),
				});
			} catch (error) {
				if (request.abortSignal?.aborted) return fail('aborted', 'Request aborted.');
				if (controller.signal.aborted)
					return fail('timeout', `Decision service exceeded ${timeoutMs}ms.`);
				return fail('unavailable', error instanceof Error ? error.message : String(error));
			}
			if (!response.ok) {
				const text = await response.text().catch(() => '');
				return fail(
					'http_error',
					`Decision service returned ${response.status}: ${text.slice(0, 500)}`,
				);
			}
			let json: unknown;
			try {
				json = await response.json();
			} catch {
				return fail('malformed', 'Decision service returned invalid JSON.');
			}
			const parsed = decisionResponseSchema.safeParse(json);
			if (!parsed.success) {
				const detail = parsed.error.issues
					.slice(0, 3)
					.map((issue) => `${issue.path.join('.')}: ${issue.message}`)
					.join('; ');
				return fail('malformed', `Decision response failed validation: ${detail}`);
			}
			const { answers, problems } = reconcileAnswers(questions, parsed.data.answers);
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
}
