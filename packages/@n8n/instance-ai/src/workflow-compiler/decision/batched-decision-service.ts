import type { DecisionOutcome, DecisionRequest, DecisionService } from './decision-service';
import { reconcileAnswers, type DecisionQuestions } from './schemas';

interface PendingRead {
	request: DecisionRequest;
	resolve: (outcome: DecisionOutcome) => void;
}

/** Batch independent reads in one turn. Reuse each result only within that turn. */
export class BatchedDecisionService implements DecisionService {
	readonly kind: string;
	private readonly reads = new Map<string, Promise<DecisionOutcome>>();
	private pending: PendingRead[] = [];

	constructor(
		private readonly backend: DecisionService,
		private readonly abortSignal?: AbortSignal,
	) {
		this.kind = backend.kind;
	}

	async decide(request: DecisionRequest): Promise<DecisionOutcome> {
		if (this.abortSignal?.aborted || request.abortSignal?.aborted)
			return { ok: false, reason: 'aborted', message: 'Request aborted.', latencyMs: 0 };
		const key = JSON.stringify([request.schemaVersion, request.state, request.questions]);
		const cached = this.reads.get(key);
		if (cached) return await cached;
		const result = new Promise<DecisionOutcome>((resolve) => {
			this.pending.push({ request, resolve });
			if (this.pending.length === 1)
				queueMicrotask(() => {
					void this.flush();
				});
		});
		this.reads.set(key, result);
		return await result;
	}

	private async flush(): Promise<void> {
		const pending = this.pending;
		this.pending = [];
		const signals = [this.abortSignal, ...pending.map(({ request }) => request.abortSignal)].filter(
			(signal): signal is AbortSignal => signal !== undefined,
		);
		const abortSignal = signals.length > 0 ? AbortSignal.any(signals) : undefined;
		if (pending.length === 1) {
			const [{ request, resolve }] = pending;
			resolve(await this.backend.decide({ ...request, abortSignal }));
			return;
		}
		const questions: DecisionQuestions = {};
		const states = pending.map(({ request }, index) => {
			for (const [name, question] of Object.entries(request.questions)) {
				questions[`${index}:${name}`] = {
					...question,
					instructions: `Use only state.reads[${index}] as the state for this question. ${question.instructions}`,
				};
			}
			return request.state;
		});
		const outcome = await this.backend.decide({
			name: 'instant-generation.batch',
			schemaVersion: 'instant-generation-batch-v1',
			state: { reads: states },
			questions,
			abortSignal,
		});
		pending.forEach(({ request, resolve }, index) => {
			if (!outcome.ok) return resolve(outcome);
			const answers = Object.fromEntries(
				Object.keys(request.questions).map((name) => [
					name,
					outcome.answers[`${index}:${name}`] ?? null,
				]),
			);
			resolve({ ...outcome, ...reconcileAnswers(request.questions, answers) });
		});
	}
}
