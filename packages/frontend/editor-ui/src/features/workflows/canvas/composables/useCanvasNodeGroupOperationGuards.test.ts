import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import type { VNode } from 'vue';
import type { IConnection, INodeTypeDescription } from 'n8n-workflow';

import { useCanvasNodeGroupOperationGuards } from './useCanvasNodeGroupOperationGuards';
import {
	createWorkflowDocumentId,
	useWorkflowDocumentStore,
} from '@/app/stores/workflowDocument.store';
import { useWorkflowsStore } from '@/app/stores/workflows.store';
import { useNodeTypesStore } from '@/app/stores/nodeTypes.store';
import { useTelemetry } from '@/app/composables/useTelemetry';
import { STICKY_NODE_TYPE } from '@/app/constants/nodeTypes';
import type { INodeUi } from '@/Interface';

const trackSpy = vi.hoisted(() => vi.fn());
const showToastSpy = vi.hoisted(() => vi.fn((_config: { message: VNode }) => ({ close: vi.fn() })));

vi.mock('@/app/composables/useTelemetry', () => ({
	useTelemetry: vi.fn(() => ({ track: trackSpy })),
}));

vi.mock('@/app/composables/useToast', () => ({
	useToast: () => ({ showToast: showToastSpy }),
}));

// The toast message is a vnode tree: span[ message, ' ', a(onClick) ].
// Reach into it for the ungroup link and fire its click handler.
function clickUngroupLink() {
	const message = showToastSpy.mock.calls[0][0].message;
	const link = (message.children as VNode[])[2];
	const onClick = (link.props as { onClick: (event: MouseEvent) => void }).onClick;
	onClick({ preventDefault: vi.fn(), stopPropagation: vi.fn() } as unknown as MouseEvent);
}

describe('useCanvasNodeGroupOperationGuards', () => {
	let workflowDocumentStore: ReturnType<typeof useWorkflowDocumentStore>;

	beforeEach(() => {
		setActivePinia(createPinia());
		vi.clearAllMocks();
		const workflowsStore = useWorkflowsStore();
		workflowDocumentStore = useWorkflowDocumentStore(
			createWorkflowDocumentId(workflowsStore.workflowId),
		);
	});

	it('tracks an ungroup when the update-blocked toast ungroup link is clicked', () => {
		const group = workflowDocumentStore.createGroup(['prev'], 'Group A');
		workflowDocumentStore.createGroup(['new'], 'Group B');

		const guards = useCanvasNodeGroupOperationGuards();

		// Replacing a grouped node with a node from a different group is blocked,
		// which surfaces the toast carrying the ungroup link.
		const allowed = guards.isNodeReplacementAllowedForNodeGroups({
			previousNodeId: 'prev',
			newNodeId: 'new',
			nodeIds: [],
			connectionsToRemove: [],
			connectionsToAdd: [],
			connectionsBySourceNode: {},
		});

		expect(allowed).toBe(false);
		expect(showToastSpy).toHaveBeenCalledTimes(1);
		expect(trackSpy).not.toHaveBeenCalled();

		clickUngroupLink();

		expect(useTelemetry().track).toHaveBeenCalledWith(
			'User ungrouped nodes',
			expect.objectContaining({
				group_id: group.id,
				group_title: 'Group A',
				node_ids: ['prev'],
				node_count: 1,
				source: 'update-blocked-toast',
			}),
		);
	});

	describe('groups with sticky members', () => {
		const mainConnection = (source: string, target: string): [IConnection, IConnection] => [
			{ node: source, type: 'main', index: 0 },
			{ node: target, type: 'main', index: 0 },
		];

		function makeNode(id: string, type = 'n8n-nodes-base.set'): INodeUi {
			return {
				id,
				name: id.toUpperCase(),
				type,
				typeVersion: 1,
				position: [0, 0],
				parameters: {},
			} as INodeUi;
		}

		// A → B chain where A, B, and a sticky share a group; C stays ungrouped.
		function setupStickyGroup() {
			const nodes = [
				makeNode('a'),
				makeNode('b'),
				makeNode('c'),
				makeNode('sticky', STICKY_NODE_TYPE),
			];
			const nodesById = new Map(nodes.map((node) => [node.id, node]));

			vi.spyOn(workflowDocumentStore, 'getNodeById').mockImplementation((id: string) =>
				nodesById.get(id),
			);
			vi.spyOn(workflowDocumentStore, 'getExpressionHandler').mockReturnValue({
				getSimpleParameterValue: () => undefined,
			} as unknown as ReturnType<typeof workflowDocumentStore.getExpressionHandler>);

			const nodeTypes: Record<string, Partial<INodeTypeDescription>> = {
				'n8n-nodes-base.set': { group: ['transform'], inputs: ['main'], outputs: ['main'] },
				[STICKY_NODE_TYPE]: { group: ['input'], inputs: [], outputs: [] },
			};
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			vi.spyOn(useNodeTypesStore() as any, 'getNodeType', 'get').mockReturnValue(
				(type: string) => nodeTypes[type] ?? null,
			);

			workflowDocumentStore.createGroup(['a', 'b', 'sticky'], 'Group A');

			return { connectionsBySourceNode: { A: { main: [[mainConnection('A', 'B')[1]]] } } };
		}

		it('lets a connection to an external node proceed without auto-extend or toast', () => {
			const { connectionsBySourceNode } = setupStickyGroup();
			const guards = useCanvasNodeGroupOperationGuards();

			// Without the sticky exemption in the shared validator, the sticky
			// member would make every re-validation fail and block this change.
			const result = guards.isConnectionReplacementAllowedForNodeGroups({
				nodeIds: ['b', 'c'],
				connectionsToRemove: [],
				connectionsToAdd: [mainConnection('B', 'C')],
				connectionsBySourceNode,
			});

			expect(result).toEqual({ outcome: 'proceed' });
			expect(showToastSpy).not.toHaveBeenCalled();
		});

		it('still blocks removing the connection that keeps the group connected', () => {
			const { connectionsBySourceNode } = setupStickyGroup();
			const guards = useCanvasNodeGroupOperationGuards();

			const allowed = guards.isConnectionRemovalAllowedForNodeGroups({
				nodeIds: ['a', 'b'],
				connection: mainConnection('A', 'B'),
				connectionsBySourceNode,
			});

			expect(allowed).toBe(false);
			expect(showToastSpy).toHaveBeenCalledTimes(1);
		});
	});
});
