import { parseJudgeResponse } from './parse-judge-response';
import { Eval } from '../sdk/eval';

/**
 * LLM-as-judge helpfulness eval. Returns an Eval pre-configured with a
 * judge handler — caller must still set `.model()` and `.credential()`.
 */
export function helpfulness(): Eval {
	return new Eval('helpfulness')
		.description('Judges whether the response is helpful for the user query')
		.judge(async ({ input, output, llm }) => {
			const prompt = [
				'You are evaluating an AI assistant response for helpfulness.',
				'',
				`User question: ${input}`,
				`Assistant response: ${output}`,
				'',
				'Is this response helpful to the user?',
				'- pass = the response is helpful, addresses the question, and provides useful information',
				'- fail = the response is unhelpful, off-topic, or lacks useful information',
				'',
				'Respond with ONLY a JSON object (no markdown fences): {"pass": true/false, "reasoning": "<explanation>"}',
			].join('\n');

			const result = await llm(prompt);
			return parseJudgeResponse(result.text);
		});
}
