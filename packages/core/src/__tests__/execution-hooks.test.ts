import { mock } from 'jest-mock-extended';
import type {
	IDataObject,
	IExecuteResponsePromiseData,
	INode,
	IRun,
	IRunExecutionData,
	ITaskData,
	IWorkflowBase,
	Workflow,
} from 'n8n-workflow';

import type { ExecutionHookName, RegisteredHooks } from '@/execution-hooks';
import { ExecutionHooks } from '@/execution-hooks';

describe('ExecutionHooks', () => {
	const executionId = '123';
	const pushRef = 'test-ref';
	const retryOf = 'test-retry';
	const workflowData = mock<IWorkflowBase>();

	let hooks: ExecutionHooks;
	beforeEach(() => {
		jest.clearAllMocks();
		hooks = new ExecutionHooks('internal', executionId, workflowData, {
			pushRef,
			retryOf,
		});
	});

	describe('constructor()', () => {
		it('should initialize with correct properties', () => {
			expect(hooks.mode).toBe('internal');
			expect(hooks.executionId).toBe(executionId);
			expect(hooks.workflowData).toBe(workflowData);
			expect(hooks.pushRef).toBe(pushRef);
			expect(hooks.retryOf).toBe(retryOf);
			// @ts-expect-error private property
			expect(hooks.registered).toEqual({
				nodeExecuteAfter: [],
				nodeExecuteBefore: [],
				nodeFetchedData: [],
				sendResponse: [],
				workflowExecuteAfter: [],
				workflowExecuteBefore: [],
			});
		});
	});

	describe('addHook()', () => {
		const hooksHandler =
			mock<{
				[K in keyof RegisteredHooks]: RegisteredHooks[K][number];
			}>();

		const testCases: Array<{ hook: ExecutionHookName; args: unknown[] }> = [
			{ hook: 'nodeExecuteBefore', args: ['testNode'] },
			{
				hook: 'nodeExecuteAfter',
				args: ['testNode', mock<ITaskData>(), mock<IRunExecutionData>()],
			},
			{ hook: 'workflowExecuteBefore', args: [mock<Workflow>(), mock<IRunExecutionData>()] },
			{ hook: 'workflowExecuteAfter', args: [mock<IRun>(), mock<IDataObject>()] },
			{ hook: 'sendResponse', args: [mock<IExecuteResponsePromiseData>()] },
			{ hook: 'nodeFetchedData', args: ['workflow123', mock<INode>()] },
		];

		test.each(testCases)('should add and process $hook hooks', async ({ hook, args }) => {
			hooks.addHook(hook, hooksHandler[hook]);
			await hooks.executeHook(hook, args);
			expect(hooksHandler[hook]).toHaveBeenCalledWith(...args);
		});
	});

	describe('executeHook()', () => {
		it('should execute multiple hooks in order', async () => {
			const executionOrder: string[] = [];
			const hook1 = jest.fn().mockImplementation(async () => {
				executionOrder.push('hook1');
			});
			const hook2 = jest.fn().mockImplementation(async () => {
				executionOrder.push('hook2');
			});

			hooks.addHook('nodeExecuteBefore', hook1, hook2);
			await hooks.executeHook('nodeExecuteBefore', ['testNode']);

			expect(executionOrder).toEqual(['hook1', 'hook2']);
			expect(hook1).toHaveBeenCalled();
			expect(hook2).toHaveBeenCalled();
		});

		it('should maintain correct "this" context', async () => {
			const hook = jest.fn().mockImplementation(async function (this: ExecutionHooks) {
				expect(this.executionId).toBe(executionId);
				expect(this.mode).toBe('internal');
			});

			hooks.addHook('nodeExecuteBefore', hook);
			await hooks.executeHook('nodeExecuteBefore', ['testNode']);

			expect(hook).toHaveBeenCalled();
		});

		it('should handle errors in hooks', async () => {
			const errorHook = jest.fn().mockRejectedValue(new Error('Hook failed'));
			hooks.addHook('nodeExecuteBefore', errorHook);

			await expect(hooks.executeHook('nodeExecuteBefore', ['testNode'])).rejects.toThrow(
				'Hook failed',
			);
		});
	});
});
