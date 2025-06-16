import type { IExecutionResponse } from '@n8n/db';
import type { IDataObject, INode } from 'n8n-workflow';
import {
	CHAT_TRIGGER_NODE_TYPE,
	CHAT_WAIT_USER_REPLY,
	RESPOND_TO_WEBHOOK_NODE_TYPE,
} from 'n8n-workflow';

import {
	getMessage,
	getLastNodeExecuted,
	prepareMessageFromLastNode,
	isResponseNodeMode,
	shouldResumeImmediately,
} from '../utils';

// helpers --------------------------------------------------------
const createMockExecution = (
	overrides: IDataObject = {},
	firstExecutionData?: IDataObject,
	nodeData?: IDataObject[],
): IExecutionResponse => {
	const firstItem = firstExecutionData || {
		json: { test: 'data' },
		sendMessage: 'Test message',
	};
	const nodeRunData = nodeData || [
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
});

describe('prepareMessageFromLastNode', () => {
	it('should return output property when available', () => {
		const execution = createMockExecution(
			{},
			{
				json: {
					output: 'Output message',
					text: 'Text message',
					message: 'Message property',
				},
			},
		);
		const result = prepareMessageFromLastNode(execution);
		expect(result).toBe('Output message');
	});

	it('should return text property when output is not available', () => {
		const execution = createMockExecution(
			{},
			{
				json: {
					text: 'Text message',
					message: 'Message property',
				},
			},
		);
		const result = prepareMessageFromLastNode(execution);
		expect(result).toBe('Text message');
	});

	it('should return message property when output and text are not available', () => {
		const execution = createMockExecution(
			{},
			{
				json: {
					message: 'Message property',
				},
			},
		);
		const result = prepareMessageFromLastNode(execution);
		expect(result).toBe('Message property');
	});

	it('should return empty string when no message properties exist', () => {
		const execution = createMockExecution(
			{},
			{
				json: {
					someOtherProperty: 'value',
				},
			},
		);
		const result = prepareMessageFromLastNode(execution);
		expect(result).toBe('');
	});

	it('should stringify non-string message values', () => {
		const execution = createMockExecution(
			{},
			{
				json: {
					output: { complex: 'object', with: ['array'] },
				},
			},
		);
		const result = prepareMessageFromLastNode(execution);
		expect(result).toBe('{"complex":"object","with":["array"]}');
	});

	it('should handle empty json object', () => {
		const execution = createMockExecution(
			{},
			{
				json: {},
			},
		);
		const result = prepareMessageFromLastNode(execution);
		expect(result).toBe('');
	});

	it('should handle missing nodeExecutionData', () => {
		const execution = createMockExecution({
			data: {
				resultData: {
					lastNodeExecuted: 'TestNode',
					runData: {
						TestNode: [
							{
								data: {
									main: [[]],
								},
							},
						],
					},
				},
			},
		});
		const result = prepareMessageFromLastNode(execution);
		expect(result).toBe('');
	});
});

describe('isResponseNodeMode', () => {
	it('should return true when chat trigger has responseNode mode', () => {
		const execution = createMockExecution({
			workflowData: {
				nodes: [
					{
						name: 'ChatTrigger',
						type: CHAT_TRIGGER_NODE_TYPE,
						parameters: {
							options: {
								responseMode: 'responseNode',
							},
						},
					},
				],
			},
		});
		const result = isResponseNodeMode(execution);
		expect(result).toBe(true);
	});

	it('should return false when chat trigger has different response mode', () => {
		const execution = createMockExecution({
			workflowData: {
				nodes: [
					{
						name: 'ChatTrigger',
						type: CHAT_TRIGGER_NODE_TYPE,
						parameters: {
							options: {
								responseMode: 'lastNode',
							},
						},
					},
				],
			},
		});
		const result = isResponseNodeMode(execution);
		expect(result).toBe(false);
	});

	it('should return false when no chat trigger node exists', () => {
		const execution = createMockExecution({
			workflowData: {
				nodes: [
					{
						name: 'SomeOtherNode',
						type: 'other-node-type',
						parameters: {},
					},
				],
			},
		});
		const result = isResponseNodeMode(execution);
		expect(result).toBe(false);
	});

	it('should return false when chat trigger has no options', () => {
		const execution = createMockExecution({
			workflowData: {
				nodes: [
					{
						name: 'ChatTrigger',
						type: CHAT_TRIGGER_NODE_TYPE,
						parameters: {},
					},
				],
			},
		});
		const result = isResponseNodeMode(execution);
		expect(result).toBe(false);
	});

	it('should return false when chat trigger options is not an object', () => {
		const execution = createMockExecution({
			workflowData: {
				nodes: [
					{
						name: 'ChatTrigger',
						type: CHAT_TRIGGER_NODE_TYPE,
						parameters: {
							options: 'not-an-object',
						},
					},
				],
			},
		});
		const result = isResponseNodeMode(execution);
		expect(result).toBe(false);
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
});
