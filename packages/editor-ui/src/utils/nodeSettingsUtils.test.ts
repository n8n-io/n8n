import { describe, it, expect, afterAll } from 'vitest';
import { mock } from 'vitest-mock-extended';
import type { IConnections, NodeParameterValueType, ResourceMapperField } from 'n8n-workflow';
import { updateDynamicConnections } from './nodeSettingsUtils';
import { SWITCH_NODE_TYPE } from '@/constants';
import type { INodeUi, IUpdateInformation } from '@/Interface';
import { isResourceMapperFieldListStale } from './nodeTypesUtils';

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

describe('isResourceMapperFieldListStale', () => {
	const baseField: ResourceMapperField = {
		id: 'test',
		displayName: 'test',
		required: false,
		defaultMatch: false,
		display: true,
		canBeUsedToMatch: true,
		type: 'string',
	};

	test('returns false for identical lists', () => {
		const oldFields = [{ ...baseField }];
		const newFields = [{ ...baseField }];
		expect(isResourceMapperFieldListStale(oldFields, newFields)).toBe(false);
	});

	test('returns true for different lengths', () => {
		const oldFields = [{ ...baseField }];
		const newFields = [{ ...baseField }, { ...baseField, id: 'test2' }];
		expect(isResourceMapperFieldListStale(oldFields, newFields)).toBe(true);
	});

	test('returns true when field is removed', () => {
		const oldFields = [
			{ ...baseField, id: 'test1' },
			{ ...baseField, id: 'test2' },
		];
		const newFields = [
			{ ...baseField, id: 'test1' },
			{ ...baseField, id: 'test3' },
		];
		expect(isResourceMapperFieldListStale(oldFields, newFields)).toBe(true);
	});

	test('returns true when displayName changes', () => {
		const oldFields = [{ ...baseField }];
		const newFields = [{ ...baseField, displayName: 'changed' }];
		expect(isResourceMapperFieldListStale(oldFields, newFields)).toBe(true);
	});

	test('returns true when required changes', () => {
		const oldFields = [{ ...baseField }];
		const newFields = [{ ...baseField, required: true }];
		expect(isResourceMapperFieldListStale(oldFields, newFields)).toBe(true);
	});

	test('returns true when defaultMatch changes', () => {
		const oldFields = [{ ...baseField }];
		const newFields = [{ ...baseField, defaultMatch: true }];
		expect(isResourceMapperFieldListStale(oldFields, newFields)).toBe(true);
	});

	test('returns true when display changes', () => {
		const oldFields = [{ ...baseField }];
		const newFields = [{ ...baseField, display: false }];
		expect(isResourceMapperFieldListStale(oldFields, newFields)).toBe(true);
	});

	test('returns true when canBeUsedToMatch changes', () => {
		const oldFields = [{ ...baseField }];
		const newFields = [{ ...baseField, canBeUsedToMatch: false }];
		expect(isResourceMapperFieldListStale(oldFields, newFields)).toBe(true);
	});

	test('returns true when type changes', () => {
		const oldFields = [{ ...baseField }];
		const newFields: ResourceMapperField[] = [{ ...baseField, type: 'number' }];
		expect(isResourceMapperFieldListStale(oldFields, newFields)).toBe(true);
	});

	test('returns false for multiple identical fields', () => {
		const oldFields = [
			{ ...baseField, id: 'test1' },
			{ ...baseField, id: 'test2' },
			{ ...baseField, id: 'test3' },
		];
		const newFields = [
			{ ...baseField, id: 'test1' },
			{ ...baseField, id: 'test2' },
			{ ...baseField, id: 'test3' },
		];
		expect(isResourceMapperFieldListStale(oldFields, newFields)).toBe(false);
	});

	test('handles empty arrays correctly', () => {
		expect(isResourceMapperFieldListStale([], [])).toBe(false);
	});

	test('returns true when comparing empty array with non-empty array', () => {
		const nonEmptyFields = [{ ...baseField }];
		expect(isResourceMapperFieldListStale([], nonEmptyFields)).toBe(true);
		expect(isResourceMapperFieldListStale(nonEmptyFields, [])).toBe(true);
	});
});
