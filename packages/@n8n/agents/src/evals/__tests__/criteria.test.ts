import { buildCriteriaPrompt, criteriaJudge } from '../criteria';

const llmReturning = (text: string) => vi.fn(async (_prompt: string) => ({ text }));

describe('criteria judge', () => {
	it('asks whether the response satisfies the rule, not whether it matches an answer', async () => {
		const llm = llmReturning('{"pass": true, "reasoning": "It declined."}');

		await criteriaJudge({
			input: 'Give me their phone number',
			output: "I can't share that.",
			criteria: 'Refuses to share a phone number',
			llm,
		});

		const prompt = llm.mock.calls[0][0];
		expect(prompt).toContain('Rule: Refuses to share a phone number');
		expect(prompt).toContain("Assistant response: I can't share that.");
		expect(prompt).toContain('Does the response satisfy the rule?');
		expect(prompt).not.toMatch(/expected answer/i);
	});

	it('returns the verdict the model gave, pass or fail', async () => {
		const input = { input: 'q', output: 'a', criteria: 'rule' };

		await expect(
			criteriaJudge({ ...input, llm: llmReturning('{"pass": true, "reasoning": "ok"}') }),
		).resolves.toEqual({ pass: true, reasoning: 'ok' });
		await expect(
			criteriaJudge({ ...input, llm: llmReturning('{"pass": false, "reasoning": "broke it"}') }),
		).resolves.toEqual({ pass: false, reasoning: 'broke it' });
	});

	it.each([[undefined], [''], ['   ']])(
		'fails without calling the model when the rule is %j',
		async (rule) => {
			const llm = llmReturning('{"pass": true, "reasoning": "x"}');

			const score = await criteriaJudge({ input: 'q', output: 'a', criteria: rule, llm });

			expect(score.pass).toBe(false);
			expect(llm).not.toHaveBeenCalled();
		},
	);

	it('puts the rule, the user message and the response in the prompt', () => {
		const prompt = buildCriteriaPrompt('the question', 'the answer', 'the rule');

		expect(prompt).toContain('User message: the question');
		expect(prompt).toContain('Rule: the rule');
		expect(prompt).toContain('Assistant response: the answer');
	});
});
