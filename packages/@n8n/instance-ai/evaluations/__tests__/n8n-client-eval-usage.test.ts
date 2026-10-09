import type { InstanceAiEvalLlmUsage } from '@n8n/api-types';
import { afterEach, vi } from 'vitest';

import { EvalUsageMeter } from '../../src/utils/eval-usage';
import { N8nClient } from '../clients/n8n-client';

const MOCK_RESPONDER_USAGE: InstanceAiEvalLlmUsage = {
	agent: 'eval-mock-responder',
	model: 'anthropic/claude-sonnet-4-6',
	calls: 4,
	uncachedInputTokens: 2400,
	cacheReadTokens: 0,
	cacheWriteTokens: 0,
	outputTokens: 600,
};

function mockFetch(data: unknown) {
	vi.stubGlobal(
		'fetch',
		vi.fn(() => ({
			ok: true,
			status: 200,
			headers: { get: () => null },
			json: () => ({ data }),
			text: () => '',
		})),
	);
}

afterEach(() => vi.unstubAllGlobals());

describe('N8nClient eval runs', () => {
	it('adds the model usage a workflow scenario run reports to the current meter', async () => {
		mockFetch({ executionId: 'exec-1', success: true, llmUsage: [MOCK_RESPONDER_USAGE] });
		const meter = new EvalUsageMeter();

		await meter.run(async () => await new N8nClient('http://n8n.test').executeWithLlmMock('wf-1'));

		expect(meter.entries()).toEqual([MOCK_RESPONDER_USAGE]);
	});

	it('adds the model usage an agent scenario run reports to the current meter', async () => {
		mockFetch({ runId: 'run-1', success: true, llmUsage: [MOCK_RESPONDER_USAGE] });
		const meter = new EvalUsageMeter();

		await meter.run(
			async () =>
				await new N8nClient('http://n8n.test').executeAgentWithLlmMock('agent-1', 'project-1'),
		);

		expect(meter.entries()).toEqual([MOCK_RESPONDER_USAGE]);
	});
});
