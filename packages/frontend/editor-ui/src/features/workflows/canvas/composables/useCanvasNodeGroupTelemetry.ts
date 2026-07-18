import type { IWorkflowGroup } from 'n8n-workflow';

import { useTelemetry } from '@/app/composables/useTelemetry';
import { injectWorkflowDocumentStore } from '@/app/stores/workflowDocument.store';
import { useRootStore } from '@n8n/stores/useRootStore';

export type CanvasNodeGroupEventSource =
	| 'group-toolbar'
	| 'group-header'
	| 'keyboard-shortcut'
	| 'context-menu'
	| 'update-blocked-toast';

/**
 * Telemetry for canvas node groups: capturing how users
 * group, ungroup, collapse and expand groups.
 */
export function useCanvasNodeGroupTelemetry() {
	const telemetry = useTelemetry();
	const workflowDocumentStore = injectWorkflowDocumentStore();
	const rootStore = useRootStore();

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

	return {
		trackGrouped(group: IWorkflowGroup, source: CanvasNodeGroupEventSource) {
			telemetry.track('User grouped nodes', buildProperties(group, source));
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
