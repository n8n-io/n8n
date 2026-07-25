import type { IWorkflowGroup } from 'n8n-workflow';
import { validateNodeSelectionForGrouping } from 'n8n-workflow';
import { escapeHtml } from 'xss';

import { useI18n } from '@n8n/i18n';
import { useRootStore } from '@n8n/stores/useRootStore';

import type { INodeUi } from '@/Interface';
import { useNodeTypesStore } from '@/app/stores/nodeTypes.store';
import type { WorkflowDocumentStore } from '@/app/stores/workflowDocument.store';
import { useTelemetry } from './useTelemetry';
import { useToast } from './useToast';

/**
 * Removes node groups that this instance's backend would reject on save
 * (`validateWorkflowNodeGroups`), using the same shared validator.
 *
 * Newer n8n versions may allow group shapes this version rejects (e.g. new
 * groupable node types or looser connectivity rules). When such a workflow is
 * saved here, the backend rejects every save attempt and autosave gets stuck
 * in a retry loop of error toasts. Ungrouping the offending groups up front
 * lets the save go through — nodes and connections are left untouched.
 */
export function useInvalidNodeGroupCleanup() {
	const nodeTypesStore = useNodeTypesStore();
	const rootStore = useRootStore();
	const toast = useToast();
	const telemetry = useTelemetry();
	const i18n = useI18n();

	function isGroupValid(
		store: WorkflowDocumentStore,
		group: IWorkflowGroup,
		allGroups: IWorkflowGroup[],
	): boolean {
		// The backend rejects memberless groups
		if (group.nodeIds.length === 0) return false;

		const nodes: INodeUi[] = [];
		for (const nodeId of group.nodeIds) {
			const node = store.getNodeById(nodeId);
			// The backend rejects groups referencing nodes that don't exist
			if (!node) return false;
			nodes.push(node);
		}

		return validateNodeSelectionForGrouping({
			nodes,
			connectionsBySourceNode: store.connectionsBySourceNode,
			getNodeType: (node) => nodeTypesStore.getNodeType(node.type, node.typeVersion),
			existingNodeGroups: allGroups.filter((other) => other.id !== group.id),
		}).valid;
	}

	function showGroupsRemovedToast(removedGroups: IWorkflowGroup[]) {
		// Toast messages render as sanitized HTML, so the group names can be
		// shown as a bullet list. Escape them since they are user input.
		// The global CSS reset zeroes list padding, which clips `outside`
		// markers — position them inside so the bullets stay visible.
		const groups = `<ul style="list-style-position: inside">${removedGroups
			.map((group) => `<li>${escapeHtml(group.name)}</li>`)
			.join('')}</ul>`;

		toast.showMessage({
			title: i18n.baseText('canvas.nodeGroup.removedOnSave.title'),
			message: i18n.baseText('canvas.nodeGroup.removedOnSave.message', {
				interpolate: { groups },
			}),
			type: 'warning',
		});
	}

	/**
	 * Deletes all invalid node groups from the given workflow document and
	 * notifies the user with a single warning toast. Returns the removed groups.
	 */
	function removeInvalidNodeGroups(store: WorkflowDocumentStore): IWorkflowGroup[] {
		const groups = store.allGroups;
		if (groups.length === 0) return [];

		const invalidGroups = groups.filter((group) => !isGroupValid(store, group, groups));
		if (invalidGroups.length === 0) return [];

		for (const group of invalidGroups) {
			store.deleteGroup(group.id);
			telemetry.track('User ungrouped nodes', {
				workflow_id: store.workflowId,
				group_id: group.id,
				node_ids: group.nodeIds,
				node_count: group.nodeIds.length,
				group_title: group.name,
				source: 'invalid-on-save',
				push_ref: rootStore.pushRef,
			});
		}

		telemetry.track('Auto-ungrouped invalid node groups', {
			groups_affected: invalidGroups.length,
		});

		showGroupsRemovedToast(invalidGroups);

		return invalidGroups;
	}

	return {
		removeInvalidNodeGroups,
	};
}
