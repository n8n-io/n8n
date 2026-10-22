import { BUILD_EXPECTATIONS_VERIFY_PROMPT } from '../system-prompts/build-expectations-verify';
import { MOCK_EXECUTION_VERIFY_PROMPT } from '../system-prompts/mock-execution-verify';
import { REASONING_FIRST_RULE } from '../utils/llm-judge';

/** Each example verdict in a prompt, from its `"index"` / `"id"` key to the next one. */
function exampleVerdicts(prompt: string): string[] {
	return prompt.split(/"(?:index|id)":/).slice(1);
}

describe.each([
	{ name: 'expectations judge', prompt: BUILD_EXPECTATIONS_VERIFY_PROMPT, reasonKey: '"reason"' },
	{ name: 'checklist judge', prompt: MOCK_EXECUTION_VERIFY_PROMPT, reasonKey: '"reasoning"' },
])('$name prompt', ({ prompt, reasonKey }) => {
	it('tells the judge to reason before it decides', () => {
		expect(REASONING_FIRST_RULE).toBe('Write your reasoning FIRST, then decide pass or fail.');
		expect(prompt).toContain(REASONING_FIRST_RULE);
	});

	it('shows the reason before the verdict in every example', () => {
		const examples = exampleVerdicts(prompt);
		expect(examples).toHaveLength(2);
		for (const example of examples) {
			const reasonAt = example.indexOf(reasonKey);
			expect(reasonAt).toBeGreaterThanOrEqual(0);
			expect(reasonAt).toBeLessThan(example.indexOf('"pass"'));
		}
	});
});

describe('expectations judge prompt', () => {
	it('judges a negative expectation by what it states', () => {
		expect(BUILD_EXPECTATIONS_VERIFY_PROMPT).toContain(
			'For "The agent did not X", the expectation holds when X did not happen and fails when X happened.',
		);
	});
});
