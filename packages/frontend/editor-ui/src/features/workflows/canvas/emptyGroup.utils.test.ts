import type { IConnections } from 'n8n-workflow';
import { NodeConnectionTypes } from 'n8n-workflow';
import type { WorkflowDataUpdate } from '@n8n/rest-api-client/api/workflows';
import type { INodeUi } from '@/Interface';
import {
	mapConnectionsToVisibleNodes,
	removeEmptyCanvasGroupsFromWorkflowData,
} from './emptyGroup.utils';

describe('mapConnectionsToVisibleNodes', () => {
	it('removes hidden sources and targets', () => {
		const connections: IConnections = {
			Hidden: { main: [[{ node: 'Visible', type: 'main', index: 0 }]] },
			Visible: {
				main: [[{ node: 'Hidden', type: 'main', index: 0 }]],
			},
		};

		expect(mapConnectionsToVisibleNodes(connections, [{ name: 'Visible' } as INodeUi])).toEqual({});
	});

	it('preserves connections between visible nodes', () => {
		const connections: IConnections = {
			Source: { main: [[{ node: 'Target', type: 'main', index: 0 }]] },
		};

		expect(
			mapConnectionsToVisibleNodes(connections, [
				{ name: 'Source' } as INodeUi,
				{ name: 'Target' } as INodeUi,
			]),
		).toEqual(connections);
	});

	it('preserves direct visible self-connections', () => {
		const connections: IConnections = {
			Visible: { main: [[{ node: 'Visible', type: 'main', index: 0 }]] },
		};

		expect(mapConnectionsToVisibleNodes(connections, [{ name: 'Visible' } as INodeUi])).toEqual(
			connections,
		);
	});

	it('reconnects visible nodes through hidden nodes', () => {
		const connections: IConnections = {
			Source: { main: [[{ node: 'Hidden', type: 'main', index: 0 }]] },
			Hidden: { main: [[{ node: 'Target', type: 'main', index: 0 }]] },
		};

		expect(
			mapConnectionsToVisibleNodes(connections, [
				{ name: 'Source' } as INodeUi,
				{ name: 'Target' } as INodeUi,
			]),
		).toEqual({
			Source: { main: [[{ node: 'Target', type: 'main', index: 0 }]] },
		});
	});
});

describe('removeEmptyCanvasGroupsFromWorkflowData', () => {
	it('removes empty groups and reconnects visible nodes through their anchors', () => {
		const anchor = {
			id: 'anchor',
			name: 'Empty group anchor',
			type: 'n8n-nodes-base.noOp',
			parameters: { emptyGroupAnchor: true },
		} as unknown as INodeUi;
		const source = { id: 'source', name: 'Source' } as INodeUi;
		const target = { id: 'target', name: 'Target' } as INodeUi;
		const workflowData: WorkflowDataUpdate = {
			nodes: [anchor, source, target],
			connections: {
				[source.name]: {
					[NodeConnectionTypes.Main]: [
						[{ node: anchor.name, type: NodeConnectionTypes.Main, index: 0 }],
					],
				},
				[anchor.name]: {
					[NodeConnectionTypes.Main]: [
						[{ node: target.name, type: NodeConnectionTypes.Main, index: 0 }],
					],
				},
			},
			nodeGroups: [{ id: 'group', name: 'Empty group', nodeIds: [anchor.id] }],
			pinData: { [anchor.name]: [] },
		};

		removeEmptyCanvasGroupsFromWorkflowData(workflowData);

		expect(workflowData.nodes).toEqual([source, target]);
		expect(workflowData.nodeGroups).toBeUndefined();
		expect(workflowData.connections).toEqual({
			[source.name]: {
				[NodeConnectionTypes.Main]: [
					[{ node: target.name, type: NodeConnectionTypes.Main, index: 0 }],
				],
			},
		});
		expect(workflowData.pinData).toEqual({});
	});
});
