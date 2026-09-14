import type { BaseChatModel } from '@langchain/core/language_models/chat_models';
import pLimit from 'p-limit';
import { mock } from 'vitest-mock-extended';

import type { SimpleWorkflow } from '@/types/workflow';

import { runJudgePanel } from './judge-panel';

const mockEvaluateWorkflowPairwise = vi.fn();

vi.mock('./judge-chain', () => ({
	evaluateWorkflowPairwise: (...args: unknown[]): unknown => mockEvaluateWorkflowPairwise(...args),
}));

function createMockWorkflow(name = 'Test Workflow'): SimpleWorkflow {
	return { name, nodes: [], connections: {} };
}

describe('runJudgePanel()', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('should respect llmCallLimiter concurrency', async () => {
		let active = 0;
		let maxActive = 0;

		mockEvaluateWorkflowPairwise.mockImplementation(async () => {
			active++;
			maxActive = Math.max(maxActive, active);
			await new Promise((r) => setTimeout(r, 20));
			active--;
			return { violations: [], passes: [], primaryPass: true, diagnosticScore: 1 };
		});

		const llm = mock<BaseChatModel>();
		const workflow = createMockWorkflow();

		await runJudgePanel(llm, workflow, { dos: 'Do X', donts: 'Do not Y' }, 5, {
			llmCallLimiter: pLimit(2),
		});

		expect(maxActive).toBeLessThanOrEqual(2);
		expect(mockEvaluateWorkflowPairwise).toHaveBeenCalledTimes(5);
	});
});
