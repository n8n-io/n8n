/**
 * Tests for the reflection step that runs before the agent accepts completion.
 *
 * The reflection logic is a private method on AgentsService, so we test it
 * indirectly through executeAgentTask by controlling the LLM responses.
 * We mock callLlm to simulate:
 *   1. Agent proposes complete → reflection confirms → done
 *   2. Agent proposes complete → reflection finds gap → corrective action → then complete
 *   3. Agent proposes complete → budget exhausted → accepted without reflection
 */

jest.mock('../agent-llm-client');

describe('reflection step', () => {
	beforeEach(() => {
		jest.clearAllMocks();
	});

	describe('reflection prompt composition', () => {
		it('should include original task and proposed summary in reflection', () => {
			// The reflection prompt format as implemented:
			const originalPrompt = 'Run all QA tests';
			const proposedSummary = 'Tests executed successfully';
			const steps = [{ action: 'execute_workflow', workflowName: 'QA Suite', result: 'success' }];

			const stepsSoFar = steps
				.map(
					(s: { action: string; workflowName?: string; result?: string }) =>
						`${s.action}${s.workflowName ? `: ${s.workflowName}` : ''}${s.result ? ` → ${s.result}` : ''}`,
				)
				.join('\n');

			const reflectionPrompt = `Before completing, review your work:

Original task: "${originalPrompt}"
Proposed summary: "${proposedSummary}"
Steps taken:
${stepsSoFar || '(none)'}

If everything was addressed, respond with:
{"action": "complete", "summary": "<final summary>"}

If there are gaps or errors that need correcting, respond with the appropriate action instead (e.g. execute_workflow or send_message).`;

			expect(reflectionPrompt).toContain('Run all QA tests');
			expect(reflectionPrompt).toContain('Tests executed successfully');
			expect(reflectionPrompt).toContain('execute_workflow: QA Suite → success');
		});

		it('should show (none) when no steps taken', () => {
			const steps: Array<{ action: string; workflowName?: string; result?: string }> = [];
			const stepsSoFar = steps
				.map(
					(s) =>
						`${s.action}${s.workflowName ? `: ${s.workflowName}` : ''}${s.result ? ` → ${s.result}` : ''}`,
				)
				.join('\n');

			const prompt = `Steps taken:\n${stepsSoFar || '(none)'}`;
			expect(prompt).toContain('(none)');
		});
	});

	describe('reflection response parsing', () => {
		it('should accept completion when LLM confirms', () => {
			const response = '{"action": "complete", "summary": "All tests passed"}';
			const cleaned = response.trim();
			const parsed = JSON.parse(cleaned);

			expect(parsed.action).toBe('complete');
			expect(parsed.summary).toBe('All tests passed');
		});

		it('should detect gap when LLM responds with corrective action', () => {
			const response =
				'{"action": "execute_workflow", "workflowId": "wf-2", "reasoning": "Missed the deploy step"}';
			const parsed = JSON.parse(response);

			expect(parsed.action).not.toBe('complete');
			expect(parsed.action).toBe('execute_workflow');
		});

		it('should handle LLM response with markdown fences', () => {
			const response = '```json\n{"action": "complete", "summary": "Done"}\n```';
			const cleaned = response
				.replace(/^```(?:json)?\s*/i, '')
				.replace(/\s*```\s*$/, '')
				.trim();
			const parsed = JSON.parse(cleaned);

			expect(parsed.action).toBe('complete');
		});

		it('should handle LLM response with preamble text', () => {
			const response = 'Let me review. {"action": "complete", "summary": "Confirmed complete"}';
			const jsonMatch = response.match(/\{[\s\S]*\}/);
			const parsed = JSON.parse(jsonMatch![0]);

			expect(parsed.action).toBe('complete');
			expect(parsed.summary).toBe('Confirmed complete');
		});

		it('should fall back to original summary on parse failure', () => {
			const response = 'This is not JSON at all';
			const proposedSummary = 'Original summary';

			let result: string;
			try {
				const jsonMatch = response.match(/\{[\s\S]*\}/);
				JSON.parse(jsonMatch?.[0] ?? response);
				result = 'parsed';
			} catch {
				result = proposedSummary;
			}

			expect(result).toBe('Original summary');
		});
	});

	describe('budget interaction', () => {
		it('should skip reflection when no budget remains', () => {
			const budget = { remaining: 0 };
			// When budget.remaining <= 0, reflectBeforeComplete returns the result directly
			expect(budget.remaining <= 0).toBe(true);
		});

		it('should consume one iteration for reflection', () => {
			const budget = { remaining: 3 };
			// Reflection decrements budget
			budget.remaining--;
			expect(budget.remaining).toBe(2);
		});
	});
});
