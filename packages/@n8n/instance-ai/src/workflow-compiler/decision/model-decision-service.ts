import type { ModelConfig } from '@n8n/agents';
import { z } from 'zod';

import type { DecisionOutcome, DecisionRequest, DecisionService } from './decision-service';
import { decisionAnswerSchema, reconcileAnswers, type DecisionQuestions } from './schemas';
import { generateValidatedJson } from '../../utils/generate-validated-json';

/**
 * Fallback decision backend that asks a general language model to score the
 * same bounded questions. It keeps the structured-read contract (probabilities
 * over a known answer space) so the compiler policy is identical, but it is
 * slower and not a substitute for a calibrated structured-read deployment.
 */
export class ModelDecisionService implements DecisionService {
	readonly kind = 'model';

	constructor(
		private readonly modelConfig: ModelConfig,
		private readonly options: { model?: string; timeoutMs?: number } = {},
	) {}

	async decide(request: DecisionRequest): Promise<DecisionOutcome> {
		const started = Date.now();
		if (request.abortSignal?.aborted) {
			return { ok: false, reason: 'aborted', message: 'Request aborted.', latencyMs: 0 };
		}
		const responseSchema = z.object({ answers: z.record(z.string(), decisionAnswerSchema) });
		const result = await generateValidatedJson('workflow-compiler-decisions', {
			model: this.options.model,
			fallbackModelConfig: this.modelConfig,
			instructions: buildInstructions(request.questions),
			userText: JSON.stringify({ state: request.state, questions: request.questions }),
			schema: responseSchema,
		});
		const latencyMs = Date.now() - started;
		if (!result.ok) {
			return {
				ok: false,
				reason: result.reason === 'generation_failed' ? 'unavailable' : 'malformed',
				message: `Model decision fallback failed: ${result.reason}.`,
				latencyMs,
			};
		}
		const { answers, problems } = reconcileAnswers(request.questions, result.data.answers);
		return { ok: true, answers, problems, model: this.options.model ?? 'host-model', latencyMs };
	}
}

function buildInstructions(questions: DecisionQuestions): string {
	const names = Object.keys(questions).join(', ');
	return [
		'You score bounded decisions. Return only a JSON object: {"answers": {...}}.',
		`Answer every question by name (${names}). Never add questions.`,
		'For "noul": {"type":"noul","noul":<probability that the answer is yes>}.',
		'For "choice": {"type":"choice","choice":<option name>,"probabilities":{<option>:<p>},"confidence":<p of chosen>}. Use only the listed option names.',
		'For "score": {"type":"score","score":<expected level index>,"legend":{"0":...},"probabilities":{"0":<p>,...},"confidence":<max p>}.',
		'Probabilities are in [0,1] and sum to 1 per question. Use null for a question you cannot answer.',
	].join('\n');
}
