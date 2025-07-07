import { describe, it, expect, afterAll } from 'vitest';
import { mock } from 'vitest-mock-extended';
import type {
	IConnections,
	NodeParameterValueType,
	IDataObject,
	INodeTypeDescription,
	INodePropertyOptions,
} from 'n8n-workflow';
import {
	updateDynamicConnections,
	updateParameterByPath,
	nameIsParameter,
	formatAsExpression,
	parseFromExpression,
} from './nodeSettingsUtils';
import { SWITCH_NODE_TYPE } from '@/constants';
import type { INodeUi, IUpdateInformation } from '@/Interface';

describe('updateDynamicConnections', () => {
	afterAll(() => {
		vi.clearAllMocks();
	});

	it('should remove extra outputs when the number of outputs decreases', () => {
		const node = mock<INodeUi>({
			name: 'TestNode',
			type: SWITCH_NODE_TYPE,
			parameters: { numberOutputs: 3 },
		});

		const connections = mock<IConnections>({
			TestNode: {
				main: [[{ node: 'Node1' }], [{ node: 'Node2' }], [{ node: 'Node3' }]],
			},
		});

		const parameterData = mock<IUpdateInformation<number>>({
			name: 'parameters.numberOutputs',
			value: 2,
		});

		const updatedConnections = updateDynamicConnections(node, connections, parameterData);

		expect(updatedConnections?.TestNode.main).toHaveLength(2);
	});

	it('should splice connections when a rule is removed', () => {
		const node = mock<INodeUi>({
			name: 'TestNode',
			type: SWITCH_NODE_TYPE,
			parameters: {
				rules: { values: [{}, {}, {}] },
				options: {},
			},
		});

		const connections = mock<IConnections>({
			TestNode: {
				main: [[{ node: 'Node1' }], [{ node: 'Node2' }], [{ node: 'Node3' }]],
			},
		});

		const parameterData = mock<IUpdateInformation<number>>({
			name: 'parameters.rules.values[1]',
			value: undefined,
		});

		const updatedConnections = updateDynamicConnections(node, connections, parameterData);

		expect(updatedConnections?.TestNode.main).toHaveLength(2);
		expect(updatedConnections?.TestNode.main[1]?.[0].node).toEqual('Node3');
	});

	it('should handle fallbackOutput === "extra" and all rules removed', () => {
		const node = mock<INodeUi>({
			name: 'TestNode',
			type: SWITCH_NODE_TYPE,
			parameters: {
				options: { fallbackOutput: 'extra' },
			},
		});

		const connections = mock<IConnections>({
			TestNode: {
				main: [[{ node: 'Node1' }], [{ node: 'Node2' }], [{ node: 'Node3' }]],
			},
		});

		const parameterData = mock<IUpdateInformation<number>>({
			name: 'parameters.rules.values',
			value: undefined,
		});

		const updatedConnections = updateDynamicConnections(node, connections, parameterData);

		expect(updatedConnections?.TestNode.main).toHaveLength(1);
		expect(updatedConnections?.TestNode.main[0]?.[0].node).toEqual('Node3');
	});

	it('should add a new connection when a rule is added', () => {
		const node = mock<INodeUi>({
			name: 'TestNode',
			type: SWITCH_NODE_TYPE,
			parameters: {
				rules: { values: [{}, {}] },
				options: { fallbackOutput: 'none' },
			},
		});

		const connections = mock<IConnections>({
			TestNode: {
				main: [[{ node: 'Node1' }], [{ node: 'Node2' }]],
			},
		});

		const parameterData = mock<IUpdateInformation<NodeParameterValueType>>({
			name: 'parameters.rules.values',
			value: [{}, {}, {}],
		});

		const updatedConnections = updateDynamicConnections(node, connections, parameterData);

		expect(updatedConnections?.TestNode.main).toHaveLength(3);
		expect(updatedConnections?.TestNode.main[2]).toEqual([]);
	});

	it('should handle extra output when rule is added and fallbackOutput is extra', () => {
		const node = mock<INodeUi>({
			name: 'TestNode',
			type: SWITCH_NODE_TYPE,
			parameters: {
				rules: { values: [{}, {}] },
				options: { fallbackOutput: 'extra' },
			},
		});

		const connections = mock<IConnections>({
			TestNode: {
				main: [[{ node: 'Node1' }], [{ node: 'Node2' }], [{ node: 'Node3' }]],
			},
		});

		const parameterData = mock<IUpdateInformation<NodeParameterValueType>>({
			name: 'parameters.rules.values',
			value: [{}, {}, {}],
		});

		const updatedConnections = updateDynamicConnections(node, connections, parameterData);

		expect(updatedConnections?.TestNode.main).toHaveLength(4);
		expect(updatedConnections?.TestNode.main[2]).toEqual([]);
		expect(updatedConnections?.TestNode.main[3]?.[0].node).toEqual('Node3');
	});

	it('should maintain correct connections after rules are reordered', () => {
		const node = mock<INodeUi>({
			name: 'TestNode',
			type: SWITCH_NODE_TYPE,
			parameters: {
				rules: { values: [{ id: 'rule1' }, { id: 'rule2' }, { id: 'rule3' }] },
				options: { fallbackOutput: 'extra' },
			},
		});

		const connections = mock<IConnections>({
			TestNode: {
				main: [
					[{ node: 'Node1' }],
					[{ node: 'Node2' }],
					[{ node: 'Node3' }],
					[{ node: 'Fallback' }],
				],
			},
		});

		const currentRules = (node.parameters.rules as { values?: IDataObject[] })?.values;
		const reorderedRules = [currentRules?.[2], currentRules?.[0], currentRules?.[1]];

		const parameterData = mock<IUpdateInformation<NodeParameterValueType>>({
			name: 'parameters.rules.values',
			value: reorderedRules,
		});

		const updatedConnections = updateDynamicConnections(node, connections, parameterData);

		expect(updatedConnections?.TestNode.main).toHaveLength(4);
		expect(updatedConnections?.TestNode.main[0]?.[0].node).toEqual('Node3');
		expect(updatedConnections?.TestNode.main[1]?.[0].node).toEqual('Node1');
		expect(updatedConnections?.TestNode.main[2]?.[0].node).toEqual('Node2');
		expect(updatedConnections?.TestNode.main[3]?.[0].node).toEqual('Fallback');
	});
	it('should return null if no conditions are met', () => {
		const node = mock<INodeUi>({
			name: 'TestNode',
			type: 'otherNodeType',
		});

		const connections = mock<IConnections>({
			TestNode: { main: [] },
		});

		const parameterData = mock<IUpdateInformation<number>>({
			name: 'parameters.otherParameter',
			value: 3,
		});

		const result = updateDynamicConnections(node, connections, parameterData);

		expect(result).toBeNull();
	});
});

describe('updateParameterByPath', () => {
	afterEach(() => {
		vi.clearAllMocks();
	});

	it('should update a parameter value by path', () => {
		const nodeParameters = {
			rules: { values: [{ id: 'rule1' }, { id: 'rule2' }] },
		};

		const nodeType = mock<INodeTypeDescription>({
			properties: [],
		});

		const parameterPath = 'parameters.rules.values[1].id';
		const newValue = 'updatedRule2';

		const updatedPath = updateParameterByPath(parameterPath, newValue, nodeParameters, nodeType, 1);

		expect(updatedPath).toBe('rules.values[1].id');
		expect(nodeParameters.rules.values[1].id).toBe('updatedRule2');
	});

	it('should remove a parameter value if newValue is undefined', () => {
		const nodeParameters = {
			rules: { values: [{ id: 'rule1' }, { id: 'rule2' }] },
		};

		const nodeType = mock<INodeTypeDescription>({
			properties: [],
		});

		const parameterPath = 'parameters.rules.values[1]';
		const newValue = undefined;

		const updatedPath = updateParameterByPath(parameterPath, newValue, nodeParameters, nodeType, 1);

		expect(updatedPath).toBe('rules.values[1]');
		expect(nodeParameters.rules.values).toHaveLength(1);
		expect(nodeParameters.rules.values[0].id).toBe('rule1');
	});

	it('should add a new parameter value if path does not exist', () => {
		const nodeParameters = {
			rules: { values: [{ id: 'rule1' }] },
		};

		const nodeType = mock<INodeTypeDescription>({
			properties: [],
		});

		const parameterPath = 'parameters.rules.values[1].id';
		const newValue = 'newRule';

		const updatedPath = updateParameterByPath(parameterPath, newValue, nodeParameters, nodeType, 1);

		expect(updatedPath).toBe('rules.values[1].id');
		expect(nodeParameters.rules.values[1].id).toBe('newRule');
	});

	it('should handle array deletion when newValue is undefined and path is an array', () => {
		const nodeParameters = {
			arrayParam: ['value1', 'value2', 'value3'],
		};

		const nodeType = mock<INodeTypeDescription>({
			properties: [],
		});

		const parameterPath = 'parameters.arrayParam[1]';
		const newValue = undefined;

		const updatedPath = updateParameterByPath(parameterPath, newValue, nodeParameters, nodeType, 1);

		expect(updatedPath).toBe('arrayParam[1]');
		expect(nodeParameters.arrayParam).toHaveLength(2);
		expect(nodeParameters.arrayParam).toEqual(['value1', 'value3']);
	});
});

describe('nameIsParameter', () => {
	it.each([
		['', false],
		['parameters', false],
		['parameters.', true],
		['parameters.path.to.some', true],
		['', false],
	])('%s should be %s', (input, expected) => {
		const result = nameIsParameter({ name: input } as never);
		expect(result).toBe(expected);
	});

	it('should reject path on other input', () => {
		const result = nameIsParameter({
			name: 'aName',
			value: 'parameters.path.to.parameters',
		} as never);
		expect(result).toBe(false);
	});
});

describe('formatAsExpression', () => {
	it('wraps string value with "="', () => {
		expect(formatAsExpression('foo', 'string')).toBe('=foo');
	});

	it('wraps number value with "={{ }}"', () => {
		expect(formatAsExpression(42, 'number')).toBe('={{ 42 }}');
	});

	it('wraps boolean value with "={{ }}"', () => {
		expect(formatAsExpression(true, 'boolean')).toBe('={{ true }}');
	});

	it('wraps multiOptions value with "={{ }}" and stringifies', () => {
		expect(formatAsExpression(['a', 'b'], 'multiOptions')).toBe('={{ ["a","b"] }}');
	});

	it('returns "={{ 0 }}" for number with empty value', () => {
		expect(formatAsExpression('', 'number')).toBe('={{ 0 }}');
		expect(formatAsExpression('[Object: null]', 'number')).toBe('={{ 0 }}');
	});

	it('wraps non-string, non-number, non-boolean value with "={{ }}"', () => {
		expect(formatAsExpression({ foo: 'bar' }, 'string')).toBe('={{ [object Object] }}');
	});

	it('handles resourceLocator value', () => {
		const value = { __rl: true, value: 'abc', mode: 'url' };
		expect(formatAsExpression(value, 'resourceLocator')).toEqual({
			__rl: true,
			value: '=abc',
			mode: 'url',
		});
	});

	it('handles resourceLocator value as string', () => {
		expect(formatAsExpression('abc', 'resourceLocator')).toEqual({
			__rl: true,
			value: '=abc',
			mode: '',
		});
	});
});

describe('parseFromExpression', () => {
	it('removes expression from multiOptions string value', () => {
		const options: INodePropertyOptions[] = [
			{ name: 'Option A', value: 'a' },
			{ name: 'Option B', value: 'b' },
			{ name: 'Option C', value: 'c' },
		];
		expect(parseFromExpression('', 'a,b,c', 'multiOptions', [], options)).toEqual(['a', 'b', 'c']);
		expect(parseFromExpression('', 'a,x', 'multiOptions', [], options)).toEqual(['a']);
	});

	it('removes expression from resourceLocator value', () => {
		const modelValue = { __rl: true, value: '=abc', mode: 'url' };
		expect(parseFromExpression(modelValue, 'abc', 'resourceLocator', '', [])).toEqual({
			__rl: true,
			value: 'abc',
			mode: 'url',
		});
	});

	it('removes leading "=" from string parameter', () => {
		expect(parseFromExpression('=foo', undefined, 'string', '', [])).toBe('foo');
		expect(parseFromExpression('==bar', undefined, 'string', '', [])).toBe('bar');
		expect(parseFromExpression('', undefined, 'string', '', [])).toBeNull();
	});

	it('returns value if defined and not string/resourceLocator/multiOptions', () => {
		expect(parseFromExpression(123, 456, 'number', 0, [])).toBe(456);
		expect(parseFromExpression(true, false, 'boolean', true, [])).toBe(false);
	});

	it('returns defaultValue for number/boolean if value is undefined', () => {
		expect(parseFromExpression(123, undefined, 'number', 0, [])).toBe(0);
		expect(parseFromExpression(true, undefined, 'boolean', false, [])).toBe(false);
	});

	it('returns null for other types if value is undefined', () => {
		expect(parseFromExpression({}, undefined, 'json', null, [])).toBeNull();
	});
});
