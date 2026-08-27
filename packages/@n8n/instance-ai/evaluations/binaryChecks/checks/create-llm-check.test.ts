import { describe, expect, it, vi } from 'vitest';

import { createLlmCheck } from './create-llm-check';
import type { WorkflowResponse } from '../../clients/n8n-client';

const mocks = vi.hoisted(() => ({
	generate: vi.fn(),
}));

vi.mock('../../../src/utils/eval-agents', () => ({
	createEvalAgent: vi.fn(() => ({ generate: mocks.generate })),
	extractText: vi.fn((result: { text?: string }) => result.text ?? ''),
}));

describe('createLlmCheck', () => {
	it('marks LLM check timeouts as errored, not N/A or failed', async () => {
		mocks.generate.mockReturnValue(new Promise(() => {}));

		const check = createLlmCheck({
			name: 'slow_check',
			description: 'slow check',
			dimension: 'intent_match',
			systemPrompt: 'Judge the workflow.',
			humanTemplate: 'Workflow: {generatedWorkflow}',
		});

		await expect(
			check.run({} as WorkflowResponse, {
				prompt: 'Build a workflow',
				modelId: 'anthropic/test',
				timeoutMs: 1,
			}),
		).resolves.toEqual({
			pass: false,
			errored: true,
			comment: 'LLM check "slow_check" timed out after 1ms',
		});
	});

	it('marks an unparseable verdict as errored, not failed', async () => {
		// Observed live: the judge answered with a markdown analysis that ticked the
		// requirements off as satisfied, but carried no parseable verdict. Scoring
		// that as a failure reports a defect in the workflow that isn't there.
		mocks.generate.mockResolvedValue({
			text: '## Analysis\n**Requirement 1** — satisfied ✓\n**Requirement 2** — satisfied ✓',
		});

		const check = createLlmCheck({
			name: 'chatty_check',
			description: 'chatty check',
			dimension: 'intent_match',
			systemPrompt: 'Judge the workflow.',
			humanTemplate: 'Workflow: {generatedWorkflow}',
		});

		const result = await check.run({} as WorkflowResponse, {
			prompt: 'Build a workflow',
			modelId: 'anthropic/test',
		});

		expect(result.pass).toBe(false);
		expect(result.errored).toBe(true);
		expect(result.comment).toContain('Failed to parse LLM response');
	});
});
