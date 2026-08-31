import type { MetricScale } from '@n8n/api-types';
import type { TestRun } from '@n8n/db';

import { runMetricScales } from '../metric-scales';

describe('runMetricScales', () => {
	const OPENAI = '@n8n/n8n-nodes-langchain.lmChatOpenAi';
	const judgeSnapshot = {
		id: 'cfg-1',
		metrics: [
			{
				id: 'm1',
				name: 'Foo',
				type: 'llm_judge',
				config: {
					preset: 'correctness',
					provider: OPENAI,
					credentialId: 'c',
					model: 'gpt-4o',
					outputType: 'numeric',
					inputs: { actualAnswer: 'a', expectedAnswer: 'b' },
				},
			},
		],
	};

	const run = (snapshot: unknown) =>
		({ evaluationConfigSnapshot: snapshot }) as Pick<TestRun, 'evaluationConfigSnapshot'>;

	it("resolves a run's scales from its own frozen snapshot", () => {
		expect(runMetricScales(run(judgeSnapshot), {})).toEqual({ Foo: 'oneToFive' });
	});

	it('falls back to the default scales when the run has no usable snapshot', () => {
		const defaultScales: Record<string, MetricScale> = { Bar: 'unit' };
		expect(runMetricScales(run(null), defaultScales)).toBe(defaultScales);
		expect(runMetricScales(run({ junk: 1 }), defaultScales)).toBe(defaultScales);
	});
});
