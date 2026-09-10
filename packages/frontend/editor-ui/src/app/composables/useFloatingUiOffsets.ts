import { useAssistantStore } from '@/features/ai/assistant/assistant.store';
import { useChatPanelStore } from '@/features/ai/assistant/chatPanel.store';
import { useLogsStore } from '@/app/stores/logs.store';
import { useNDVStore } from '@/features/ndv/shared/ndv.store';
import type { WorkflowDocumentId } from '@/app/stores/workflowDocument.store';
import { computed, type Ref } from 'vue';

const ASSISTANT_FLOATING_BUTTON_SIZE = 42;
const ASK_AI_OFFSET = 16;

/**
 * Called from `App.vue`, which sits above the workflow document provide tree
 * and therefore cannot use `injectNDVStore()`. The current workflow document id
 * is passed in (null when no workflow is loaded); the scoped NDV store is
 * derived from it here.
 */
export function useFloatingUiOffsets(workflowDocumentId: Readonly<Ref<WorkflowDocumentId | null>>) {
	const assistantStore = useAssistantStore();
	const chatPanelStore = useChatPanelStore();
	const logsStore = useLogsStore();

	const ndvStore = computed(() =>
		workflowDocumentId.value ? useNDVStore(workflowDocumentId.value) : null,
	);

	return {
		askAiFloatingButtonBottomOffset: computed(() => `${ASK_AI_OFFSET}px`),
		toastBottomOffset: computed(() => {
			const logsPanelOffset =
				ndvStore.value?.isNDVOpen || chatPanelStore.isOpen ? 0 : logsStore.height;
			const assistantOffset = assistantStore.isFloatingButtonShown
				? ASSISTANT_FLOATING_BUTTON_SIZE + ASK_AI_OFFSET
				: 0;

			return `${logsPanelOffset + assistantOffset}px`;
		}),
		toastRightOffset: computed(() => (chatPanelStore.isOpen ? `${chatPanelStore.width}px` : '0px')),
	};
}
