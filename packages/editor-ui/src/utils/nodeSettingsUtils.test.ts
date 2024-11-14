import { describe, it, expect, afterAll } from 'vitest';
import { mock } from 'vitest-mock-extended';
import type { IConnections, NodeParameterValueType } from 'n8n-workflow';
import { updateDynamicConnections } from './nodeSettingsUtils';
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
		expect(updatedConnections?.TestNode.main[1][0].node).toEqual('Node3');
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
		expect(updatedConnections?.TestNode.main[0][0].node).toEqual('Node3');
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
		expect(updatedConnections?.TestNode.main[3][0].node).toEqual('Node3');
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
