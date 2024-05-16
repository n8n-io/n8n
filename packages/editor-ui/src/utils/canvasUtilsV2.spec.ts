import {
	mapLegacyConnectionsToCanvasConnections,
	mapLegacyEndpointsToCanvasConnectionPort,
	getUniqueNodeName,
} from '@/utils/canvasUtilsV2';
import type { IConnections, INodeTypeDescription } from 'n8n-workflow';
import type { CanvasConnection } from '@/types';
import type { INodeUi } from '@/Interface';

vi.mock('uuid', () => ({
	v4: vi.fn(() => 'mock-uuid'),
}));

describe('mapLegacyConnectionsToCanvasConnections', () => {
	it('should map legacy connections to canvas connections', () => {
		const legacyConnections: IConnections = {
			'Node A': {
				main: [[{ node: 'Node B', type: 'main', index: 0 }]],
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
						type: 'main',
					},
					target: {
						index: 0,
						type: 'main',
					},
				},
			},
		]);
	});

	it('should return empty array when no matching nodes found', () => {
		const legacyConnections: IConnections = {
			'Node A': {
				main: [[{ node: 'Node B', type: 'main', index: 0 }]],
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
					[{ node: 'Node B', type: 'main', index: 0 }],
					[{ node: 'Node B', type: 'main', index: 1 }],
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
						type: 'main',
					},
					target: {
						index: 0,
						type: 'main',
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
						type: 'main',
					},
					target: {
						index: 1,
						type: 'main',
					},
				},
			},
		]);
	});

	it('should map multiple connections from one node to different nodes', () => {
		const legacyConnections: IConnections = {
			'Node A': {
				main: [
					[{ node: 'Node B', type: 'main', index: 0 }],
					[{ node: 'Node C', type: 'main', index: 0 }],
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
						type: 'main',
					},
					target: {
						index: 0,
						type: 'main',
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
						type: 'main',
					},
					target: {
						index: 0,
						type: 'main',
					},
				},
			},
		]);
	});

	it('should map complex node setup with mixed inputs and outputs', () => {
		const legacyConnections: IConnections = {
			'Node A': {
				main: [[{ node: 'Node B', type: 'main', index: 0 }]],
				other: [[{ node: 'Node C', type: 'other', index: 1 }]],
			},
			'Node B': {
				main: [[{ node: 'Node C', type: 'main', index: 0 }]],
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
						type: 'main',
					},
					target: {
						index: 0,
						type: 'main',
					},
				},
			},
			{
				id: '[1/other/0][3/other/1]',
				source: '1',
				target: '3',
				sourceHandle: 'outputs/other/0',
				targetHandle: 'inputs/other/1',
				data: {
					fromNodeName: 'Node A',
					source: {
						index: 0,
						type: 'other',
					},
					target: {
						index: 1,
						type: 'other',
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
						type: 'main',
					},
					target: {
						index: 0,
						type: 'main',
					},
				},
			},
		]);
	});

	it('should handle edge cases with invalid data gracefully', () => {
		const legacyConnections: IConnections = {
			'Node A': {
				main: [
					[{ node: 'Nonexistent Node', type: 'main', index: 0 }],
					[{ node: 'Node B', type: 'main', index: 0 }],
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
						type: 'main',
					},
					target: {
						index: 0,
						type: 'main',
					},
				},
			},
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
		const endpoints: INodeTypeDescription['inputs'] = ['main', 'ai_tool'];
		const result = mapLegacyEndpointsToCanvasConnectionPort(endpoints);

		expect(result).toEqual([
			{ type: 'main', index: 0, label: undefined },
			{ type: 'ai_tool', index: 0, label: undefined },
		]);
	});

	it('should map object endpoints correctly', () => {
		const endpoints: INodeTypeDescription['inputs'] = [
			{ type: 'main', displayName: 'Main Input' },
			{ type: 'ai_tool', displayName: 'AI Tool', required: true },
		];
		const result = mapLegacyEndpointsToCanvasConnectionPort(endpoints);

		expect(result).toEqual([
			{ type: 'main', index: 0, label: 'Main Input' },
			{ type: 'ai_tool', index: 0, label: 'AI Tool', required: true },
		]);
	});

	it('should map mixed string and object endpoints correctly', () => {
		const endpoints: INodeTypeDescription['inputs'] = [
			'main',
			{ type: 'ai_tool', displayName: 'AI Tool' },
			'main',
		];
		const result = mapLegacyEndpointsToCanvasConnectionPort(endpoints);

		expect(result).toEqual([
			{ type: 'main', index: 0, label: undefined },
			{ type: 'ai_tool', index: 0, label: 'AI Tool' },
			{ type: 'main', index: 1, label: undefined },
		]);
	});

	it('should handle multiple same type object endpoints', () => {
		const endpoints: INodeTypeDescription['inputs'] = [
			{ type: 'main', displayName: 'Main Input' },
			{ type: 'main', displayName: 'Secondary Main Input' },
		];
		const result = mapLegacyEndpointsToCanvasConnectionPort(endpoints);

		expect(result).toEqual([
			{ type: 'main', index: 0, label: 'Main Input' },
			{ type: 'main', index: 1, label: 'Secondary Main Input' },
		]);
	});

	it('should map required and non-required endpoints correctly', () => {
		const endpoints: INodeTypeDescription['inputs'] = [
			{ type: 'main', displayName: 'Main Input', required: true },
			{ type: 'ai_tool', displayName: 'Optional Tool', required: false },
		];
		const result = mapLegacyEndpointsToCanvasConnectionPort(endpoints);

		expect(result).toEqual([
			{ type: 'main', index: 0, label: 'Main Input', required: true },
			{ type: 'ai_tool', index: 0, label: 'Optional Tool' },
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
