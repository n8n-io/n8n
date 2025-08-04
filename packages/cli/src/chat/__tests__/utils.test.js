'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
const n8n_workflow_1 = require('n8n-workflow');
const utils_1 = require('../utils');
const createMockExecution = (overrides = {}, firstExecutionData, nodeData) => {
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
	};
};
const createMockNode = (overrides = {}) => ({
	name: 'TestNode',
	type: 'test-node',
	parameters: {},
	...overrides,
});
describe('getMessage', () => {
	it('should return sendMessage from the last node execution', () => {
		const execution = createMockExecution();
		const result = (0, utils_1.getMessage)(execution);
		expect(result).toBe('Test message');
	});
	it('should return undefined when no sendMessage exists', () => {
		const execution = createMockExecution(
			{},
			{
				json: { test: 'data' },
			},
		);
		const result = (0, utils_1.getMessage)(execution);
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
		const result = (0, utils_1.getMessage)(execution);
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
		const result = (0, utils_1.getMessage)(execution);
		expect(result).toBe('Second message');
	});
	it('should return undefined when main data is missing', () => {
		const execution = createMockExecution({}, undefined, [
			{
				data: {},
			},
		]);
		const result = (0, utils_1.getMessage)(execution);
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
		const result = (0, utils_1.getMessage)(execution);
		expect(result).toBeUndefined();
	});
});
describe('getLastNodeExecuted', () => {
	it('should return the node that was last executed', () => {
		const execution = createMockExecution();
		const result = (0, utils_1.getLastNodeExecuted)(execution);
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
		const result = (0, utils_1.getLastNodeExecuted)(execution);
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
		const result = (0, utils_1.getLastNodeExecuted)(execution);
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
		const result = (0, utils_1.getLastNodeExecuted)(execution);
		expect(result).toBeUndefined();
	});
});
describe('shouldResumeImmediately', () => {
	it('should return true for RESPOND_TO_WEBHOOK_NODE_TYPE', () => {
		const node = createMockNode({
			type: n8n_workflow_1.RESPOND_TO_WEBHOOK_NODE_TYPE,
		});
		const result = (0, utils_1.shouldResumeImmediately)(node);
		expect(result).toBe(true);
	});
	it('should return true when CHAT_WAIT_USER_REPLY is false', () => {
		const node = createMockNode({
			parameters: {
				options: {
					[n8n_workflow_1.CHAT_WAIT_USER_REPLY]: false,
				},
			},
		});
		const result = (0, utils_1.shouldResumeImmediately)(node);
		expect(result).toBe(true);
	});
	it('should return false when CHAT_WAIT_USER_REPLY is true', () => {
		const node = createMockNode({
			parameters: {
				options: {
					[n8n_workflow_1.CHAT_WAIT_USER_REPLY]: true,
				},
			},
		});
		const result = (0, utils_1.shouldResumeImmediately)(node);
		expect(result).toBe(false);
	});
	it('should return false when CHAT_WAIT_USER_REPLY is undefined', () => {
		const node = createMockNode({
			parameters: {
				options: {},
			},
		});
		const result = (0, utils_1.shouldResumeImmediately)(node);
		expect(result).toBe(false);
	});
	it('should return false when no options exist', () => {
		const node = createMockNode({
			parameters: {},
		});
		const result = (0, utils_1.shouldResumeImmediately)(node);
		expect(result).toBe(false);
	});
	it('should return false when no parameters exist', () => {
		const node = createMockNode({
			parameters: undefined,
		});
		const result = (0, utils_1.shouldResumeImmediately)(node);
		expect(result).toBe(false);
	});
	it('should handle null node', () => {
		const result = (0, utils_1.shouldResumeImmediately)(null);
		expect(result).toBe(false);
	});
	it('should handle undefined node', () => {
		const result = (0, utils_1.shouldResumeImmediately)(undefined);
		expect(result).toBe(false);
	});
	it('should return true when CHAT_WAIT_USER_REPLY is false directly in parameters', () => {
		const node = createMockNode({
			parameters: {
				[n8n_workflow_1.CHAT_WAIT_USER_REPLY]: false,
			},
		});
		const result = (0, utils_1.shouldResumeImmediately)(node);
		expect(result).toBe(true);
	});
	it('should return false when CHAT_WAIT_USER_REPLY is true directly in parameters', () => {
		const node = createMockNode({
			parameters: {
				[n8n_workflow_1.CHAT_WAIT_USER_REPLY]: true,
			},
		});
		const result = (0, utils_1.shouldResumeImmediately)(node);
		expect(result).toBe(false);
	});
});
//# sourceMappingURL=utils.test.js.map
