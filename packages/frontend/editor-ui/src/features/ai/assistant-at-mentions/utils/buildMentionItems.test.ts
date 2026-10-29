import { describe, expect, it, vi } from 'vitest';

import { projectWorkflowArtifact } from '../composables/useArtifactMentionIndex';
import {
	buildArtifactBrowseItems,
	buildArtifactSearchItems,
	buildMentionKey,
} from './buildMentionItems';

function makeIndex(nodeCount = 3, groupedNodeCount = 2) {
	return projectWorkflowArtifact({
		id: 'workflow-1',
		name: 'Order processing',
		versionId: 'version-1',
		nodes: Array.from({ length: nodeCount }, (_, index) => ({
			id: `node-${index + 1}`,
			name: `Node ${index + 1}`,
			type: 'n8n-nodes-base.noOp',
			typeVersion: 1,
		})),
		nodeGroups: [
			{
				id: 'group-1',
				name: 'Fulfilment',
				nodeIds: Array.from(
					{ length: Math.min(groupedNodeCount, Math.max(0, nodeCount - 1)) },
					(_, index) => `node-${index + 2}`,
				),
			},
		],
	});
}

describe('buildMentionItems', () => {
	it('builds stable keys from the resource kind and IDs', () => {
		expect(buildMentionKey('node', 'workflow-1', 'node-1')).toBe('node:workflow-1:node-1');
	});

	it('builds workflow and group hierarchies without repeating grouped nodes', () => {
		const index = makeIndex();
		const [workflow] = buildArtifactBrowseItems(
			[{ id: 'workflow-1', name: 'Registry name' }],
			() => index,
		);

		expect(workflow.label).toBe('Order processing');
		expect(workflow.nodeCount).toBe(3);
		expect(workflow.children?.map(({ kind, label }) => [kind, label])).toEqual([
			['group', 'Fulfilment'],
			['node', 'Node 1'],
		]);
		expect(workflow.children?.[0].children?.map(({ label }) => label)).toEqual([
			'Node 2',
			'Node 3',
		]);
		expect(workflow.children?.[0].nodeCount).toBe(2);
	});

	it('builds flat items with workflow and group breadcrumbs', () => {
		const index = makeIndex();
		const items = buildArtifactSearchItems(
			[{ id: 'workflow-1', name: 'Order processing' }],
			() => index,
		);

		expect(items.find(({ entityId }) => entityId === 'group-1')?.breadcrumbs).toEqual([
			'Order processing',
			'Fulfilment',
		]);
		expect(items.find(({ entityId }) => entityId === 'node-2')?.breadcrumbs).toEqual([
			'Order processing',
			'Fulfilment',
			'Node 2',
		]);
		expect(items.find(({ entityId }) => entityId === 'node-2')).toMatchObject({
			nodeTypeName: 'n8n-nodes-base.noOp',
			nodeTypeVersion: 1,
		});
		expect(items.filter(({ entityId }) => entityId === 'node-2')).toHaveLength(1);
		expect(items.every(({ children, hasChildren }) => !children && !hasChildren)).toBe(true);
	});

	it('limits artifact roots to ten rows', () => {
		const artifacts = Array.from({ length: 15 }, (_, itemIndex) => ({
			id: `workflow-${itemIndex + 1}`,
			name: `Workflow ${itemIndex + 1}`,
		}));
		const getIndex = vi.fn(() => undefined);
		const items = buildArtifactBrowseItems(artifacts, getIndex);

		expect(items).toHaveLength(10);
		expect(getIndex).toHaveBeenCalledTimes(10);
	});

	it('lists every child in workflow and group sub-menus', () => {
		// 26 nodes: 14 in the group, 12 ungrouped. Both exceed the first-level cap.
		const index = makeIndex(26, 14);
		const [workflow] = buildArtifactBrowseItems(
			[{ id: 'workflow-1', name: 'Order processing' }],
			() => index,
		);
		const [group] = workflow.children ?? [];

		expect(workflow.nodeCount).toBe(26);
		expect(workflow.children).toHaveLength(13);
		expect(group).toMatchObject({ kind: 'group', label: 'Fulfilment', nodeCount: 14 });
		expect(group.children).toHaveLength(14);
	});

	it('removes the group expand affordance when all visible children are excluded', () => {
		const index = makeIndex();
		const excludedKeys = new Set([
			buildMentionKey('node', 'workflow-1', 'node-2'),
			buildMentionKey('node', 'workflow-1', 'node-3'),
		]);

		const [workflow] = buildArtifactBrowseItems(
			[{ id: 'workflow-1', name: 'Order processing' }],
			() => index,
			excludedKeys,
		);
		const group = workflow.children?.find(({ kind }) => kind === 'group');

		expect(group).toMatchObject({ hasChildren: false, children: [] });
	});

	it('keeps artifact roots browseable before their compact index loads', () => {
		const [workflow] = buildArtifactBrowseItems(
			[{ id: 'workflow-1', name: 'Order processing' }],
			() => undefined,
		);

		expect(workflow).toMatchObject({
			kind: 'workflow',
			hasChildren: true,
		});
		expect(workflow.children).toBeUndefined();
	});

	it('does not show an expand affordance for a loaded empty workflow', () => {
		const index = projectWorkflowArtifact({
			id: 'workflow-1',
			name: 'Empty workflow',
			versionId: 'version-1',
			nodes: [],
		});
		const [workflow] = buildArtifactBrowseItems(
			[{ id: 'workflow-1', name: 'Empty workflow' }],
			() => index,
		);

		expect(workflow.hasChildren).toBe(false);
	});
});
