import type {
	DecisionOutcome,
	DecisionRequest,
	DecisionService,
} from '../workflow-compiler/decision/decision-service';
import type { DecisionAnswer } from '../workflow-compiler/decision/schemas';

/**
 * Scripted decision backend for tests. Every choice question is answered with
 * `choices[name]`, else `choices['*']`, else the first listed option, at a
 * fixed confidence; the remaining mass is spread over the other options.
 */
export function scriptedDecisions(
	choices: Record<string, string> = {},
	confidence = 0.95,
): DecisionService & { requests: DecisionRequest[] } {
	const requests: DecisionRequest[] = [];
	return {
		kind: 'scripted',
		requests,
		async decide(request): Promise<DecisionOutcome> {
			requests.push(request);
			const answers: Record<string, DecisionAnswer> = {};
			for (const [name, question] of Object.entries(request.questions)) {
				if (question.type !== 'choice') continue;
				const choice = choices[name] ?? choices['*'] ?? Object.keys(question.criteria)[0];
				const others = Object.keys(question.criteria).filter((key) => key !== choice);
				const probabilities: Record<string, number> = { [choice]: confidence };
				for (const key of others) probabilities[key] = (1 - confidence) / others.length;
				answers[name] = { type: 'choice', choice, probabilities, confidence };
			}
			return { ok: true, answers, model: 'scripted', latencyMs: 1, problems: [] };
		},
	};
}
