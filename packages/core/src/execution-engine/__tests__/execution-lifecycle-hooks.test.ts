import { mock } from 'jest-mock-extended';
import type {
	IDataObject,
	IExecuteResponsePromiseData,
	INode,
	IRun,
	IRunExecutionData,
	ITaskData,
	ITaskStartedData,
	IWorkflowBase,
	Workflow,
} from 'n8n-workflow';

import type {
	ExecutionLifecycleHookName,
	ExecutionLifecycleHookHandlers,
} from '../execution-lifecycle-hooks';
import { ExecutionLifecycleHooks } from '../execution-lifecycle-hooks';

describe('ExecutionLifecycleHooks', () => {
	const executionId = '123';
	const workflowData = mock<IWorkflowBase>();

	let hooks: ExecutionLifecycleHooks;
	beforeEach(() => {
		jest.clearAllMocks();
		hooks = new ExecutionLifecycleHooks('internal', executionId, workflowData);
	});

	describe('constructor()', () => {
		it('should initialize with correct properties', () => {
			expect(hooks.mode).toBe('internal');
			expect(hooks.executionId).toBe(executionId);
			expect(hooks.workflowData).toBe(workflowData);
			expect(hooks.handlers).toEqual({
				nodeExecuteAfter: [],
				nodeExecuteBefore: [],
				nodeFetchedData: [],
				sendResponse: [],
				workflowExecuteAfter: [],
				workflowExecuteBefore: [],
				sendChunk: [],
			});
		});
	});

	describe('addHandler()', () => {
		const hooksHandlers =
			mock<{
				[K in keyof ExecutionLifecycleHookHandlers]: ExecutionLifecycleHookHandlers[K][number];
			}>();

		const testCases: Array<{
			hook: ExecutionLifecycleHookName;
			args: Parameters<
				ExecutionLifecycleHookHandlers[keyof ExecutionLifecycleHookHandlers][number]
			>;
		}> = [
			{ hook: 'nodeExecuteBefore', args: ['testNode', mock<ITaskStartedData>()] },
			{
				hook: 'nodeExecuteAfter',
				args: ['testNode', mock<ITaskData>(), mock<IRunExecutionData>()],
			},
			{ hook: 'workflowExecuteBefore', args: [mock<Workflow>(), mock<IRunExecutionData>()] },
			{ hook: 'workflowExecuteAfter', args: [mock<IRun>(), mock<IDataObject>()] },
			{ hook: 'sendResponse', args: [mock<IExecuteResponsePromiseData>()] },
			{ hook: 'nodeFetchedData', args: ['workflow123', mock<INode>()] },
		];

		test.each(testCases)(
			'should add handlers to $hook hook and call them',
			async ({ hook, args }) => {
				hooks.addHandler(hook, hooksHandlers[hook]);
				await hooks.runHook(hook, args);
				expect(hooksHandlers[hook]).toHaveBeenCalledWith(...args);
			},
		);
	});

	describe('runHook()', () => {
		it('should execute multiple hooks in order', async () => {
			const executionOrder: string[] = [];
			const hook1 = jest.fn().mockImplementation(async () => {
				executionOrder.push('hook1');
			});
			const hook2 = jest.fn().mockImplementation(async () => {
				executionOrder.push('hook2');
			});

			hooks.addHandler('nodeExecuteBefore', hook1, hook2);
			await hooks.runHook('nodeExecuteBefore', ['testNode', mock()]);

			expect(executionOrder).toEqual(['hook1', 'hook2']);
			expect(hook1).toHaveBeenCalled();
			expect(hook2).toHaveBeenCalled();
		});

		it('should maintain correct "this" context', async () => {
			const hook = jest.fn().mockImplementation(async function (this: ExecutionLifecycleHooks) {
				expect(this.executionId).toBe(executionId);
				expect(this.mode).toBe('internal');
			});

			hooks.addHandler('nodeExecuteBefore', hook);
			await hooks.runHook('nodeExecuteBefore', ['testNode', mock()]);

			expect(hook).toHaveBeenCalled();
		});

		it('should handle errors in hooks', async () => {
			const errorHook = jest.fn().mockRejectedValue(new Error('Hook failed'));
			hooks.addHandler('nodeExecuteBefore', errorHook);

			await expect(hooks.runHook('nodeExecuteBefore', ['testNode', mock()])).rejects.toThrow(
				'Hook failed',
			);
		});
	});
});
