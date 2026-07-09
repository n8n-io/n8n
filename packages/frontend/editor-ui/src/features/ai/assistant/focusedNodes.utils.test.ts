import { describe, it, expect } from 'vitest';
import { buildFocusedNodesPayload } from './focusedNodes.utils';
import type { FocusedNode } from './focusedNodes.types';
import type { INodeUi } from '@/Interface';
import type { IConnections } from 'n8n-workflow';

const createMockNode = (id: string, name: string, type = 'n8n-nodes-base.httpRequest'): INodeUi =>
	({
		id,
		name,
		type,
		typeVersion: 1,
		position: [0, 0],
		parameters: {},
	}) as INodeUi;

const createFocusedNode = (nodeId: string, nodeName: string, nodeType: string): FocusedNode => ({
	nodeId,
	nodeName,
	nodeType,
	state: 'confirmed',
});

describe('buildFocusedNodesPayload', () => {
	it('should return empty array when no confirmed nodes', () => {
		const result = buildFocusedNodesPayload([], [], {}, {});
		expect(result).toEqual([]);
	});

	it('should return fallback payload when node not found in workflow', () => {
		const confirmedNodes = [createFocusedNode('missing', 'Deleted Node', 'n8n-nodes-base.code')];

		const result = buildFocusedNodesPayload(confirmedNodes, [], {}, {});

		expect(result).toEqual([
			{
				name: 'Deleted Node',
				incomingConnections: [],
				outgoingConnections: [],
			},
		]);
	});

	it('should build payload with connections', () => {
		const allNodes = [
			createMockNode('node-1', 'HTTP Request'),
			createMockNode('node-2', 'Trigger', 'n8n-nodes-base.manualTrigger'),
			createMockNode('node-3', 'Code', 'n8n-nodes-base.code'),
		];
		const confirmedNodes = [
			createFocusedNode('node-1', 'HTTP Request', 'n8n-nodes-base.httpRequest'),
		];

		const connectionsByDestination: IConnections = {
			'HTTP Request': {
				main: [[{ node: 'Trigger', type: 'main', index: 0 }]],
			},
		};
		const connectionsBySource: IConnections = {
			'HTTP Request': {
				main: [[{ node: 'Code', type: 'main', index: 0 }]],
			},
		};

		const result = buildFocusedNodesPayload(
			confirmedNodes,
			allNodes,
			connectionsByDestination,
			connectionsBySource,
		);

		expect(result).toHaveLength(1);
		expect(result[0].name).toBe('HTTP Request');
		expect(result[0].incomingConnections).toEqual(['Trigger']);
		expect(result[0].outgoingConnections).toEqual(['Code']);
	});

	it('should deduplicate connections', () => {
		const allNodes = [createMockNode('node-1', 'HTTP Request')];
		const confirmedNodes = [
			createFocusedNode('node-1', 'HTTP Request', 'n8n-nodes-base.httpRequest'),
		];

		const connectionsByDestination: IConnections = {
			'HTTP Request': {
				main: [
					[
						{ node: 'Trigger', type: 'main', index: 0 },
						{ node: 'Trigger', type: 'main', index: 1 },
					],
				],
			},
		};

		const result = buildFocusedNodesPayload(confirmedNodes, allNodes, connectionsByDestination, {});

		expect(result[0].incomingConnections).toEqual(['Trigger']);
	});

	it('should extract parameter and credential issues', () => {
		const nodeWithIssues = createMockNode('node-1', 'HTTP Request');
		(nodeWithIssues as INodeUi & { issues: unknown }).issues = {
			parameters: {
				url: ['URL is required'],
			},
			credentials: {
				httpBasicAuth: ['Credentials not set'],
			},
		};

		const confirmedNodes = [
			createFocusedNode('node-1', 'HTTP Request', 'n8n-nodes-base.httpRequest'),
		];

		const result = buildFocusedNodesPayload(confirmedNodes, [nodeWithIssues], {}, {});

		expect(result[0].issues).toEqual({
			url: ['URL is required'],
			'credential:httpBasicAuth': ['Credentials not set'],
		});
	});

	it('should omit issues when node has empty issues object', () => {
		const nodeWithEmptyIssues = createMockNode('node-1', 'HTTP Request');
		(nodeWithEmptyIssues as INodeUi & { issues: unknown }).issues = {};

		const confirmedNodes = [
			createFocusedNode('node-1', 'HTTP Request', 'n8n-nodes-base.httpRequest'),
		];

		const result = buildFocusedNodesPayload(confirmedNodes, [nodeWithEmptyIssues], {}, {});

		expect(result[0].issues).toBeUndefined();
	});

	it('should handle nodes with no connections', () => {
		const allNodes = [createMockNode('node-1', 'HTTP Request')];
		const confirmedNodes = [
			createFocusedNode('node-1', 'HTTP Request', 'n8n-nodes-base.httpRequest'),
		];

		const result = buildFocusedNodesPayload(confirmedNodes, allNodes, {}, {});

		expect(result[0]).toEqual({
			name: 'HTTP Request',
			incomingConnections: [],
			outgoingConnections: [],
		});
	});

	it('should handle multiple confirmed nodes', () => {
		const allNodes = [
			createMockNode('node-1', 'HTTP Request'),
			createMockNode('node-2', 'Code', 'n8n-nodes-base.code'),
		];
		const confirmedNodes = [
			createFocusedNode('node-1', 'HTTP Request', 'n8n-nodes-base.httpRequest'),
			createFocusedNode('node-2', 'Code', 'n8n-nodes-base.code'),
		];

		const result = buildFocusedNodesPayload(confirmedNodes, allNodes, {}, {});

		expect(result).toHaveLength(2);
		expect(result[0].name).toBe('HTTP Request');
		expect(result[1].name).toBe('Code');
	});
});
