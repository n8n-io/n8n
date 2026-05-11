import type { SourceControlledFile } from '@n8n/api-types';
import type { SourceControlTreeRow } from '../sourceControl.types';
import { nextTick, ref, type Ref } from 'vue';

type WorkflowScroller = { scrollToItem: (index: number) => void; $el?: Element };

export function useRevealWorkflowInScroller<T extends SourceControlledFile>({
	visibleWorkflowRows,
	workflowScroller,
	activeTab,
	workflowTabValue,
	currentWorkflowId,
	isLoading,
	expandAncestorFolders,
}: {
	visibleWorkflowRows: Readonly<Ref<Array<SourceControlTreeRow<T>>>>;
	workflowScroller: Readonly<Ref<WorkflowScroller | null>>;
	activeTab: Readonly<Ref<string>>;
	workflowTabValue: string;
	currentWorkflowId: Readonly<Ref<string | undefined>>;
	isLoading: Readonly<Ref<boolean>>;
	expandAncestorFolders: (workflowId: string) => void;
}) {
	const hasScrolledCurrentWorkflow = ref(false);
	const isRevealInProgress = ref(false);

	function getCurrentWorkflowRowElement(workflowId: string): HTMLElement | null {
		const scrollerRoot = workflowScroller.value?.$el;
		if (!(scrollerRoot instanceof Element)) {
			return null;
		}

		return scrollerRoot.querySelector<HTMLElement>(`[data-workflow-id="${workflowId}"]`);
	}

	async function revealAndScrollToCurrentWorkflow() {
		const isWorkflowTab = activeTab.value === workflowTabValue;
		if (
			isRevealInProgress.value ||
			hasScrolledCurrentWorkflow.value ||
			!isWorkflowTab ||
			!currentWorkflowId.value ||
			isLoading.value
		) {
			return;
		}

		isRevealInProgress.value = true;
		try {
			expandAncestorFolders(currentWorkflowId.value);

			for (let attempt = 0; attempt < 6; attempt++) {
				if (attempt > 0) {
					// Wait for DOM updates after folder expansion before retrying lookup.
					await nextTick();
				}

				const visibleIndex = visibleWorkflowRows.value.findIndex(
					(row) => row.type === 'file' && row.file.id === currentWorkflowId.value,
				);
				const scroller = workflowScroller.value;

				if (visibleIndex >= 0 && scroller) {
					scroller.scrollToItem(visibleIndex);

					const workflowRowElement = getCurrentWorkflowRowElement(currentWorkflowId.value);
					if (!workflowRowElement) {
						continue;
					}

					workflowRowElement.scrollIntoView({ block: 'center', inline: 'nearest' });
					hasScrolledCurrentWorkflow.value = true;
					return;
				}
			}
		} finally {
			isRevealInProgress.value = false;
		}
	}

	return { revealAndScrollToCurrentWorkflow };
}
