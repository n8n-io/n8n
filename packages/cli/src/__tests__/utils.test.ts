import type { INode, INodeType } from 'n8n-workflow';
import { EXECUTE_WORKFLOW_TRIGGER_NODE_TYPE } from 'n8n-workflow';

import {
	shouldAssignExecuteMethod,
	getAllKeyPaths,
	findSubworkflowStart,
	findCliWorkflowStart,
} from '../utils';

describe('shouldAssignExecuteMethod', () => {
	it('should return true when node has no execute, poll, trigger, webhook (unless declarative), or methods', () => {
		const nodeType = {
			description: { requestDefaults: {} }, // Declarative node
			execute: undefined,
			poll: undefined,
			trigger: undefined,
			webhook: undefined,
			methods: undefined,
		} as INodeType;

		expect(shouldAssignExecuteMethod(nodeType)).toBe(true);
	});

	it('should return false when node has execute', () => {
		const nodeType = {
			execute: jest.fn(),
		} as unknown as INodeType;

		expect(shouldAssignExecuteMethod(nodeType)).toBe(false);
	});

	it('should return false when node has poll', () => {
		const nodeType = {
			poll: jest.fn(),
		} as unknown as INodeType;

		expect(shouldAssignExecuteMethod(nodeType)).toBe(false);
	});

	it('should return false when node has trigger', () => {
		const nodeType = {
			trigger: jest.fn(),
		} as unknown as INodeType;

		expect(shouldAssignExecuteMethod(nodeType)).toBe(false);
	});

	it('should return false when node has webhook and is not declarative', () => {
		const nodeType = {
			description: {},
			webhook: jest.fn(),
		} as unknown as INodeType;

		expect(shouldAssignExecuteMethod(nodeType)).toBe(false);
	});

	it('should return true when node has webhook but is declarative', () => {
		const nodeType = {
			description: { requestDefaults: {} }, // Declarative node
			webhook: jest.fn(),
		} as unknown as INodeType;

		expect(shouldAssignExecuteMethod(nodeType)).toBe(true);
	});

	it('should return false when node has methods and is not declarative', () => {
		const nodeType = {
			methods: {},
		} as unknown as INodeType;

		expect(shouldAssignExecuteMethod(nodeType)).toBe(false);
	});

	it('should return true when node has methods but is declarative', () => {
		const nodeType = {
			description: { requestDefaults: {} }, // Declarative node
			methods: {},
		} as unknown as INodeType;

		expect(shouldAssignExecuteMethod(nodeType)).toBe(true);
	});
});

describe('getAllKeyPaths', () => {
	const testCases = [
		{
			description: 'should return empty array for null or undefined',
			obj: null,
			valueFilter: (value: string) => value.includes('test'),
			expected: [],
		},
		{
			description: 'should return empty array for undefined',
			obj: undefined,
			valueFilter: (value: string) => value.includes('test'),
			expected: [],
		},
		{
			description: 'should find keys with matching string values in objects',
			obj: {
				name: 'test',
				age: 25,
				description: 'contains test data',
				other: 'no match',
			},
			valueFilter: (value: string) => value.includes('test'),
			expected: ['name', 'description'],
		},
		{
			description: 'should recursively search nested objects',
			obj: {
				user: {
					name: 'testuser',
					profile: {
						bio: 'test bio',
					},
				},
				settings: {
					theme: 'dark',
				},
			},
			valueFilter: (value: string) => value.includes('test'),
			expected: ['user.name', 'user.profile.bio'],
		},
		{
			description: 'should search arrays',
			obj: [{ name: 'test1' }, { name: 'other' }, { name: 'test2' }],
			valueFilter: (value: string) => value.includes('test'),
			expected: ['[0].name', '[2].name'],
		},
		{
			description: 'should handle mixed arrays and objects',
			obj: {
				items: [{ label: 'test item' }, { label: 'normal item' }],
				title: 'test title',
			},
			valueFilter: (value: string) => value.includes('test'),
			expected: ['items[0].label', 'title'],
		},
		{
			description: 'should handle non-string values by ignoring them',
			obj: {
				name: 'test',
				count: 42,
				active: true,
				data: null,
			},
			valueFilter: (value: string) => value.includes('test'),
			expected: ['name'],
		},
	];

	it.each(testCases)('$description', ({ obj, valueFilter, expected }) => {
		const result = getAllKeyPaths(obj, '', [], valueFilter);
		expect(result).toEqual(expected);
	});
});

describe('findSubworkflowStart', () => {
	const createMockNode = (name: string, type: string, disabled = false): INode => ({
		id: `id-${name}`,
		name,
		type,
		typeVersion: 1,
		position: [0, 0],
		parameters: {},
		disabled,
	});

	describe('with triggerNodeName specified', () => {
		it('should find trigger by exact node name match', () => {
			const trigger1 = createMockNode('Trigger 1', EXECUTE_WORKFLOW_TRIGGER_NODE_TYPE);
			const trigger2 = createMockNode('Trigger 2', EXECUTE_WORKFLOW_TRIGGER_NODE_TYPE);
			const nodes = [trigger1, trigger2];

			const result = findSubworkflowStart(nodes, 'Trigger 2');

			expect(result).toBe(trigger2);
		});

		it('should throw SubworkflowOperationError when named trigger not found', () => {
			const trigger1 = createMockNode('Trigger 1', EXECUTE_WORKFLOW_TRIGGER_NODE_TYPE);
			const nodes = [trigger1];

			expect(() => findSubworkflowStart(nodes, 'Nonexistent Trigger')).toThrow(
				'Execute Workflow Trigger not found',
			);
		});

		it('should not match disabled triggers', () => {
			const trigger1 = createMockNode('Trigger 1', EXECUTE_WORKFLOW_TRIGGER_NODE_TYPE, false);
			const trigger2 = createMockNode('Trigger 2', EXECUTE_WORKFLOW_TRIGGER_NODE_TYPE, true);
			const nodes = [trigger1, trigger2];

			// Disabled trigger exists but should not be found
			expect(() => findSubworkflowStart(nodes, 'Trigger 2')).toThrow(
				'Execute Workflow Trigger not found',
			);
		});

		it('should only match executeWorkflowTrigger type, not other triggers', () => {
			const executeTrigger = createMockNode('My Trigger', EXECUTE_WORKFLOW_TRIGGER_NODE_TYPE);
			const manualTrigger = createMockNode('My Trigger', 'n8n-nodes-base.manualTrigger');
			const nodes = [manualTrigger, executeTrigger];

			const result = findSubworkflowStart(nodes, 'My Trigger');

			expect(result).toBe(executeTrigger);
		});
	});

	describe('without triggerNodeName (default behavior)', () => {
		it('should return first executeWorkflowTrigger when no name specified', () => {
			const trigger1 = createMockNode('Trigger 1', EXECUTE_WORKFLOW_TRIGGER_NODE_TYPE);
			const trigger2 = createMockNode('Trigger 2', EXECUTE_WORKFLOW_TRIGGER_NODE_TYPE);
			const nodes = [trigger1, trigger2];

			const result = findSubworkflowStart(nodes);

			expect(result).toBe(trigger1);
		});

		it('should fall back to manual trigger if no executeWorkflowTrigger exists', () => {
			const manualTrigger = createMockNode('Manual', 'n8n-nodes-base.manualTrigger');
			const nodes = [manualTrigger];

			const result = findSubworkflowStart(nodes);

			expect(result).toBe(manualTrigger);
		});

		it('should throw when no valid start node found', () => {
			const regularNode = createMockNode('Regular Node', 'n8n-nodes-base.httpRequest');
			const nodes = [regularNode];

			expect(() => findSubworkflowStart(nodes)).toThrow('Missing node to start execution');
		});
	});
});

describe('findCliWorkflowStart', () => {
	const createMockNode = (name: string, type: string): INode => ({
		id: `id-${name}`,
		name,
		type,
		typeVersion: 1,
		position: [0, 0],
		parameters: {},
	});

	it('should throw CliWorkflowOperationError when named trigger not found', () => {
		const trigger1 = createMockNode('Trigger 1', EXECUTE_WORKFLOW_TRIGGER_NODE_TYPE);
		const nodes = [trigger1];

		expect(() => findCliWorkflowStart(nodes, 'Missing Trigger')).toThrow(
			'Execute Workflow Trigger not found',
		);
	});

	it('should work identically to findSubworkflowStart except for error type', () => {
		const trigger1 = createMockNode('Trigger 1', EXECUTE_WORKFLOW_TRIGGER_NODE_TYPE);
		const trigger2 = createMockNode('Trigger 2', EXECUTE_WORKFLOW_TRIGGER_NODE_TYPE);
		const nodes = [trigger1, trigger2];

		const result = findCliWorkflowStart(nodes, 'Trigger 2');

		expect(result).toBe(trigger2);
	});
});
