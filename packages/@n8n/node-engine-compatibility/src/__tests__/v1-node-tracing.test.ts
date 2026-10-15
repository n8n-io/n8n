import type { WorkflowGraph } from '@n8n/engine';
import { describe, expect, it, vi } from 'vitest';

import type { V1StepExecutorDeps } from '../types';
import { V1StepExecutor } from '../v1-step-executor';
import { V1WorkflowConverter } from '../v1-workflow-converter';
import {
	items,
	stepRequest,
	testAdditionalDataFactory,
	testNodeTypes,
	v1Workflow,
} from './fixtures';

function graphFor(type: string): WorkflowGraph {
	return new V1WorkflowConverter().convert(
		v1Workflow(
			[
				{ id: 'trigger', name: 'Manual', type: 'n8n-nodes-base.manualTrigger' },
				{ id: 'subject', name: 'Subject', type },
			],
			{ Manual: { main: [[{ node: 'Subject', type: 'main', index: 0 }]] } },
		),
	);
}

function executorFor(
	graph: WorkflowGraph,
	traceNodeExecution?: V1StepExecutorDeps['traceNodeExecution'],
) {
	return new V1StepExecutor({
		nodeTypes: testNodeTypes,
		loadStepData: async () => ({ graph, outputsByNode: {} }),
		additionalDataFactory: testAdditionalDataFactory,
		traceNodeExecution,
	});
}

describe('v1 node measurement boundary', () => {
	it('preserves the uninstrumented node result', async () => {
		const graph = graphFor('n8n-nodes-base.noOp');
		const input = items({ value: 'kept' });
		const result = await executorFor(graph).execute(stepRequest(graph, 'subject', input));
		expect(result.outputs).toEqual(input);
	});

	it('starts the measurement after executor setup and passes only safe identifiers', async () => {
		const graph = graphFor('n8n-nodes-base.noOp');
		const events: string[] = [];
		const traceNodeExecution = vi.fn<NonNullable<V1StepExecutorDeps['traceNodeExecution']>>(
			async (metadata, run) => {
				events.push('node:start');
				expect(metadata).toEqual({
					executionId: 'exec-1',
					stepId: 'subject',
					workflowId: 'wf-1',
					iteration: 0,
					nodeId: 'subject',
					nodeType: 'n8n-nodes-base.noOp',
				});
				const result = await run();
				events.push('node:end');
				return result;
			},
		);
		const executor = new V1StepExecutor({
			nodeTypes: testNodeTypes,
			loadStepData: async () => {
				events.push('load');
				return { graph, outputsByNode: {} };
			},
			additionalDataFactory: async (context) => {
				events.push('context');
				return await testAdditionalDataFactory(context);
			},
			traceNodeExecution,
		});
		const input = items({ password: 'not-for-traces' });
		const result = await executor.execute(stepRequest(graph, 'subject', input));
		expect(result.outputs).toEqual(input);
		expect(events).toEqual(['load', 'context', 'node:start', 'node:end']);
		expect(traceNodeExecution).toHaveBeenCalledOnce();
		expect(JSON.stringify(traceNodeExecution.mock.calls[0][0])).not.toContain('not-for-traces');
	});

	it('ends the node measurement before cleanup runs', async () => {
		const graph = graphFor('test.succeedsWithFailingCleanup');
		let nodeFinished = false;
		const executor = executorFor(graph, async (_metadata, run) => {
			const result = await run();
			nodeFinished = true;
			return result;
		});
		await expect(
			executor.execute(stepRequest(graph, 'subject', items({ value: 'kept' }))),
		).rejects.toThrow('cleanup boom');
		expect(nodeFinished).toBe(true);
	});

	it('preserves node failures through the measurement callback', async () => {
		const graph = graphFor('test.alwaysFails');
		let nodeFailure: unknown;
		const executor = executorFor(graph, async (_metadata, run) => {
			try {
				return await run();
			} catch (error) {
				nodeFailure = error;
				throw error;
			}
		});
		await expect(executor.execute(stepRequest(graph, 'subject', items({})))).rejects.toThrow(
			'boom from node',
		);
		expect(nodeFailure).toBeInstanceOf(Error);
	});

	it('keeps the context argument for new-style nodes', async () => {
		const graph = graphFor('test.newStyleEcho');
		const executor = executorFor(graph, async (_metadata, run) => await run());
		const result = await executor.execute(stepRequest(graph, 'subject', items({ value: 'kept' })));
		expect(result.outputs).toEqual([[{ json: { value: 'kept', newStyle: true } }]]);
	});
});
