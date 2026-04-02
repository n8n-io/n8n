import type { InstanceAiContext, NodeOutputResult } from '../../../types';
import { createGetNodeOutputTool } from '../get-node-output.tool';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function createMockContext(): InstanceAiContext {
	return {
		userId: 'test-user',
		workflowService: {} as InstanceAiContext['workflowService'],
		executionService: {
			list: jest.fn(),
			run: jest.fn(),
			getStatus: jest.fn(),
			getResult: jest.fn(),
			stop: jest.fn(),
			getDebugInfo: jest.fn(),
			getNodeOutput: jest.fn(),
		},
		credentialService: {} as InstanceAiContext['credentialService'],
		nodeService: {} as InstanceAiContext['nodeService'],
		dataTableService: {} as InstanceAiContext['dataTableService'],
	};
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('get-node-output tool', () => {
	let context: InstanceAiContext;

	beforeEach(() => {
		jest.clearAllMocks();
		context = createMockContext();
	});

	describe('schema validation', () => {
		it('accepts executionId and nodeName', () => {
			const tool = createGetNodeOutputTool(context);
			const result = tool.inputSchema!.safeParse({
				executionId: 'exec-1',
				nodeName: 'HTTP Request',
			});
			expect(result.success).toBe(true);
		});

		it('accepts optional startIndex and maxItems', () => {
			const tool = createGetNodeOutputTool(context);
			const result = tool.inputSchema!.safeParse({
				executionId: 'exec-1',
				nodeName: 'HTTP Request',
				startIndex: 10,
				maxItems: 20,
			});
			expect(result.success).toBe(true);
		});

		it('rejects missing executionId', () => {
			const tool = createGetNodeOutputTool(context);
			const result = tool.inputSchema!.safeParse({ nodeName: 'HTTP Request' });
			expect(result.success).toBe(false);
		});

		it('rejects missing nodeName', () => {
			const tool = createGetNodeOutputTool(context);
			const result = tool.inputSchema!.safeParse({ executionId: 'exec-1' });
			expect(result.success).toBe(false);
		});

		it('rejects negative startIndex', () => {
			const tool = createGetNodeOutputTool(context);
			const result = tool.inputSchema!.safeParse({
				executionId: 'exec-1',
				nodeName: 'Node',
				startIndex: -1,
			});
			expect(result.success).toBe(false);
		});

		it('rejects maxItems over 50', () => {
			const tool = createGetNodeOutputTool(context);
			const result = tool.inputSchema!.safeParse({
				executionId: 'exec-1',
				nodeName: 'Node',
				maxItems: 51,
			});
			expect(result.success).toBe(false);
		});

		it('rejects maxItems of 0', () => {
			const tool = createGetNodeOutputTool(context);
			const result = tool.inputSchema!.safeParse({
				executionId: 'exec-1',
				nodeName: 'Node',
				maxItems: 0,
			});
			expect(result.success).toBe(false);
		});
	});

	describe('execute', () => {
		it('returns node output from the service', async () => {
			const mockResult: NodeOutputResult = {
				nodeName: 'HTTP Request',
				items: [{ id: 1 }, { id: 2 }],
				totalItems: 2,
				returned: { from: 0, to: 2 },
			};
			(context.executionService.getNodeOutput as jest.Mock).mockResolvedValue(mockResult);
			const tool = createGetNodeOutputTool(context);

			const result = (await tool.execute!(
				{ executionId: 'exec-1', nodeName: 'HTTP Request' },
				{} as never,
			)) as NodeOutputResult;

			expect(context.executionService.getNodeOutput).toHaveBeenCalledWith(
				'exec-1',
				'HTTP Request',
				{
					startIndex: undefined,
					maxItems: undefined,
				},
			);
			expect(result.nodeName).toBe('HTTP Request');
			expect(result.items).toHaveLength(2);
			expect(result.totalItems).toBe(2);
			expect(result.returned).toEqual({ from: 0, to: 2 });
		});

		it('passes pagination options to the service', async () => {
			const mockResult: NodeOutputResult = {
				nodeName: 'Set',
				items: [{ id: 11 }, { id: 12 }],
				totalItems: 50,
				returned: { from: 10, to: 12 },
			};
			(context.executionService.getNodeOutput as jest.Mock).mockResolvedValue(mockResult);
			const tool = createGetNodeOutputTool(context);

			const result = (await tool.execute!(
				{ executionId: 'exec-1', nodeName: 'Set', startIndex: 10, maxItems: 2 },
				{} as never,
			)) as NodeOutputResult;

			expect(context.executionService.getNodeOutput).toHaveBeenCalledWith('exec-1', 'Set', {
				startIndex: 10,
				maxItems: 2,
			});
			expect(result.returned).toEqual({ from: 10, to: 12 });
		});

		it('propagates service errors for missing execution', async () => {
			(context.executionService.getNodeOutput as jest.Mock).mockRejectedValue(
				new Error('Execution exec-999 not found'),
			);
			const tool = createGetNodeOutputTool(context);

			await expect(
				tool.execute!({ executionId: 'exec-999', nodeName: 'Node' }, {} as never),
			).rejects.toThrow('Execution exec-999 not found');
		});

		it('propagates service errors for missing node', async () => {
			(context.executionService.getNodeOutput as jest.Mock).mockRejectedValue(
				new Error('Node "Missing" not found in execution exec-1'),
			);
			const tool = createGetNodeOutputTool(context);

			await expect(
				tool.execute!({ executionId: 'exec-1', nodeName: 'Missing' }, {} as never),
			).rejects.toThrow('Node "Missing" not found in execution exec-1');
		});
	});
});
