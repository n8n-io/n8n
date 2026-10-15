import type { IExecuteFunctions, INodeExecutionData, INodeTypes } from 'n8n-workflow';
import { Expression } from 'n8n-workflow';
import type { ExecuteContext } from 'n8n-core';
import { afterEach, describe, expect, it, vi } from 'vitest';

import type {
	NodeExecutionTraceContext,
	V1StepExecutorInstrumentation,
	V1StepExecutorPhase,
} from '../types';
import { V1_STEP_EXECUTOR_PHASES } from '../types';
import { V1StepExecutor } from '../v1-step-executor';
import { V1WorkflowConverter } from '../v1-workflow-converter';
import {
	items,
	stepRequest,
	testAdditionalDataFactory,
	testNodeTypes,
	v1Workflow,
} from './fixtures';

function recordingHooks(events: string[]): V1StepExecutorInstrumentation {
	return {
		async run<T>(
			phase: V1StepExecutorPhase,
			_metadata: NodeExecutionTraceContext,
			run: () => Promise<T>,
		) {
			events.push(`${phase}:start`);
			try {
				return await run();
			} catch (error) {
				events.push(`${phase}:fail`);
				throw error;
			} finally {
				events.push(`${phase}:end`);
			}
		},
		runSync<T>(phase: V1StepExecutorPhase, _metadata: NodeExecutionTraceContext, run: () => T) {
			events.push(`${phase}:start`);
			try {
				return run();
			} finally {
				events.push(`${phase}:end`);
			}
		},
		start(phase) {
			events.push(`${phase}:start`);
			return {
				end: () => events.push(`${phase}:end`),
				fail: () => events.push(`${phase}:fail`),
			};
		},
	};
}

const graph = new V1WorkflowConverter().convert(
	v1Workflow(
		[
			{ id: 't', name: 'Manual', type: 'n8n-nodes-base.manualTrigger' },
			{ id: 'n', name: 'Subject', type: 'test.echoParam', parameters: { message: 'hi' } },
		],
		{ Manual: { main: [[{ node: 'Subject', type: 'main', index: 0 }]] } },
	),
);

describe('V1StepExecutor phase hooks', () => {
	afterEach(() => vi.restoreAllMocks());

	it('exports one immutable phase list', () => {
		expect(Object.isFrozen(V1_STEP_EXECUTOR_PHASES)).toBe(true);
		expect(new Set(V1_STEP_EXECUTOR_PHASES).size).toBe(V1_STEP_EXECUTOR_PHASES.length);
	});

	it('measures data, setup, isolate entry, body, parallel cleanup, conversion, and isolate exit in order', async () => {
		const events: string[] = [];
		let finishCleanup!: () => void;
		const cleanupGate = new Promise<void>((resolve) => {
			finishCleanup = resolve;
		});
		let enteredCleanup!: () => void;
		const cleanupStarted = new Promise<void>((resolve) => {
			enteredCleanup = resolve;
		});
		const nodeTypes: INodeTypes = {
			...testNodeTypes,
			getByNameAndVersion: () => ({
				...testNodeTypes.getByNameAndVersion('test.echoParam'),
				async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
					(this as ExecuteContext).closeFunctions.push(
						async () => {
							events.push('close-a');
							await cleanupGate;
						},
						async () => {
							events.push('close-b');
							enteredCleanup();
						},
					);
					return [this.getInputData()];
				},
			}),
		};
		const original = Expression.prototype.withIsolate;
		vi.spyOn(Expression.prototype, 'withIsolate').mockImplementation(async function (
			this: Expression,
			run,
		) {
			events.push('scope-enter');
			try {
				return await original.call(this, run);
			} finally {
				events.push('scope-exit');
			}
		});
		const executor = new V1StepExecutor({
			nodeTypes,
			loadStepData: async () => ({ graph, outputsByNode: {} }),
			additionalDataFactory: testAdditionalDataFactory,
			instrumentation: recordingHooks(events),
			traceNodeExecution: async (_metadata, run) => {
				events.push('body:start');
				try {
					return await run();
				} finally {
					events.push('body:end');
				}
			},
		});
		const request = stepRequest(graph, 'n', items({ a: 1 }));
		const pending = executor.execute(request);
		await cleanupStarted;
		expect(events.slice(-3)).toEqual(['cleanup:start', 'close-a', 'close-b']);
		expect(events).not.toContain('cleanup:end');
		finishCleanup();
		await expect(pending).resolves.toEqual({ outputs: items({ a: 1 }) });
		expect(events).toEqual([
			'load-data:start',
			'load-data:end',
			'adapter-setup:start',
			'adapter-setup:end',
			'additional-data:start',
			'additional-data:end',
			'context-setup:start',
			'context-setup:end',
			'isolate-enter:start',
			'scope-enter',
			'isolate-enter:end',
			'body:start',
			'body:end',
			'cleanup:start',
			'close-a',
			'close-b',
			'cleanup:end',
			'result-conversion:start',
			'result-conversion:end',
			'isolate-exit:start',
			'scope-exit',
			'isolate-exit:end',
		]);
	});

	it.each(['load-data', 'additional-data'] as const)(
		'keeps %s open until the dependency settles',
		async (phase) => {
			const events: string[] = [];
			let release!: () => void;
			const gate = new Promise<void>((resolve) => {
				release = resolve;
			});
			let entered!: () => void;
			const started = new Promise<void>((resolve) => {
				entered = resolve;
			});
			const wait = async () => {
				entered();
				await gate;
			};
			const executor = new V1StepExecutor({
				nodeTypes: testNodeTypes,
				loadStepData: async () => {
					if (phase === 'load-data') await wait();
					return { graph, outputsByNode: {} };
				},
				additionalDataFactory: async (metadata) => {
					if (phase === 'additional-data') await wait();
					return await testAdditionalDataFactory(metadata);
				},
				instrumentation: recordingHooks(events),
			});
			const pending = executor.execute(stepRequest(graph, 'n', []));
			await started;
			expect(events.at(-1)).toBe(`${phase}:start`);
			release();
			await pending;
			expect(events).toContain(`${phase}:end`);
		},
	);

	it.each(['entry', 'callback', 'exit'] as const)(
		'closes measurement tokens after an isolate %s failure',
		async (where) => {
			const events: string[] = [];
			const error = new Error('same error');
			vi.spyOn(Expression.prototype, 'withIsolate').mockImplementation(async (run) => {
				if (where === 'entry') throw error;
				const result = await run();
				if (where === 'exit') throw error;
				return result;
			});
			const executor = new V1StepExecutor({
				nodeTypes: testNodeTypes,
				loadStepData: async () => ({ graph, outputsByNode: {} }),
				additionalDataFactory: testAdditionalDataFactory,
				instrumentation: recordingHooks(events),
				traceNodeExecution: async (_metadata, run) => {
					if (where === 'callback') throw error;
					return await run();
				},
			});
			await expect(executor.execute(stepRequest(graph, 'n', []))).rejects.toBe(error);
			if (where === 'entry') {
				expect(events.slice(-3)).toEqual([
					'isolate-enter:start',
					'isolate-enter:fail',
					'isolate-enter:end',
				]);
				expect(events).not.toContain('isolate-exit:start');
			} else {
				expect(events).toContain('isolate-enter:end');
				expect(events.slice(-(where === 'exit' ? 3 : 2))).toEqual(
					where === 'exit'
						? ['isolate-exit:start', 'isolate-exit:fail', 'isolate-exit:end']
						: ['isolate-exit:start', 'isolate-exit:end'],
				);
			}
		},
	);

	it.each(['entry', 'exit'] as const)(
		'keeps isolate %s open across the awaited scope boundary',
		async (where) => {
			const events: string[] = [];
			let release!: () => void;
			const gate = new Promise<void>((resolve) => {
				release = resolve;
			});
			let entered!: () => void;
			const started = new Promise<void>((resolve) => {
				entered = resolve;
			});
			const wait = async () => {
				entered();
				await gate;
			};
			vi.spyOn(Expression.prototype, 'withIsolate').mockImplementation(async (run) => {
				if (where === 'entry') await wait();
				const result = await run();
				if (where === 'exit') await wait();
				return result;
			});
			const pending = new V1StepExecutor({
				nodeTypes: testNodeTypes,
				loadStepData: async () => ({ graph, outputsByNode: {} }),
				additionalDataFactory: testAdditionalDataFactory,
				instrumentation: recordingHooks(events),
				traceNodeExecution: async (_metadata, run) => {
					events.push('body');
					return await run();
				},
			}).execute(stepRequest(graph, 'n', []));
			await started;
			expect(events.at(-1)).toBe(`isolate-${where === 'entry' ? 'enter' : 'exit'}:start`);
			if (where === 'entry') expect(events).not.toContain('body');
			else expect(events).toContain('body');
			release();
			await pending;
			expect(events.at(-1)).toBe('isolate-exit:end');
		},
	);

	it('marks exit failure when finalization replaces a callback failure', async () => {
		const events: string[] = [];
		const bodyError = new Error('body error');
		const releaseError = new Error('release error');
		vi.spyOn(Expression.prototype, 'withIsolate').mockImplementation(async (run) => {
			await run().catch(() => undefined);
			throw releaseError;
		});
		await expect(
			new V1StepExecutor({
				nodeTypes: testNodeTypes,
				loadStepData: async () => ({ graph, outputsByNode: {} }),
				additionalDataFactory: testAdditionalDataFactory,
				instrumentation: recordingHooks(events),
				traceNodeExecution: async () => {
					throw bodyError;
				},
			}).execute(stepRequest(graph, 'n', [])),
		).rejects.toBe(releaseError);
		expect(events.slice(-3)).toEqual([
			'isolate-exit:start',
			'isolate-exit:fail',
			'isolate-exit:end',
		]);
	});

	it('does not read measurement metadata when hooks are absent', async () => {
		const request = stepRequest(graph, 'n', []);
		const stepId = vi.fn(() => {
			throw new Error('metadata read');
		});
		Object.defineProperty(request.context, 'stepId', { get: stepId });
		await expect(
			new V1StepExecutor({
				nodeTypes: testNodeTypes,
				loadStepData: async () => ({ graph, outputsByNode: {} }),
				additionalDataFactory: testAdditionalDataFactory,
			}).execute(request),
		).resolves.toEqual({ outputs: items({ message: 'hi' }) });
		expect(stepId).not.toHaveBeenCalled();
	});
});
