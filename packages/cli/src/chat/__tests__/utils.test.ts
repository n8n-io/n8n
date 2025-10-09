import type { IExecutionResponse } from '@n8n/db';
import type { IDataObject, INode } from 'n8n-workflow';
import { CHAT_WAIT_USER_REPLY, RESPOND_TO_WEBHOOK_NODE_TYPE } from 'n8n-workflow';

import { getMessage, getLastNodeExecuted, shouldResumeImmediately } from '../utils';

// helpers --------------------------------------------------------
const createMockExecution = (
	overrides: IDataObject = {},
	firstExecutionData?: IDataObject,
	nodeData?: IDataObject[],
): IExecutionResponse => {
	const firstItem = firstExecutionData ?? {
		json: { test: 'data' },
		sendMessage: 'Test message',
	};
	const nodeRunData = nodeData ?? [
		{
			data: {
				main: [[firstItem]],
			},
		},
	];

	return {
		id: 'test-execution-id',
		data: {
			resultData: {
				lastNodeExecuted: 'TestNode',
				runData: {
					TestNode: nodeRunData,
				},
			},
		},
		workflowData: {
			nodes: [
				{
					name: 'TestNode',
					type: 'test-node',
					parameters: {},
				},
			],
		},
		...overrides,
	} as unknown as IExecutionResponse;
};

const createMockNode = (overrides: Partial<INode> = {}): INode =>
	({
		name: 'TestNode',
		type: 'test-node',
		parameters: {},
		...overrides,
	}) as INode;

// ---------------------------------------------------------

describe('getMessage', () => {
	it('should return sendMessage from the last node execution', () => {
		const execution = createMockExecution();
		const result = getMessage(execution);
		expect(result).toBe('Test message');
	});

	it('should return undefined when no sendMessage exists', () => {
		const execution = createMockExecution(
			{},
			{
				json: { test: 'data' },
			},
		);
		const result = getMessage(execution);
		expect(result).toBeUndefined();
	});

	it('should return undefined when nodeExecutionData is empty', () => {
		const execution = createMockExecution({}, undefined, [
			{
				data: {
					main: [[]],
				},
			},
		]);
		const result = getMessage(execution);
		expect(result).toBeUndefined();
	});

	it('should handle multiple run data entries and use the last one', () => {
		const execution = createMockExecution({}, undefined, [
			{
				data: {
					main: [
						[
							{
								json: { test: 'first' },
								sendMessage: 'First message',
							},
						],
					],
				},
			},
			{
				data: {
					main: [
						[
							{
								json: { test: 'second' },
								sendMessage: 'Second message',
							},
						],
					],
				},
			},
		]);
		const result = getMessage(execution);
		expect(result).toBe('Second message');
	});

	it('should return undefined when main data is missing', () => {
		const execution = createMockExecution({}, undefined, [
			{
				data: {},
			},
		]);
		const result = getMessage(execution);
		expect(result).toBeUndefined();
	});

	it('should return undefined when nodeExecutionData is undefined', () => {
		const execution = createMockExecution({
			data: {
				resultData: {
					lastNodeExecuted: 'TestNode',
					runData: {
						TestNode: [
							{
								data: {
									main: undefined,
								},
							},
						],
					},
				},
			},
		});
		const result = getMessage(execution);
		expect(result).toBeUndefined();
	});

	it('should return message from the second output branch when first is empty', () => {
		const execution = createMockExecution({}, undefined, [
			{
				data: {
					main: [
						[], // First output branch is empty
						[
							{
								json: { test: 'data' },
								sendMessage: 'Message from second branch',
							},
						], // Second output branch has the message
					],
				},
			},
		]);
		const result = getMessage(execution);
		expect(result).toBe('Message from second branch');
	});

	it('should prioritize message from the first branch when multiple branches have messages', () => {
		const execution = createMockExecution({}, undefined, [
			{
				data: {
					main: [
						[
							{
								json: { test: 'data1' },
								sendMessage: 'Message from first branch',
							},
						],
						[
							{
								json: { test: 'data2' },
								sendMessage: 'Message from second branch',
							},
						],
					],
				},
			},
		]);
		const result = getMessage(execution);
		expect(result).toBe('Message from first branch');
	});
});

describe('getLastNodeExecuted', () => {
	it('should return the node that was last executed', () => {
		const execution = createMockExecution();
		const result = getLastNodeExecuted(execution);
		expect(result).toEqual({
			name: 'TestNode',
			type: 'test-node',
			parameters: {},
		});
	});

	it('should return undefined when last executed node is not found', () => {
		const execution = createMockExecution({
			data: {
				resultData: {
					lastNodeExecuted: 'NonExistentNode',
					runData: {},
				},
			},
		});
		const result = getLastNodeExecuted(execution);
		expect(result).toBeUndefined();
	});

	it('should find the correct node among multiple nodes', () => {
		const execution = createMockExecution({
			data: {
				resultData: {
					lastNodeExecuted: 'SecondNode',
					runData: {},
				},
			},
			workflowData: {
				nodes: [
					{
						name: 'FirstNode',
						type: 'first-type',
						parameters: {},
					},
					{
						name: 'SecondNode',
						type: 'second-type',
						parameters: { test: 'value' },
					},
				],
			},
		});
		const result = getLastNodeExecuted(execution);
		expect(result).toEqual({
			name: 'SecondNode',
			type: 'second-type',
			parameters: { test: 'value' },
		});
	});

	it('should return undefined when workflowData.nodes is undefined', () => {
		const execution = createMockExecution({
			workflowData: undefined,
		});
		const result = getLastNodeExecuted(execution);
		expect(result).toBeUndefined();
	});
});

describe('shouldResumeImmediately', () => {
	it('should return true for RESPOND_TO_WEBHOOK_NODE_TYPE', () => {
		const node = createMockNode({
			type: RESPOND_TO_WEBHOOK_NODE_TYPE,
		});
		const result = shouldResumeImmediately(node);
		expect(result).toBe(true);
	});

	it('should return true when CHAT_WAIT_USER_REPLY is false', () => {
		const node = createMockNode({
			parameters: {
				options: {
					[CHAT_WAIT_USER_REPLY]: false,
				},
			},
		});
		const result = shouldResumeImmediately(node);
		expect(result).toBe(true);
	});

	it('should return false when CHAT_WAIT_USER_REPLY is true', () => {
		const node = createMockNode({
			parameters: {
				options: {
					[CHAT_WAIT_USER_REPLY]: true,
				},
			},
		});
		const result = shouldResumeImmediately(node);
		expect(result).toBe(false);
	});

	it('should return false when CHAT_WAIT_USER_REPLY is undefined', () => {
		const node = createMockNode({
			parameters: {
				options: {},
			},
		});
		const result = shouldResumeImmediately(node);
		expect(result).toBe(false);
	});

	it('should return false when no options exist', () => {
		const node = createMockNode({
			parameters: {},
		});
		const result = shouldResumeImmediately(node);
		expect(result).toBe(false);
	});

	it('should return false when no parameters exist', () => {
		const node = createMockNode({
			parameters: undefined,
		});
		const result = shouldResumeImmediately(node);
		expect(result).toBe(false);
	});

	it('should handle null node', () => {
		const result = shouldResumeImmediately(null as any);
		expect(result).toBe(false);
	});

	it('should handle undefined node', () => {
		const result = shouldResumeImmediately(undefined as any);
		expect(result).toBe(false);
	});

	it('should return true when CHAT_WAIT_USER_REPLY is false directly in parameters', () => {
		const node = createMockNode({
			parameters: {
				[CHAT_WAIT_USER_REPLY]: false,
			},
		});
		const result = shouldResumeImmediately(node);
		expect(result).toBe(true);
	});

	it('should return false when CHAT_WAIT_USER_REPLY is true directly in parameters', () => {
		const node = createMockNode({
			parameters: {
				[CHAT_WAIT_USER_REPLY]: true,
			},
		});
		const result = shouldResumeImmediately(node);
		expect(result).toBe(false);
	});
});
