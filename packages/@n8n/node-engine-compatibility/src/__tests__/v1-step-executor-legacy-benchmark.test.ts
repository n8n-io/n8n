import type { V1StepExecutorInstrumentation } from '../types';
import { Expression } from 'n8n-workflow';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';

import { VmExpressionEngineRequiredError } from '../errors';
import { V1StepExecutor } from '../v1-step-executor';
import { V1WorkflowConverter } from '../v1-workflow-converter';
import {
	items,
	stepRequest,
	testAdditionalDataFactory,
	testNodeTypes,
	v1Workflow,
} from './fixtures';

beforeAll(async () => {
	await Expression.disposeExpressionEngine();
	Expression.setExpressionEngine('legacy');
});

afterEach(() => vi.restoreAllMocks());

const graphFor = (type = 'n8n-nodes-base.noOp', parameters = {}) =>
	new V1WorkflowConverter().convert(
		v1Workflow(
			[
				{ id: 't', name: 'Manual', type: 'n8n-nodes-base.manualTrigger' },
				{ id: 'n', name: 'Subject', type, parameters },
			],
			{ Manual: { main: [[{ node: 'Subject', type: 'main', index: 0 }]] } },
		),
	);

describe('explicit legacy NoOp benchmark', () => {
	it.each([
		{ instrumented: false, parameters: {} },
		{ instrumented: true, parameters: {} },
		{ instrumented: false, parameters: { emptyGroupAnchor: false } },
		{ instrumented: true, parameters: { emptyGroupAnchor: false } },
	])(
		'runs the NoOp without a VM evaluator with instrumentation=$instrumented and parameters=$parameters',
		async ({ instrumented, parameters }) => {
			const graph = graphFor('n8n-nodes-base.noOp', parameters);
			const events: string[] = [];
			const instrumentation: V1StepExecutorInstrumentation = {
				async run(phase, _metadata, operation) {
					events.push(phase);
					return await operation();
				},
				runSync(phase, _metadata, operation) {
					events.push(phase);
					return operation();
				},
				start(phase) {
					events.push(phase);
					return {
						end: () => {},
						fail: () => {
							throw new Error('The NoOp phase failed.');
						},
					};
				},
			};
			const acquire = vi.spyOn(Expression.prototype, 'acquireIsolate');
			const executor = new V1StepExecutor({
				nodeTypes: testNodeTypes,
				additionalDataFactory: testAdditionalDataFactory,
				loadStepData: async () => ({ graph, outputsByNode: {} }),
				allowLegacyNoopBenchmark: true,
				instrumentation: instrumented ? instrumentation : undefined,
			});
			expect(Expression.getActiveImplementation()).toBe('legacy');
			const result = await executor.execute(stepRequest(graph, 'n', items({ value: 1 })));
			expect(result.outputs).toEqual([[{ json: { value: 1 } }]]);
			expect(acquire).toHaveBeenCalledOnce();
			expect(await acquire.mock.results[0].value).toBe(false);
			if (instrumented) expect(events).toContain('isolate-enter');
		},
	);

	it.each([{}, { emptyGroupAnchor: false }])(
		'keeps the default legacy rejection with parameters %j',
		async (parameters) => {
			const graph = graphFor('n8n-nodes-base.noOp', parameters);
			const loadStepData = vi.fn(async () => ({ graph, outputsByNode: {} }));
			const executor = new V1StepExecutor({
				nodeTypes: testNodeTypes,
				additionalDataFactory: testAdditionalDataFactory,
				loadStepData,
			});
			await expect(executor.execute(stepRequest(graph, 'n', items({ value: 1 })))).rejects.toThrow(
				VmExpressionEngineRequiredError,
			);
			expect(loadStepData).not.toHaveBeenCalled();
		},
	);

	it.each([
		['test.echoParam', {}],
		['n8n-nodes-base.noOp', { unused: 'value' }],
		['n8n-nodes-base.noOp', { emptyGroupAnchor: true }],
		['n8n-nodes-base.noOp', { emptyGroupAnchor: 'false' }],
		['n8n-nodes-base.noOp', { emptyGroupAnchor: '={{ false }}' }],
		['n8n-nodes-base.noOp', { emptyGroupAnchor: false, unused: false }],
	])('rejects legacy benchmark type %s with parameters %j', async (type, parameters) => {
		const graph = graphFor(type, parameters);
		const executor = new V1StepExecutor({
			nodeTypes: testNodeTypes,
			additionalDataFactory: testAdditionalDataFactory,
			loadStepData: async () => ({ graph, outputsByNode: {} }),
			allowLegacyNoopBenchmark: true,
		});
		await expect(executor.execute(stepRequest(graph, 'n', items({ value: 1 })))).rejects.toThrow(
			VmExpressionEngineRequiredError,
		);
	});

	it.each(['credentials', 'continueOnFail', 'typeVersion'])(
		'rejects a NoOp benchmark with changed %s',
		async (field) => {
			const graph = graphFor();
			const request = stepRequest(graph, 'n', items({ value: 1 }));
			const config = request.node.config as Record<string, unknown>;
			config[field] =
				field === 'credentials'
					? { unused: { id: 'credential-1', name: 'Fixture' } }
					: field === 'typeVersion'
						? 2
						: true;
			const executor = new V1StepExecutor({
				nodeTypes: testNodeTypes,
				additionalDataFactory: testAdditionalDataFactory,
				loadStepData: async () => ({ graph, outputsByNode: {} }),
				allowLegacyNoopBenchmark: true,
			});
			await expect(executor.execute(request)).rejects.toThrow(VmExpressionEngineRequiredError);
		},
	);
});
