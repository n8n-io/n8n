import { UnexpectedError } from 'n8n-workflow';
import type {
	Workflow,
	INode,
	INodeExecutionData,
	IPollFunctions,
	IWorkflowExecuteAdditionalData,
	INodeType,
	INodeTypes,
	ITriggerFunctions,
	IRun,
} from 'n8n-workflow';
import { mock } from 'vitest-mock-extended';

import { ExecutionLifecycleHooks } from '../execution-lifecycle-hooks';
import { TriggersAndPollers } from '../triggers-and-pollers';

describe('TriggersAndPollers', () => {
	const node = mock<INode>();
	const nodeType = mock<INodeType>({
		trigger: undefined,
		poll: undefined,
	});
	const nodeTypes = mock<INodeTypes>();
	const workflow = mock<Workflow>({ nodeTypes });
	const hooks = new ExecutionLifecycleHooks('internal', '123', mock());
	const additionalData = mock<IWorkflowExecuteAdditionalData>({ hooks });
	const triggersAndPollers = new TriggersAndPollers();

	beforeEach(() => {
		vi.clearAllMocks();
		nodeTypes.getByNameAndVersion.mockReturnValue(nodeType);
	});

	describe('runTriggerFunction()', () => {
		const triggerFunctions = mock<ITriggerFunctions>();
		const getTriggerFunctions = vi.fn().mockReturnValue(triggerFunctions);
		const triggerFn = vi.fn();
		const mockEmitData: INodeExecutionData[][] = [[{ json: { data: 'test' } }]];

		const runTriggerHelper = async (mode: 'manual' | 'trigger' = 'trigger') =>
			await triggersAndPollers.runTriggerFunction(
				workflow,
				node,
				getTriggerFunctions,
				additionalData,
				mode,
				'init',
			);

		it('should throw error if node type does not have trigger function', async () => {
			await expect(runTriggerHelper()).rejects.toThrow(UnexpectedError);
		});

		it('should call trigger function in regular mode', async () => {
			nodeType.trigger = triggerFn;
			triggerFn.mockResolvedValue({ test: true });

			const result = await runTriggerHelper();

			expect(triggerFn).toHaveBeenCalled();
			expect(result).toEqual({ test: true });
		});

		describe('closeFunction isolate wrapping', () => {
			const originalClose = vi.fn(async () => {});
			const withIsolate = vi.fn(async (fn: () => Promise<void>) => await fn());

			beforeEach(() => {
				nodeType.trigger = triggerFn;
				workflow.expression = { withIsolate } as unknown as Workflow['expression'];
			});

			it('wraps closeFunction so teardown runs inside workflow.expression.withIsolate', async () => {
				triggerFn.mockResolvedValue({ closeFunction: originalClose });

				const response = await runTriggerHelper();

				expect(response?.closeFunction).not.toBe(originalClose);
				expect(originalClose).not.toHaveBeenCalled();

				await response!.closeFunction!();

				expect(withIsolate).toHaveBeenCalledTimes(1);
				expect(originalClose).toHaveBeenCalledTimes(1);
				const [isolateOrder] = withIsolate.mock.invocationCallOrder;
				const [closeOrder] = originalClose.mock.invocationCallOrder;
				expect(isolateOrder).toBeLessThan(closeOrder);
			});

			it('wraps closeFunction in manual mode too', async () => {
				triggerFn.mockResolvedValue({ closeFunction: originalClose });

				const response = await runTriggerHelper('manual');

				expect(response?.closeFunction).not.toBe(originalClose);
				await response!.closeFunction!();
				expect(withIsolate).toHaveBeenCalledTimes(1);
				expect(originalClose).toHaveBeenCalledTimes(1);
			});

			it('propagates a closeFunction rejection through the wrapper', async () => {
				const closeError = new Error('close failed');
				originalClose.mockRejectedValueOnce(closeError);
				triggerFn.mockResolvedValue({ closeFunction: originalClose });

				const response = await runTriggerHelper();

				await expect(response!.closeFunction!()).rejects.toThrow(closeError);
			});
		});

		describe('manual mode', () => {
			const getMockTriggerFunctions = () => getTriggerFunctions.mock.results[0]?.value;

			beforeEach(() => {
				nodeType.trigger = triggerFn;
				triggerFn.mockResolvedValue({ workflowId: '123' });
			});

			it('should handle promise resolution', async () => {
				const result = await runTriggerHelper('manual');

				expect(result?.manualTriggerResponse).toBeInstanceOf(Promise);
				getMockTriggerFunctions()?.emit?.(mockEmitData);
			});

			it('should handle error emission', async () => {
				const testError = new Error('Test error');
				const result = await runTriggerHelper('manual');

				getMockTriggerFunctions()?.emitError?.(testError);
				await expect(result?.manualTriggerResponse).rejects.toThrow(testError);
			});

			it('should handle response promise', async () => {
				const responsePromise = { resolve: vi.fn(), reject: vi.fn() };
				await runTriggerHelper('manual');

				getMockTriggerFunctions()?.emit?.(mockEmitData, responsePromise);

				await hooks.runHook('sendResponse', [{ testResponse: true }]);
				expect(responsePromise.resolve).toHaveBeenCalledWith({ testResponse: true });
			});

			it('should handle both response and done promises', async () => {
				const responsePromise = { resolve: vi.fn(), reject: vi.fn() };
				const donePromise = { resolve: vi.fn(), reject: vi.fn() };
				const mockRunData = mock<IRun>({ data: { resultData: { runData: {} } } });

				await runTriggerHelper('manual');
				getMockTriggerFunctions()?.emit?.(mockEmitData, responsePromise, donePromise);

				await hooks.runHook('sendResponse', [{ testResponse: true }]);
				expect(responsePromise.resolve).toHaveBeenCalledWith({ testResponse: true });

				await hooks.runHook('workflowExecuteAfter', [mockRunData, {}]);
				expect(donePromise.resolve).toHaveBeenCalledWith(mockRunData);
			});
		});
	});

	describe('runPollFunction()', () => {
		const pollFunctions = mock<IPollFunctions>();
		const pollFn = vi.fn();

		const runPollHelper = async () =>
			await triggersAndPollers.runPollFunction(workflow, node, pollFunctions);

		it('should throw error if node type does not have poll function', async () => {
			await expect(runPollHelper()).rejects.toThrow(UnexpectedError);
		});

		it('should call poll function and return result', async () => {
			const mockPollResult: INodeExecutionData[][] = [[{ json: { data: 'test' } }]];
			nodeType.poll = pollFn;
			pollFn.mockResolvedValue(mockPollResult);

			const result = await runPollHelper();

			expect(pollFn).toHaveBeenCalled();
			expect(result).toBe(mockPollResult);
		});

		it('should return null if poll function returns no data', async () => {
			nodeType.poll = pollFn;
			pollFn.mockResolvedValue(null);

			const result = await runPollHelper();

			expect(pollFn).toHaveBeenCalled();
			expect(result).toBeNull();
		});

		it('should propagate errors from poll function', async () => {
			nodeType.poll = pollFn;
			pollFn.mockRejectedValue(new Error('Poll function failed'));

			await expect(runPollHelper()).rejects.toThrow('Poll function failed');
			expect(pollFn).toHaveBeenCalled();
		});
	});
});
