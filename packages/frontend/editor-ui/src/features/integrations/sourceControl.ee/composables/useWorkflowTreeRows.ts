import type { SourceControlledFile } from '@n8n/api-types';
import type { SourceControlTreeRow } from '../sourceControl.types';
import { buildWorkflowTreeRows } from '../sourceControl.utils';
import { computed, ref, type Ref } from 'vue';

export function useWorkflowTreeRows<T extends SourceControlledFile>(workflows: Readonly<Ref<T[]>>) {
	const collapsedFolderIds = ref<Set<string>>(new Set());

	const workflowTreeRows = computed<Array<SourceControlTreeRow<T>>>(() =>
		buildWorkflowTreeRows(workflows.value),
	);

	const visibleWorkflowRows = computed<Array<SourceControlTreeRow<T>>>(() => {
		const visibleRows: Array<SourceControlTreeRow<T>> = [];
		const collapsedDepths: number[] = [];

		for (const row of workflowTreeRows.value) {
			while (collapsedDepths.length && row.depth <= collapsedDepths[collapsedDepths.length - 1]) {
				collapsedDepths.pop();
			}

			if (collapsedDepths.length) {
				continue;
			}

			visibleRows.push(row);

			if (row.type === 'folder' && collapsedFolderIds.value.has(row.id)) {
				collapsedDepths.push(row.depth);
			}
		}

		return visibleRows;
	});

	function isFolderCollapsed(folderId: string) {
		return collapsedFolderIds.value.has(folderId);
	}

	function toggleFolderCollapse(folderId: string) {
		if (collapsedFolderIds.value.has(folderId)) {
			collapsedFolderIds.value.delete(folderId);
			return;
		}

		collapsedFolderIds.value.add(folderId);
	}

	function expandFolders(folderIds: string[]) {
		for (const folderId of folderIds) {
			collapsedFolderIds.value.delete(folderId);
		}
	}

	function getAncestorFolderIdsForWorkflow(workflowId: string): string[] {
		const ancestorStack: Array<{ id: string; depth: number }> = [];

		for (const row of workflowTreeRows.value) {
			while (ancestorStack.length && row.depth <= ancestorStack[ancestorStack.length - 1].depth) {
				ancestorStack.pop();
			}

			if (row.type === 'folder') {
				ancestorStack.push({ id: row.id, depth: row.depth });
				continue;
			}

			if (row.file.id === workflowId) {
				return ancestorStack.map(({ id }) => id);
			}
		}

		return [];
	}

	return {
		collapsedFolderIds,
		workflowTreeRows,
		visibleWorkflowRows,
		isFolderCollapsed,
		toggleFolderCollapse,
		expandFolders,
		getAncestorFolderIdsForWorkflow,
	};
}
