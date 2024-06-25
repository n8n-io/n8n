import {
	mapLegacyConnectionsToCanvasConnections,
	mapLegacyEndpointsToCanvasConnectionPort,
	getUniqueNodeName,
	mapCanvasConnectionToLegacyConnection,
	parseCanvasConnectionHandleString,
} from '@/utils/canvasUtilsV2';
import { NodeConnectionType, type IConnections, type INodeTypeDescription } from 'n8n-workflow';
import type { CanvasConnection } from '@/types';
import type { INodeUi } from '@/Interface';
import type { Connection } from '@vue-flow/core';
import { createTestNode } from '@/__tests__/mocks';

vi.mock('uuid', () => ({
	v4: vi.fn(() => 'mock-uuid'),
}));

describe('mapLegacyConnectionsToCanvasConnections', () => {
	it('should map legacy connections to canvas connections', () => {
		const legacyConnections: IConnections = {
			'Node A': {
				main: [[{ node: 'Node B', type: NodeConnectionType.Main, index: 0 }]],
			},
		};
		const nodes: INodeUi[] = [
			{
				id: '1',
				name: 'Node A',
				type: 'n8n-nodes-base.node',
				typeVersion: 1,
				position: [100, 100],
				parameters: {},
			},
			{
				id: '2',
				name: 'Node B',
				type: 'n8n-nodes-base.node',
				typeVersion: 1,
				position: [200, 200],
				parameters: {},
			},
		];

		const result: CanvasConnection[] = mapLegacyConnectionsToCanvasConnections(
			legacyConnections,
			nodes,
		);

		expect(result).toEqual([
			{
				id: '[1/main/0][2/main/0]',
				source: '1',
				target: '2',
				sourceHandle: 'outputs/main/0',
				targetHandle: 'inputs/main/0',
				data: {
					fromNodeName: 'Node A',
					source: {
						index: 0,
						type: NodeConnectionType.Main,
					},
					target: {
						index: 0,
						type: NodeConnectionType.Main,
					},
				},
			},
		]);
	});

	it('should return empty array when no matching nodes found', () => {
		const legacyConnections: IConnections = {
			'Node A': {
				main: [[{ node: 'Node B', type: NodeConnectionType.Main, index: 0 }]],
			},
		};
		const nodes: INodeUi[] = [];

		const result: CanvasConnection[] = mapLegacyConnectionsToCanvasConnections(
			legacyConnections,
			nodes,
		);

		expect(result).toEqual([]);
	});

	it('should return empty array when no legacy connections provided', () => {
		const legacyConnections: IConnections = {};
		const nodes: INodeUi[] = [
			{
				id: '1',
				name: 'Node A',
				type: 'n8n-nodes-base.node',
				typeVersion: 1,
				position: [100, 100],
				parameters: {},
			},
			{
				id: '2',
				name: 'Node B',
				type: 'n8n-nodes-base.node',
				typeVersion: 1,
				position: [200, 200],
				parameters: {},
			},
		];

		const result: CanvasConnection[] = mapLegacyConnectionsToCanvasConnections(
			legacyConnections,
			nodes,
		);

		expect(result).toEqual([]);
	});

	it('should map multiple connections between the same nodes', () => {
		const legacyConnections: IConnections = {
			'Node A': {
				main: [
					[{ node: 'Node B', type: NodeConnectionType.Main, index: 0 }],
					[{ node: 'Node B', type: NodeConnectionType.Main, index: 1 }],
				],
			},
		};
		const nodes: INodeUi[] = [
			{
				id: '1',
				name: 'Node A',
				type: 'n8n-nodes-base.node',
				typeVersion: 1,
				position: [100, 100],
				parameters: {},
			},
			{
				id: '2',
				name: 'Node B',
				type: 'n8n-nodes-base.node',
				typeVersion: 1,
				position: [200, 200],
				parameters: {},
			},
		];

		const result: CanvasConnection[] = mapLegacyConnectionsToCanvasConnections(
			legacyConnections,
			nodes,
		);

		expect(result).toEqual([
			{
				id: '[1/main/0][2/main/0]',
				source: '1',
				target: '2',
				sourceHandle: 'outputs/main/0',
				targetHandle: 'inputs/main/0',
				data: {
					fromNodeName: 'Node A',
					source: {
						index: 0,
						type: NodeConnectionType.Main,
					},
					target: {
						index: 0,
						type: NodeConnectionType.Main,
					},
				},
			},
			{
				id: '[1/main/1][2/main/1]',
				source: '1',
				target: '2',
				sourceHandle: 'outputs/main/1',
				targetHandle: 'inputs/main/1',
				data: {
					fromNodeName: 'Node A',
					source: {
						index: 1,
						type: NodeConnectionType.Main,
					},
					target: {
						index: 1,
						type: NodeConnectionType.Main,
					},
				},
			},
		]);
	});

	it('should map multiple connections from one node to different nodes', () => {
		const legacyConnections: IConnections = {
			'Node A': {
				main: [
					[{ node: 'Node B', type: NodeConnectionType.Main, index: 0 }],
					[{ node: 'Node C', type: NodeConnectionType.Main, index: 0 }],
				],
			},
		};
		const nodes: INodeUi[] = [
			{
				id: '1',
				name: 'Node A',
				type: 'n8n-nodes-base.node',
				typeVersion: 1,
				position: [100, 100],
				parameters: {},
			},
			{
				id: '2',
				name: 'Node B',
				type: 'n8n-nodes-base.node',
				typeVersion: 1,
				position: [200, 200],
				parameters: {},
			},
			{
				id: '3',
				name: 'Node C',
				type: 'n8n-nodes-base.node',
				typeVersion: 1,
				position: [300, 300],
				parameters: {},
			},
		];

		const result: CanvasConnection[] = mapLegacyConnectionsToCanvasConnections(
			legacyConnections,
			nodes,
		);

		expect(result).toEqual([
			{
				id: '[1/main/0][2/main/0]',
				source: '1',
				target: '2',
				sourceHandle: 'outputs/main/0',
				targetHandle: 'inputs/main/0',
				data: {
					fromNodeName: 'Node A',
					source: {
						index: 0,
						type: NodeConnectionType.Main,
					},
					target: {
						index: 0,
						type: NodeConnectionType.Main,
					},
				},
			},
			{
				id: '[1/main/1][3/main/0]',
				source: '1',
				target: '3',
				sourceHandle: 'outputs/main/1',
				targetHandle: 'inputs/main/0',
				data: {
					fromNodeName: 'Node A',
					source: {
						index: 1,
						type: NodeConnectionType.Main,
					},
					target: {
						index: 0,
						type: NodeConnectionType.Main,
					},
				},
			},
		]);
	});

	it('should map complex node setup with mixed inputs and outputs', () => {
		const legacyConnections: IConnections = {
			'Node A': {
				main: [[{ node: 'Node B', type: NodeConnectionType.Main, index: 0 }]],
				[NodeConnectionType.AiMemory]: [
					[{ node: 'Node C', type: NodeConnectionType.AiMemory, index: 1 }],
				],
			},
			'Node B': {
				main: [[{ node: 'Node C', type: NodeConnectionType.Main, index: 0 }]],
			},
		};
		const nodes: INodeUi[] = [
			{
				id: '1',
				name: 'Node A',
				typeVersion: 1,
				type: 'n8n-nodes-base.node',
				position: [100, 100],
				parameters: {},
			},
			{
				id: '2',
				name: 'Node B',
				typeVersion: 1,
				type: 'n8n-nodes-base.node',
				position: [200, 200],
				parameters: {},
			},
			{
				id: '3',
				name: 'Node C',
				typeVersion: 1,
				type: 'n8n-nodes-base.node',
				position: [300, 300],
				parameters: {},
			},
		];

		const result: CanvasConnection[] = mapLegacyConnectionsToCanvasConnections(
			legacyConnections,
			nodes,
		);

		expect(result).toEqual([
			{
				id: '[1/main/0][2/main/0]',
				source: '1',
				target: '2',
				sourceHandle: 'outputs/main/0',
				targetHandle: 'inputs/main/0',
				data: {
					fromNodeName: 'Node A',
					source: {
						index: 0,
						type: NodeConnectionType.Main,
					},
					target: {
						index: 0,
						type: NodeConnectionType.Main,
					},
				},
			},
			{
				id: `[1/${NodeConnectionType.AiMemory}/0][3/${NodeConnectionType.AiMemory}/1]`,
				source: '1',
				target: '3',
				sourceHandle: `outputs/${NodeConnectionType.AiMemory}/0`,
				targetHandle: `inputs/${NodeConnectionType.AiMemory}/1`,
				data: {
					fromNodeName: 'Node A',
					source: {
						index: 0,
						type: NodeConnectionType.AiMemory,
					},
					target: {
						index: 1,
						type: NodeConnectionType.AiMemory,
					},
				},
			},
			{
				id: '[2/main/0][3/main/0]',
				source: '2',
				target: '3',
				sourceHandle: 'outputs/main/0',
				targetHandle: 'inputs/main/0',
				data: {
					fromNodeName: 'Node B',
					source: {
						index: 0,
						type: NodeConnectionType.Main,
					},
					target: {
						index: 0,
						type: NodeConnectionType.Main,
					},
				},
			},
		]);
	});

	it('should handle edge cases with invalid data gracefully', () => {
		const legacyConnections: IConnections = {
			'Node A': {
				main: [
					[{ node: 'Nonexistent Node', type: NodeConnectionType.Main, index: 0 }],
					[{ node: 'Node B', type: NodeConnectionType.Main, index: 0 }],
				],
			},
		};
		const nodes: INodeUi[] = [
			{
				id: '1',
				name: 'Node A',
				type: 'n8n-nodes-base.node',
				typeVersion: 1,
				position: [100, 100],
				parameters: {},
			},
			{
				id: '2',
				name: 'Node B',
				type: 'n8n-nodes-base.node',
				typeVersion: 1,
				position: [200, 200],
				parameters: {},
			},
		];

		const result: CanvasConnection[] = mapLegacyConnectionsToCanvasConnections(
			legacyConnections,
			nodes,
		);

		expect(result).toEqual([
			{
				id: '[1/main/1][2/main/0]',
				source: '1',
				target: '2',
				sourceHandle: 'outputs/main/1',
				targetHandle: 'inputs/main/0',
				data: {
					fromNodeName: 'Node A',
					source: {
						index: 1,
						type: NodeConnectionType.Main,
					},
					target: {
						index: 0,
						type: NodeConnectionType.Main,
					},
				},
			},
		]);
	});
});

describe('parseCanvasConnectionHandleString', () => {
	it('should parse valid handle string', () => {
		const handle = 'outputs/main/1';
		const result = parseCanvasConnectionHandleString(handle);

		expect(result).toEqual({
			type: 'main',
			index: 1,
		});
	});

	it('should handle null handle', () => {
		const handle = null;
		const result = parseCanvasConnectionHandleString(handle);

		expect(result).toEqual({
			type: 'main',
			index: 0,
		});
	});

	it('should handle undefined handle', () => {
		const handle = undefined;
		const result = parseCanvasConnectionHandleString(handle);

		expect(result).toEqual({
			type: 'main',
			index: 0,
		});
	});

	it('should handle invalid type in handle', () => {
		const handle = 'outputs/invalid/1';
		const result = parseCanvasConnectionHandleString(handle);

		expect(result).toEqual({
			type: 'main',
			index: 1,
		});
	});

	it('should handle invalid index in handle', () => {
		const handle = 'outputs/main/invalid';
		const result = parseCanvasConnectionHandleString(handle);

		expect(result).toEqual({
			type: 'main',
			index: 0,
		});
	});
});

describe('mapCanvasConnectionToLegacyConnection', () => {
	it('should map canvas connection to legacy connection', () => {
		const sourceNode = createTestNode({ name: 'sourceNode', type: 'main' });
		const targetNode = createTestNode({ name: 'targetNode', type: 'main' });
		const connection: Connection = {
			target: '1',
			source: '2',
			sourceHandle: 'outputs/main/1',
			targetHandle: 'inputs/main/2',
		};

		const result = mapCanvasConnectionToLegacyConnection(sourceNode, targetNode, connection);

		expect(result).toEqual([
			{ node: sourceNode.name, type: 'main', index: 1 },
			{ node: targetNode.name, type: 'main', index: 2 },
		]);
	});
});

describe('mapLegacyEndpointsToCanvasConnectionPort', () => {
	it('should return an empty array and log a warning when inputs is a string', () => {
		const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
		const endpoints: INodeTypeDescription['inputs'] = 'some code';
		const result = mapLegacyEndpointsToCanvasConnectionPort(endpoints);

		expect(result).toEqual([]);
		expect(consoleWarnSpy).toHaveBeenCalledWith(
			'Node endpoints have not been evaluated',
			'some code',
		);

		consoleWarnSpy.mockRestore();
	});

	it('should map string endpoints correctly', () => {
		const endpoints: INodeTypeDescription['inputs'] = [
			NodeConnectionType.Main,
			NodeConnectionType.AiTool,
		];
		const result = mapLegacyEndpointsToCanvasConnectionPort(endpoints);

		expect(result).toEqual([
			{ type: NodeConnectionType.Main, index: 0, label: undefined },
			{ type: NodeConnectionType.AiTool, index: 0, label: undefined },
		]);
	});

	it('should map object endpoints correctly', () => {
		const endpoints: INodeTypeDescription['inputs'] = [
			{ type: NodeConnectionType.Main, displayName: 'Main Input' },
			{ type: NodeConnectionType.AiTool, displayName: 'AI Tool', required: true },
		];
		const result = mapLegacyEndpointsToCanvasConnectionPort(endpoints);

		expect(result).toEqual([
			{ type: NodeConnectionType.Main, index: 0, label: 'Main Input' },
			{ type: NodeConnectionType.AiTool, index: 0, label: 'AI Tool', required: true },
		]);
	});

	it('should map mixed string and object endpoints correctly', () => {
		const endpoints: INodeTypeDescription['inputs'] = [
			NodeConnectionType.Main,
			{ type: NodeConnectionType.AiTool, displayName: 'AI Tool' },
			NodeConnectionType.Main,
		];
		const result = mapLegacyEndpointsToCanvasConnectionPort(endpoints);

		expect(result).toEqual([
			{ type: NodeConnectionType.Main, index: 0, label: undefined },
			{ type: NodeConnectionType.AiTool, index: 0, label: 'AI Tool' },
			{ type: NodeConnectionType.Main, index: 1, label: undefined },
		]);
	});

	it('should handle multiple same type object endpoints', () => {
		const endpoints: INodeTypeDescription['inputs'] = [
			{ type: NodeConnectionType.Main, displayName: 'Main Input' },
			{ type: NodeConnectionType.Main, displayName: 'Secondary Main Input' },
		];
		const result = mapLegacyEndpointsToCanvasConnectionPort(endpoints);

		expect(result).toEqual([
			{ type: NodeConnectionType.Main, index: 0, label: 'Main Input' },
			{ type: NodeConnectionType.Main, index: 1, label: 'Secondary Main Input' },
		]);
	});

	it('should map required and non-required endpoints correctly', () => {
		const endpoints: INodeTypeDescription['inputs'] = [
			{ type: NodeConnectionType.Main, displayName: 'Main Input', required: true },
			{ type: NodeConnectionType.AiTool, displayName: 'Optional Tool', required: false },
		];
		const result = mapLegacyEndpointsToCanvasConnectionPort(endpoints);

		expect(result).toEqual([
			{ type: NodeConnectionType.Main, index: 0, label: 'Main Input', required: true },
			{ type: NodeConnectionType.AiTool, index: 0, label: 'Optional Tool' },
		]);
	});
});

describe('getUniqueNodeName', () => {
	it('should return the original name if it is unique', () => {
		const name = 'Node A';
		const existingNames = new Set(['Node B', 'Node C']);
		const result = getUniqueNodeName(name, existingNames);
		expect(result).toBe(name);
	});

	it('should append a number to the name if it already exists', () => {
		const name = 'Node A';
		const existingNames = new Set(['Node A', 'Node B']);
		const result = getUniqueNodeName(name, existingNames);
		expect(result).toBe('Node A 1');
	});

	it('should find the next available number for the name', () => {
		const name = 'Node A';
		const existingNames = new Set(['Node A', 'Node A 1', 'Node A 2']);
		const result = getUniqueNodeName(name, existingNames);
		expect(result).toBe('Node A 3');
	});

	it('should use UUID if more than 99 variations exist', () => {
		const name = 'Node A';
		const existingNames = new Set([...Array(100).keys()].map((i) => `Node A ${i}`).concat([name]));
		const result = getUniqueNodeName(name, existingNames);
		expect(result).toBe('Node A mock-uuid');
	});
});
