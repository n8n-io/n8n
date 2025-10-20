import {
	checkOverlap,
	createCanvasConnectionHandleString,
	createCanvasConnectionId,
	insertSpacersBetweenEndpoints,
	mapCanvasConnectionToLegacyConnection,
	mapLegacyConnectionsToCanvasConnections,
	mapLegacyEndpointsToCanvasConnectionPort,
	parseCanvasConnectionHandleString,
	shouldIgnoreCanvasShortcut,
} from './canvas.utils';
import type { IConnection, IConnections, INodeTypeDescription } from 'n8n-workflow';
import { NodeConnectionTypes } from 'n8n-workflow';
import type { CanvasConnection } from './canvas.types';
import { CanvasConnectionMode } from './canvas.types';
import type { INodeUi } from '@/Interface';
import type { Connection } from '@vue-flow/core';
import { createTestNode } from '@/__tests__/mocks';
import { NODE_MIN_INPUT_ITEMS_COUNT } from '@/constants';

vi.mock('uuid', () => ({
	v4: vi.fn(() => 'mock-uuid'),
}));

describe('mapLegacyConnectionsToCanvasConnections', () => {
	it('should map legacy connections to canvas connections', () => {
		const legacyConnections: IConnections = {
			'Node A': {
				[NodeConnectionTypes.Main]: [
					[{ node: 'Node B', type: NodeConnectionTypes.Main, index: 0 }],
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

		const source = nodes[0].id;
		const sourceHandle = createCanvasConnectionHandleString({
			mode: CanvasConnectionMode.Output,
			type: NodeConnectionTypes.Main,
			index: 0,
		});
		const target = nodes[1].id;
		const targetHandle = createCanvasConnectionHandleString({
			mode: CanvasConnectionMode.Input,
			type: NodeConnectionTypes.Main,
			index: 0,
		});
		const id = createCanvasConnectionId({
			source,
			target,
			sourceHandle,
			targetHandle,
		});

		expect(result).toEqual([
			{
				id,
				source,
				target,
				sourceHandle,
				targetHandle,
				data: {
					source: {
						node: nodes[0].name,
						index: 0,
						type: NodeConnectionTypes.Main,
					},
					target: {
						node: nodes[1].name,
						index: 0,
						type: NodeConnectionTypes.Main,
					},
				},
			},
		]);
	});

	it('should return empty array when no matching nodes found', () => {
		const legacyConnections: IConnections = {
			'Node A': {
				[NodeConnectionTypes.Main]: [
					[{ node: 'Node B', type: NodeConnectionTypes.Main, index: 0 }],
				],
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
				[NodeConnectionTypes.Main]: [
					[{ node: 'Node B', type: NodeConnectionTypes.Main, index: 0 }],
					[{ node: 'Node B', type: NodeConnectionTypes.Main, index: 1 }],
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

		const sourceA = nodes[0].id;
		const sourceHandleA = createCanvasConnectionHandleString({
			mode: CanvasConnectionMode.Output,
			type: NodeConnectionTypes.Main,
			index: 0,
		});
		const targetA = nodes[1].id;
		const targetHandleA = createCanvasConnectionHandleString({
			mode: CanvasConnectionMode.Input,
			type: NodeConnectionTypes.Main,
			index: 0,
		});
		const connectionIdA = createCanvasConnectionId({
			source: sourceA,
			target: targetA,
			sourceHandle: sourceHandleA,
			targetHandle: targetHandleA,
		});

		const sourceB = nodes[0].id;
		const sourceHandleB = createCanvasConnectionHandleString({
			mode: CanvasConnectionMode.Output,
			type: NodeConnectionTypes.Main,
			index: 1,
		});
		const targetB = nodes[1].id;
		const targetHandleB = createCanvasConnectionHandleString({
			mode: CanvasConnectionMode.Input,
			type: NodeConnectionTypes.Main,
			index: 1,
		});
		const connectionIdB = createCanvasConnectionId({
			source: sourceB,
			target: targetB,
			sourceHandle: sourceHandleB,
			targetHandle: targetHandleB,
		});

		expect(result).toEqual([
			{
				id: connectionIdA,
				source: sourceA,
				target: targetA,
				sourceHandle: sourceHandleA,
				targetHandle: targetHandleA,
				data: {
					source: {
						node: nodes[0].name,
						index: 0,
						type: NodeConnectionTypes.Main,
					},
					target: {
						node: nodes[1].name,
						index: 0,
						type: NodeConnectionTypes.Main,
					},
				},
			},
			{
				id: connectionIdB,
				source: sourceA,
				target: targetB,
				sourceHandle: sourceHandleB,
				targetHandle: targetHandleB,
				data: {
					source: {
						node: nodes[0].name,
						index: 1,
						type: NodeConnectionTypes.Main,
					},
					target: {
						node: nodes[1].name,
						index: 1,
						type: NodeConnectionTypes.Main,
					},
				},
			},
		]);
	});

	it('should map multiple connections from one node to different nodes', () => {
		const legacyConnections: IConnections = {
			'Node A': {
				[NodeConnectionTypes.Main]: [
					[{ node: 'Node B', type: NodeConnectionTypes.Main, index: 0 }],
					[{ node: 'Node C', type: NodeConnectionTypes.Main, index: 0 }],
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

		const sourceA = nodes[0].id;
		const sourceHandleA = createCanvasConnectionHandleString({
			mode: CanvasConnectionMode.Output,
			type: NodeConnectionTypes.Main,
			index: 0,
		});
		const targetA = nodes[1].id;
		const targetHandleA = createCanvasConnectionHandleString({
			mode: CanvasConnectionMode.Input,
			type: NodeConnectionTypes.Main,
			index: 0,
		});
		const connectionIdA = createCanvasConnectionId({
			source: sourceA,
			target: targetA,
			sourceHandle: sourceHandleA,
			targetHandle: targetHandleA,
		});

		const sourceB = nodes[0].id;
		const sourceHandleB = createCanvasConnectionHandleString({
			mode: CanvasConnectionMode.Output,
			type: NodeConnectionTypes.Main,
			index: 1,
		});
		const targetB = nodes[2].id;
		const targetHandleB = createCanvasConnectionHandleString({
			mode: CanvasConnectionMode.Input,
			type: NodeConnectionTypes.Main,
			index: 0,
		});
		const connectionIdB = createCanvasConnectionId({
			source: sourceB,
			target: targetB,
			sourceHandle: sourceHandleB,
			targetHandle: targetHandleB,
		});

		expect(result).toEqual([
			{
				id: connectionIdA,
				source: sourceA,
				target: targetA,
				sourceHandle: sourceHandleA,
				targetHandle: targetHandleA,
				data: {
					source: {
						node: nodes[0].name,
						index: 0,
						type: NodeConnectionTypes.Main,
					},
					target: {
						node: nodes[1].name,
						index: 0,
						type: NodeConnectionTypes.Main,
					},
				},
			},
			{
				id: connectionIdB,
				source: sourceB,
				target: targetB,
				sourceHandle: sourceHandleB,
				targetHandle: targetHandleB,
				data: {
					source: {
						node: nodes[0].name,
						index: 1,
						type: NodeConnectionTypes.Main,
					},
					target: {
						node: nodes[2].name,
						index: 0,
						type: NodeConnectionTypes.Main,
					},
				},
			},
		]);
	});

	it('should map complex node setup with mixed inputs and outputs', () => {
		const legacyConnections: IConnections = {
			'Node A': {
				[NodeConnectionTypes.Main]: [
					[{ node: 'Node B', type: NodeConnectionTypes.Main, index: 0 }],
				],
				[NodeConnectionTypes.AiMemory]: [
					[{ node: 'Node C', type: NodeConnectionTypes.AiMemory, index: 1 }],
				],
			},
			'Node B': {
				[NodeConnectionTypes.Main]: [
					[{ node: 'Node C', type: NodeConnectionTypes.Main, index: 0 }],
				],
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

		const sourceA = nodes[0].id;
		const sourceHandleA = createCanvasConnectionHandleString({
			mode: CanvasConnectionMode.Output,
			type: NodeConnectionTypes.Main,
			index: 0,
		});
		const targetA = nodes[1].id;
		const targetHandleA = createCanvasConnectionHandleString({
			mode: CanvasConnectionMode.Input,
			type: NodeConnectionTypes.Main,
			index: 0,
		});
		const connectionIdA = createCanvasConnectionId({
			source: sourceA,
			target: targetA,
			sourceHandle: sourceHandleA,
			targetHandle: targetHandleA,
		});

		const sourceB = nodes[0].id;
		const sourceHandleB = createCanvasConnectionHandleString({
			mode: CanvasConnectionMode.Output,
			type: NodeConnectionTypes.AiMemory,
			index: 0,
		});
		const targetB = nodes[2].id;
		const targetHandleB = createCanvasConnectionHandleString({
			mode: CanvasConnectionMode.Input,
			type: NodeConnectionTypes.AiMemory,
			index: 1,
		});
		const connectionIdB = createCanvasConnectionId({
			source: sourceB,
			target: targetB,
			sourceHandle: sourceHandleB,
			targetHandle: targetHandleB,
		});

		const sourceC = nodes[1].id;
		const sourceHandleC = createCanvasConnectionHandleString({
			mode: CanvasConnectionMode.Output,
			type: NodeConnectionTypes.Main,
			index: 0,
		});
		const targetC = nodes[2].id;
		const targetHandleC = createCanvasConnectionHandleString({
			mode: CanvasConnectionMode.Input,
			type: NodeConnectionTypes.Main,
			index: 0,
		});
		const connectionIdC = createCanvasConnectionId({
			source: sourceC,
			target: targetC,
			sourceHandle: sourceHandleC,
			targetHandle: targetHandleC,
		});

		expect(result).toEqual([
			{
				id: connectionIdA,
				source: sourceA,
				target: targetA,
				sourceHandle: sourceHandleA,
				targetHandle: targetHandleA,
				data: {
					source: {
						node: nodes[0].name,
						index: 0,
						type: NodeConnectionTypes.Main,
					},
					target: {
						node: nodes[1].name,
						index: 0,
						type: NodeConnectionTypes.Main,
					},
				},
			},
			{
				id: connectionIdB,
				source: sourceB,
				target: targetB,
				sourceHandle: sourceHandleB,
				targetHandle: targetHandleB,
				data: {
					source: {
						node: nodes[0].name,
						index: 0,
						type: NodeConnectionTypes.AiMemory,
					},
					target: {
						node: nodes[2].name,
						index: 1,
						type: NodeConnectionTypes.AiMemory,
					},
				},
			},
			{
				id: connectionIdC,
				source: sourceC,
				target: targetC,
				sourceHandle: sourceHandleC,
				targetHandle: targetHandleC,
				data: {
					source: {
						node: nodes[1].name,
						index: 0,
						type: NodeConnectionTypes.Main,
					},
					target: {
						node: nodes[2].name,
						index: 0,
						type: NodeConnectionTypes.Main,
					},
				},
			},
		]);
	});

	it('should handle edge cases with invalid data gracefully', () => {
		const legacyConnections: IConnections = {
			'Node A': {
				[NodeConnectionTypes.Main]: [
					[{ node: 'Nonexistent Node', type: NodeConnectionTypes.Main, index: 0 }],
					[{ node: 'Node B', type: NodeConnectionTypes.Main, index: 0 }],
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

		const source = nodes[0].id;
		const sourceHandle = createCanvasConnectionHandleString({
			mode: CanvasConnectionMode.Output,
			type: NodeConnectionTypes.Main,
			index: 1,
		});

		const target = nodes[1].id;
		const targetHandle = createCanvasConnectionHandleString({
			mode: CanvasConnectionMode.Input,
			type: NodeConnectionTypes.Main,
			index: 0,
		});

		const id = createCanvasConnectionId({
			source,
			target,
			sourceHandle,
			targetHandle,
		});

		expect(result).toEqual([
			{
				id,
				source,
				target,
				sourceHandle,
				targetHandle,
				data: {
					source: {
						node: nodes[0].name,
						index: 1,
						type: NodeConnectionTypes.Main,
					},
					target: {
						node: nodes[1].name,
						index: 0,
						type: NodeConnectionTypes.Main,
					},
				},
			},
		]);
	});

	// @issue https://linear.app/n8n/issue/N8N-7880/cannot-load-some-templates
	it('should handle null connections gracefully', () => {
		const legacyConnections: IConnections = {
			'Node A': {
				[NodeConnectionTypes.Main]: [
					null as unknown as IConnection[],
					[{ node: 'Node B', type: NodeConnectionTypes.Main, index: 0 }],
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

		const source = nodes[0].id;
		const sourceHandle = createCanvasConnectionHandleString({
			mode: CanvasConnectionMode.Output,
			type: NodeConnectionTypes.Main,
			index: 1,
		});
		const target = nodes[1].id;
		const targetHandle = createCanvasConnectionHandleString({
			mode: CanvasConnectionMode.Input,
			type: NodeConnectionTypes.Main,
			index: 0,
		});
		const id = createCanvasConnectionId({
			source,
			target,
			sourceHandle,
			targetHandle,
		});

		expect(result).toEqual([
			{
				id,
				source,
				target,
				sourceHandle,
				targetHandle,
				data: {
					source: {
						node: nodes[0].name,
						index: 1,
						type: NodeConnectionTypes.Main,
					},
					target: {
						node: nodes[1].name,
						index: 0,
						type: NodeConnectionTypes.Main,
					},
				},
			},
		]);
	});
});

describe('parseCanvasConnectionHandleString', () => {
	it('should parse valid handle string', () => {
		const handle = 'inputs/main/1';
		const result = parseCanvasConnectionHandleString(handle);

		expect(result).toEqual({
			mode: 'inputs',
			type: 'main',
			index: 1,
		});
	});

	it('should handle null handle', () => {
		const handle = null;
		const result = parseCanvasConnectionHandleString(handle);

		expect(result).toEqual({
			mode: 'outputs',
			type: 'main',
			index: 0,
		});
	});

	it('should handle undefined handle', () => {
		const handle = undefined;
		const result = parseCanvasConnectionHandleString(handle);

		expect(result).toEqual({
			mode: 'outputs',
			type: 'main',
			index: 0,
		});
	});

	it('should handle invalid type in handle', () => {
		const handle = 'outputs/invalid/1';
		const result = parseCanvasConnectionHandleString(handle);

		expect(result).toEqual({
			mode: 'outputs',
			type: 'main',
			index: 1,
		});
	});

	it('should handle invalid index in handle', () => {
		const handle = 'outputs/main/invalid';
		const result = parseCanvasConnectionHandleString(handle);

		expect(result).toEqual({
			mode: 'outputs',
			type: 'main',
			index: 0,
		});
	});
});

describe('createCanvasConnectionHandleString', () => {
	it('should create handle string with default values', () => {
		const result = createCanvasConnectionHandleString({ mode: 'inputs' });
		expect(result).toBe('inputs/main/0');
	});

	it('should create handle string with provided values', () => {
		const result = createCanvasConnectionHandleString({
			mode: 'outputs',
			type: NodeConnectionTypes.AiMemory,
			index: 2,
		});
		expect(result).toBe(`outputs/${NodeConnectionTypes.AiMemory}/2`);
	});

	it('should create handle string with mode and type only', () => {
		const result = createCanvasConnectionHandleString({
			mode: 'inputs',
			type: NodeConnectionTypes.AiTool,
		});
		expect(result).toBe(`inputs/${NodeConnectionTypes.AiTool}/0`);
	});

	it('should create handle string with mode and index only', () => {
		const result = createCanvasConnectionHandleString({ mode: 'outputs', index: 3 });
		expect(result).toBe('outputs/main/3');
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
		const endpoints: INodeTypeDescription['inputs'] = '={{some code}}';
		const result = mapLegacyEndpointsToCanvasConnectionPort(endpoints);

		expect(result).toEqual([]);
		expect(consoleWarnSpy).toHaveBeenCalledWith(
			'Node endpoints have not been evaluated',
			'={{some code}}',
		);

		consoleWarnSpy.mockRestore();
	});

	it('should map string endpoints correctly', () => {
		const endpoints: INodeTypeDescription['inputs'] = [
			NodeConnectionTypes.Main,
			NodeConnectionTypes.AiTool,
		];
		const result = mapLegacyEndpointsToCanvasConnectionPort(endpoints);

		expect(result).toEqual([
			{ type: NodeConnectionTypes.Main, index: 0, label: undefined },
			{
				type: NodeConnectionTypes.AiTool,
				index: 0,
				label: undefined,
				maxConnections: undefined,
			},
		]);
	});

	it('should map object endpoints correctly', () => {
		const endpoints: INodeTypeDescription['inputs'] = [
			{ type: NodeConnectionTypes.Main, displayName: 'Main Input' },
			{ type: NodeConnectionTypes.AiTool, displayName: 'AI Tool', required: true },
		];
		const result = mapLegacyEndpointsToCanvasConnectionPort(endpoints);

		expect(result).toEqual([
			{ type: NodeConnectionTypes.Main, index: 0, label: 'Main Input' },
			{
				type: NodeConnectionTypes.AiTool,
				index: 0,
				label: 'AI Tool',
				required: true,
				maxConnections: undefined,
			},
		]);
	});

	it('should map mixed string and object endpoints correctly', () => {
		const endpoints: INodeTypeDescription['inputs'] = [
			NodeConnectionTypes.Main,
			{ type: NodeConnectionTypes.AiTool, displayName: 'AI Tool' },
			NodeConnectionTypes.Main,
		];
		const result = mapLegacyEndpointsToCanvasConnectionPort(endpoints);

		expect(result).toEqual([
			{ type: NodeConnectionTypes.Main, index: 0, label: undefined },
			{
				type: NodeConnectionTypes.AiTool,
				index: 0,
				label: 'AI Tool',
				maxConnections: undefined,
			},
			{ type: NodeConnectionTypes.Main, index: 1, label: undefined },
		]);
	});

	it('should handle multiple same type object endpoints', () => {
		const endpoints: INodeTypeDescription['inputs'] = [
			{ type: NodeConnectionTypes.Main, displayName: 'Main Input' },
			{ type: NodeConnectionTypes.Main, displayName: 'Secondary Main Input' },
		];
		const result = mapLegacyEndpointsToCanvasConnectionPort(endpoints);

		expect(result).toEqual([
			{ type: NodeConnectionTypes.Main, index: 0, label: 'Main Input' },
			{ type: NodeConnectionTypes.Main, index: 1, label: 'Secondary Main Input' },
		]);
	});

	it('should handle endpoints with separate names', () => {
		const endpoints: INodeTypeDescription['inputs'] = [
			NodeConnectionTypes.Main,
			NodeConnectionTypes.Main,
		];
		const result = mapLegacyEndpointsToCanvasConnectionPort(endpoints, ['First', 'Second']);

		expect(result).toEqual([
			{ type: NodeConnectionTypes.Main, index: 0, label: 'First' },
			{ type: NodeConnectionTypes.Main, index: 1, label: 'Second' },
		]);
	});

	it('should map required and non-required endpoints correctly', () => {
		const endpoints: INodeTypeDescription['inputs'] = [
			{ type: NodeConnectionTypes.Main, displayName: 'Main Input', required: true },
			{ type: NodeConnectionTypes.AiTool, displayName: 'Optional Tool', required: false },
		];
		const result = mapLegacyEndpointsToCanvasConnectionPort(endpoints);

		expect(result).toEqual([
			{ type: NodeConnectionTypes.Main, index: 0, label: 'Main Input', required: true },
			{
				type: NodeConnectionTypes.AiTool,
				index: 0,
				label: 'Optional Tool',
				maxConnections: undefined,
			},
		]);
	});

	it('should map maxConnections correctly', () => {
		const endpoints: INodeTypeDescription['inputs'] = [
			NodeConnectionTypes.Main,
			{
				type: NodeConnectionTypes.AiMemory,
				maxConnections: 1,
				displayName: 'Optional Tool',
				required: false,
			},
		];
		const result = mapLegacyEndpointsToCanvasConnectionPort(endpoints);

		expect(result).toEqual([
			{
				type: NodeConnectionTypes.Main,
				maxConnections: undefined,
				index: 0,
				label: undefined,
			},
			{ type: NodeConnectionTypes.AiMemory, maxConnections: 1, index: 0, label: 'Optional Tool' },
		]);
	});
});

describe('checkOverlap', () => {
	it('should return true when nodes overlap', () => {
		const node1 = { x: 0, y: 0, width: 10, height: 10 };
		const node2 = { x: 5, y: 5, width: 10, height: 10 };
		expect(checkOverlap(node1, node2)).toBe(true);
	});

	it('should return false when node1 is completely to the left of node2', () => {
		const node1 = { x: 0, y: 0, width: 10, height: 10 };
		const node2 = { x: 15, y: 0, width: 10, height: 10 };
		expect(checkOverlap(node1, node2)).toBe(false);
	});

	it('should return false when node2 is completely to the left of node1', () => {
		const node1 = { x: 15, y: 0, width: 10, height: 10 };
		const node2 = { x: 0, y: 0, width: 10, height: 10 };
		expect(checkOverlap(node1, node2)).toBe(false);
	});

	it('should return false when node1 is completely above node2', () => {
		const node1 = { x: 0, y: 0, width: 10, height: 10 };
		const node2 = { x: 0, y: 15, width: 10, height: 10 };
		expect(checkOverlap(node1, node2)).toBe(false);
	});

	it('should return false when node2 is completely above node1', () => {
		const node1 = { x: 0, y: 15, width: 10, height: 10 };
		const node2 = { x: 0, y: 0, width: 10, height: 10 };
		expect(checkOverlap(node1, node2)).toBe(false);
	});

	it('should return false when nodes touch at the edges', () => {
		const node1 = { x: 0, y: 0, width: 10, height: 10 };
		const node2 = { x: 10, y: 0, width: 10, height: 10 };
		expect(checkOverlap(node1, node2)).toBe(false);
	});

	it('should return false when nodes touch at the corners', () => {
		const node1 = { x: 0, y: 0, width: 10, height: 10 };
		const node2 = { x: 10, y: 10, width: 10, height: 10 };
		expect(checkOverlap(node1, node2)).toBe(false);
	});
});

describe('insertSpacersBetweenEndpoints', () => {
	it('should insert spacers when there are less than min endpoints count', () => {
		const endpoints = [{ index: 0, required: true }];
		const requiredEndpointsCount = endpoints.filter((endpoint) => endpoint.required).length;
		const result = insertSpacersBetweenEndpoints(endpoints, requiredEndpointsCount);
		expect(result).toEqual([{ index: 0, required: true }, null, null, null]);
	});

	it('should not insert spacers when there are at least min endpoints count', () => {
		const endpoints = [
			{ index: 0, required: true },
			{ index: 1 },
			{ index: 2 },
			{ index: 3 },
			{ index: 4 },
		];
		const requiredEndpointsCount = endpoints.filter((endpoint) => endpoint.required).length;
		const result = insertSpacersBetweenEndpoints(endpoints, requiredEndpointsCount);
		expect(result).toEqual(endpoints);
	});

	it('should handle zero required endpoints', () => {
		const endpoints = [{ index: 0, required: false }];
		const requiredEndpointsCount = endpoints.filter((endpoint) => endpoint.required).length;
		const result = insertSpacersBetweenEndpoints(endpoints, requiredEndpointsCount);
		expect(result).toEqual([null, null, null, { index: 0, required: false }]);
	});

	it('should handle no endpoints', () => {
		const endpoints: Array<{ index: number; required: boolean }> = [];
		const requiredEndpointsCount = endpoints.filter((endpoint) => endpoint.required).length;
		const result = insertSpacersBetweenEndpoints(endpoints, requiredEndpointsCount);
		expect(result).toEqual([null, null, null, null]);
	});

	it('should handle required endpoints greater than NODE_MIN_INPUT_ITEMS_COUNT', () => {
		const endpoints = Array.from({ length: NODE_MIN_INPUT_ITEMS_COUNT + 1 }).map((_, index) => ({
			index,
			required: true,
		}));
		const requiredEndpointsCount = endpoints.filter((endpoint) => endpoint.required).length;
		const result = insertSpacersBetweenEndpoints(endpoints, requiredEndpointsCount);
		expect(result).toEqual(endpoints);
	});

	it('should insert spacers between required and optional endpoints', () => {
		const endpoints = [{ index: 0, required: true }, { index: 1, required: true }, { index: 2 }];
		const requiredEndpointsCount = endpoints.filter((endpoint) => endpoint.required).length;
		const result = insertSpacersBetweenEndpoints(endpoints, requiredEndpointsCount);
		expect(result).toEqual([
			{ index: 0, required: true },
			{ index: 1, required: true },
			null,
			{ index: 2 },
		]);
	});

	it('should handle required endpoints count greater than endpoints length', () => {
		const endpoints = [{ index: 0, required: true }];
		const requiredEndpointsCount = endpoints.filter((endpoint) => endpoint.required).length;
		const result = insertSpacersBetweenEndpoints(endpoints, requiredEndpointsCount);
		expect(result).toEqual([{ index: 0, required: true }, null, null, null]);
	});
});

describe(shouldIgnoreCanvasShortcut, () => {
	it('should return false if given element is a div element', () => {
		expect(shouldIgnoreCanvasShortcut(document.createElement('div'))).toEqual(false);
	});

	it('should return true if given element is an input element', () => {
		expect(shouldIgnoreCanvasShortcut(document.createElement('input'))).toEqual(true);
	});

	it('should return true if given element is a textarea element', () => {
		expect(shouldIgnoreCanvasShortcut(document.createElement('textarea'))).toEqual(true);
	});

	it('should return true if given element is an element with contenteditable attribute', () => {
		const div = document.createElement('div');

		div.setAttribute('contenteditable', 'true');

		expect(shouldIgnoreCanvasShortcut(div)).toEqual(true);
	});

	it('should return true if given element is a child of an element with contenteditable attribute', () => {
		const parent = document.createElement('div');
		const child = document.createElement('div');

		parent.appendChild(child);

		parent.setAttribute('contenteditable', 'true');

		expect(shouldIgnoreCanvasShortcut(child)).toEqual(true);
	});

	it('should return true if given element is has class "ignore-key-press-canvas"', () => {
		const div = document.createElement('div');

		div.classList.add('ignore-key-press-canvas');

		expect(shouldIgnoreCanvasShortcut(div)).toEqual(true);
	});
});
