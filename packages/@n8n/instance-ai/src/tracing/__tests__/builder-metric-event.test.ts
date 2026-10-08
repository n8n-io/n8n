import { describe, expect, it, vi } from 'vitest';

import type { InstanceAiTraceContext } from '../../types';
import { BUILDER_METRIC_TAG, emitBuilderMetric } from '../builder-metric-event';

function makeTracing(startChildRun = vi.fn(async () => await Promise.resolve({ id: 'run-1' }))) {
	const finishRun = vi.fn(async () => await Promise.resolve());
	const tracing = {
		actorRun: { id: 'actor-run-1' },
		startChildRun,
		finishRun,
	} as unknown as InstanceAiTraceContext;
	return { tracing, startChildRun, finishRun };
}

describe('emitBuilderMetric', () => {
	it('emits a tagged chain run with the fields as metadata and outputs', async () => {
		const { tracing, startChildRun, finishRun } = makeTracing();

		await emitBuilderMetric(tracing, 'workflow_build', {
			success: false,
			stage: 'parse',
			workflow_id: undefined,
		});

		expect(startChildRun).toHaveBeenCalledWith(
			{ id: 'actor-run-1' },
			{
				name: 'workflow_build',
				runType: 'chain',
				canonicalName: 'instance-ai.metric.workflow_build',
				tags: [BUILDER_METRIC_TAG],
				metadata: { success: false, stage: 'parse' },
			},
		);
		expect(finishRun).toHaveBeenCalledWith(
			{ id: 'run-1' },
			{ outputs: { success: false, stage: 'parse' } },
		);
	});

	it('does not throw when the trace export fails', async () => {
		const { tracing } = makeTracing(vi.fn(async () => await Promise.reject(new Error('down'))));

		await expect(
			emitBuilderMetric(tracing, 'agent_test', { success: true }),
		).resolves.toBeUndefined();
	});

	it('is a no-op without a trace', async () => {
		await expect(emitBuilderMetric(undefined, 'agent_build', { success: true })).resolves.toBe(
			undefined,
		);
	});
});
