import { parseJudgeResponse } from './parse-judge-response';
import { Eval } from '../sdk/eval';

/**
 * LLM-as-judge correctness eval. Returns an Eval pre-configured with a
 * judge handler — caller must still set `.model()` and `.credential()`.
 */
export function correctness(): Eval {
	return new Eval('correctness')
		.description('Judges if the output is factually correct compared to the expected answer')
		.judge(async ({ input, output, expected, llm }) => {
			const prompt = [
				'You are evaluating an AI assistant response for factual correctness.',
				'',
				`User question: ${input}`,
				`Expected answer: ${expected ?? '(none provided)'}`,
				`Actual answer: ${output}`,
				'',
				'Does the actual answer correctly address the question and match the expected answer?',
				'Answer with pass or fail:',
				'- pass = the answer is correct and addresses the question',
				'- fail = the answer is incorrect, incomplete, or irrelevant',
				'',
				'Respond with ONLY a JSON object (no markdown fences): {"pass": true/false, "reasoning": "<explanation>"}',
			].join('\n');

			const result = await llm(prompt);
			return parseJudgeResponse(result.text);
		});
}
