import { mock } from 'jest-mock-extended';
import { ApplicationError } from 'n8n-workflow';
import type {
	Workflow,
	INode,
	INodeExecutionData,
	IPollFunctions,
	IWorkflowExecuteAdditionalData,
	INodeType,
	INodeTypes,
	ITriggerFunctions,
} from 'n8n-workflow';

import { TriggersAndPollers } from '@/TriggersAndPollers';

describe('TriggersAndPollers', () => {
	const node = mock<INode>();
	const nodeType = mock<INodeType>({
		trigger: undefined,
		poll: undefined,
	});
	const nodeTypes = mock<INodeTypes>();
	const workflow = mock<Workflow>({ nodeTypes });
	const additionalData = mock<IWorkflowExecuteAdditionalData>({
		hooks: {
			hookFunctions: {
				sendResponse: [],
			},
		},
	});
	const triggersAndPollers = new TriggersAndPollers();

	beforeEach(() => {
		jest.clearAllMocks();
		nodeTypes.getByNameAndVersion.mockReturnValue(nodeType);
	});

	describe('runTrigger()', () => {
		const triggerFunctions = mock<ITriggerFunctions>();
		const getTriggerFunctions = jest.fn().mockReturnValue(triggerFunctions);
		const triggerFn = jest.fn();

		it('should throw error if node type does not have trigger function', async () => {
			await expect(
				triggersAndPollers.runTrigger(
					workflow,
					node,
					getTriggerFunctions,
					additionalData,
					'trigger',
					'init',
				),
			).rejects.toThrow(ApplicationError);
		});

		it('should call trigger function in regular mode', async () => {
			nodeType.trigger = triggerFn;
			triggerFn.mockResolvedValue({ test: true });

			const result = await triggersAndPollers.runTrigger(
				workflow,
				node,
				getTriggerFunctions,
				additionalData,
				'trigger',
				'init',
			);

			expect(triggerFn).toHaveBeenCalled();
			expect(result).toEqual({ test: true });
		});

		it('should handle manual mode with promise resolution', async () => {
			const mockEmitData: INodeExecutionData[][] = [[{ json: { data: 'test' } }]];
			const mockTriggerResponse = { workflowId: '123' };

			nodeType.trigger = triggerFn;
			triggerFn.mockResolvedValue(mockTriggerResponse);

			const result = await triggersAndPollers.runTrigger(
				workflow,
				node,
				getTriggerFunctions,
				additionalData,
				'manual',
				'init',
			);

			expect(result).toBeDefined();
			expect(result?.manualTriggerResponse).toBeInstanceOf(Promise);

			// Simulate emit
			const mockTriggerFunctions = getTriggerFunctions.mock.results[0]?.value;
			if (mockTriggerFunctions?.emit) {
				mockTriggerFunctions.emit(mockEmitData);
			}
		});

		it('should handle error emission in manual mode', async () => {
			const testError = new Error('Test error');

			nodeType.trigger = triggerFn;
			triggerFn.mockResolvedValue({});

			const result = await triggersAndPollers.runTrigger(
				workflow,
				node,
				getTriggerFunctions,
				additionalData,
				'manual',
				'init',
			);

			expect(result?.manualTriggerResponse).toBeInstanceOf(Promise);

			// Simulate error
			const mockTriggerFunctions = getTriggerFunctions.mock.results[0]?.value;
			if (mockTriggerFunctions?.emitError) {
				mockTriggerFunctions.emitError(testError);
			}

			await expect(result?.manualTriggerResponse).rejects.toThrow(testError);
		});
	});

	describe('runPoll()', () => {
		const pollFunctions = mock<IPollFunctions>();
		const pollFn = jest.fn();

		it('should throw error if node type does not have poll function', async () => {
			await expect(triggersAndPollers.runPoll(workflow, node, pollFunctions)).rejects.toThrow(
				ApplicationError,
			);
		});

		it('should call poll function and return result', async () => {
			const mockPollResult: INodeExecutionData[][] = [[{ json: { data: 'test' } }]];
			nodeType.poll = pollFn;
			pollFn.mockResolvedValue(mockPollResult);

			const result = await triggersAndPollers.runPoll(workflow, node, pollFunctions);

			expect(pollFn).toHaveBeenCalled();
			expect(result).toBe(mockPollResult);
		});

		it('should return null if poll function returns no data', async () => {
			nodeType.poll = pollFn;
			pollFn.mockResolvedValue(null);

			const result = await triggersAndPollers.runPoll(workflow, node, pollFunctions);

			expect(pollFn).toHaveBeenCalled();
			expect(result).toBeNull();
		});
	});
});
