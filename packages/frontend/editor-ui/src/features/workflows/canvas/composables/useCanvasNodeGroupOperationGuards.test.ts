import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import type { VNode } from 'vue';

import { useCanvasNodeGroupOperationGuards } from './useCanvasNodeGroupOperationGuards';
import {
	createWorkflowDocumentId,
	useWorkflowDocumentStore,
} from '@/app/stores/workflowDocument.store';
import { useWorkflowsStore } from '@/app/stores/workflows.store';
import { usePostHog } from '@/app/stores/posthog.store';
import { CANVAS_NODES_GROUPING_EXPERIMENT } from '@/app/constants';
import { useTelemetry } from '@/app/composables/useTelemetry';

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
		vi.spyOn(usePostHog(), 'isFeatureEnabled').mockImplementation(
			(name) => name === CANVAS_NODES_GROUPING_EXPERIMENT.name,
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
});
