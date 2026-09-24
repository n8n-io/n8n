import { getEmptyGroupAnchor, type IWorkflowGroup } from 'n8n-workflow';

import { useTelemetry } from '@n8n/composables/useTelemetry';
import { TELEMETRY_EVENT } from '@n8n/telemetry';
import { injectWorkflowDocumentStore } from '@/app/stores/workflowDocument.store';
import { useRootStore } from '@n8n/stores/useRootStore';
import type { NodeCreatorOpenSource } from '@/Interface';
import { countGroupExternalConnections } from './nodeGroupTelemetry.utils';
import { useEmptyCanvasGroupsFlag } from './useEmptyCanvasGroupsFlag';

export type CanvasNodeGroupEventSource =
	| 'group-toolbar'
	| 'group-header'
	| 'keyboard-shortcut'
	| 'context-menu'
	| 'update-blocked-toast'
	| 'sub-workflow-extraction'
	// Experiment cleanup: remove with emptyCanvasGroups (121_empty_canvas_groups).
	| 'node-creator';

/**
 * Telemetry for canvas node groups: capturing how users
 * group, ungroup, collapse and expand groups.
 */
export function useCanvasNodeGroupTelemetry() {
	const telemetry = useTelemetry();
	const workflowDocumentStore = injectWorkflowDocumentStore();
	const rootStore = useRootStore();
	// Experiment cleanup: remove with emptyCanvasGroups (121_empty_canvas_groups).
	const emptyCanvasGroupsEnabled = useEmptyCanvasGroupsFlag();

	function buildProperties(group: IWorkflowGroup, source: CanvasNodeGroupEventSource) {
		return {
			workflow_id: workflowDocumentStore.value.workflowId,
			group_id: group.id,
			node_ids: group.nodeIds,
			node_count: group.nodeIds.length,
			group_title: group.name,
			source,
			push_ref: rootStore.pushRef,
		};
	}

	// Experiment cleanup: remove with emptyCanvasGroups (121_empty_canvas_groups).
	function buildGroupedProperties(
		group: IWorkflowGroup,
		source: CanvasNodeGroupEventSource,
		nodeCreatorOpenSource?: NodeCreatorOpenSource,
	) {
		if (!emptyCanvasGroupsEnabled.value) return buildProperties(group, source);

		const isEmpty = getEmptyGroupAnchor(group, workflowDocumentStore.value.allNodes) !== undefined;

		return {
			...buildProperties(group, source),
			node_ids: isEmpty ? [] : group.nodeIds,
			node_count: isEmpty ? 0 : group.nodeIds.length,
			is_empty: isEmpty,
			...(nodeCreatorOpenSource ? { node_creator_open_source: nodeCreatorOpenSource } : {}),
		};
	}

	return {
		trackGrouped(
			group: IWorkflowGroup,
			source: CanvasNodeGroupEventSource,
			// Experiment cleanup: remove with emptyCanvasGroups (121_empty_canvas_groups).
			nodeCreatorOpenSource?: NodeCreatorOpenSource,
		) {
			telemetry.track(
				TELEMETRY_EVENT.WORKFLOW.USER_GROUPED_NODES,
				buildGroupedProperties(group, source, nodeCreatorOpenSource),
			);
		},
		// Experiment cleanup: remove with emptyCanvasGroups (121_empty_canvas_groups).
		trackInitialEmptyGroupConnection(group: IWorkflowGroup) {
			if (!emptyCanvasGroupsEnabled.value) return;

			const connectionCount = countGroupExternalConnections(
				group,
				workflowDocumentStore.value.allNodes,
				workflowDocumentStore.value.connectionsBySourceNode,
			);
			if (connectionCount === 0) return;

			telemetry.track(TELEMETRY_EVENT.WORKFLOW.USER_CONNECTED_EMPTY_GROUP, {
				workflow_id: workflowDocumentStore.value.workflowId,
				group_id: group.id,
				push_ref: rootStore.pushRef,
				was_first_connection: true,
			});
		},
		trackUngrouped(group: IWorkflowGroup, source: CanvasNodeGroupEventSource) {
			telemetry.track('User ungrouped nodes', buildProperties(group, source));
		},
		trackCollapsed(group: IWorkflowGroup, source: CanvasNodeGroupEventSource) {
			telemetry.track('User collapsed group', buildProperties(group, source));
		},
		trackExpanded(group: IWorkflowGroup, source: CanvasNodeGroupEventSource) {
			telemetry.track('User expanded group', buildProperties(group, source));
		},
	};
}
