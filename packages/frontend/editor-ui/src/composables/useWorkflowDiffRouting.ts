import { watch } from 'vue';
import { useRoute } from 'vue-router';
import { createEventBus } from '@n8n/utils/event-bus';
import { useUIStore } from '@/stores/ui.store';
import {
	WORKFLOW_DIFF_MODAL_KEY,
	SOURCE_CONTROL_PUSH_MODAL_KEY,
	SOURCE_CONTROL_PULL_MODAL_KEY,
} from '@/constants';

/**
 * Composable that handles source control modal state based on URL query parameters
 * This enables browser back/forward navigation and direct URL access for:
 * - Push/Pull modals
 * - Workflow diff modals
 */
export function useWorkflowDiffRouting() {
	const route = useRoute();
	const uiStore = useUIStore();

	// Create event buses for modal communication
	const workflowDiffEventBus = createEventBus();

	function handleRouteChange() {
		const diffWorkflowId = route.query.diff as string;
		const direction = route.query.direction as 'push' | 'pull';
		const sourceControl = route.query.sourceControl as 'push' | 'pull';

		// Handle workflow diff modal
		if (diffWorkflowId && direction) {
			// Route has diff params - ensure diff modal is open
			const isDiffModalOpen = uiStore.modalsById[WORKFLOW_DIFF_MODAL_KEY]?.open;

			if (!isDiffModalOpen) {
				// Open the diff modal
				uiStore.openModalWithData({
					name: WORKFLOW_DIFF_MODAL_KEY,
					data: {
						eventBus: workflowDiffEventBus,
						workflowId: diffWorkflowId,
						direction,
					},
				});
			}
		} else {
			// No diff params - ensure diff modal is closed
			const isDiffModalOpen = uiStore.modalsById[WORKFLOW_DIFF_MODAL_KEY]?.open;

			if (isDiffModalOpen) {
				uiStore.closeModal(WORKFLOW_DIFF_MODAL_KEY);
			}
		}

		// Handle source control push/pull modals
		if (sourceControl && !diffWorkflowId) {
			const modalKey =
				sourceControl === 'push' ? SOURCE_CONTROL_PUSH_MODAL_KEY : SOURCE_CONTROL_PULL_MODAL_KEY;

			const isModalOpen = uiStore.modalsById[modalKey]?.open;

			if (!isModalOpen) {
				// We need to reopen the modal with fresh data
				void reopenSourceControlModal(sourceControl);
			}
		} else if (!sourceControl && !diffWorkflowId) {
			// No source control params - close both push and pull modals
			const isPushModalOpen = uiStore.modalsById[SOURCE_CONTROL_PUSH_MODAL_KEY]?.open;
			const isPullModalOpen = uiStore.modalsById[SOURCE_CONTROL_PULL_MODAL_KEY]?.open;

			if (isPushModalOpen) {
				uiStore.closeModal(SOURCE_CONTROL_PUSH_MODAL_KEY);
			}
			if (isPullModalOpen) {
				uiStore.closeModal(SOURCE_CONTROL_PULL_MODAL_KEY);
			}
		}

		// If we have direction but no diff, it means we navigated back from diff
		// Ensure the appropriate parent modal is open
		if (direction && !diffWorkflowId && !sourceControl) {
			const parentModalKey =
				direction === 'push' ? SOURCE_CONTROL_PUSH_MODAL_KEY : SOURCE_CONTROL_PULL_MODAL_KEY;

			const isParentModalOpen = uiStore.modalsById[parentModalKey]?.open;

			if (!isParentModalOpen) {
				// We need to reopen the parent modal with fresh data
				void reopenSourceControlModal(direction);
			}
		}
	}

	async function reopenSourceControlModal(direction: 'push' | 'pull') {
		try {
			if (direction === 'push') {
				// Open push modal without pre-fetched data - modal will handle loading
				uiStore.openModalWithData({
					name: SOURCE_CONTROL_PUSH_MODAL_KEY,
					data: { eventBus: createEventBus() },
				});
			} else {
				// Open pull modal without pre-fetched data - modal will handle loading
				uiStore.openModalWithData({
					name: SOURCE_CONTROL_PULL_MODAL_KEY,
					data: { eventBus: createEventBus() },
				});
			}
		} catch (error) {
			console.warn('Failed to reopen source control modal:', error);
		}
	}

	// Watch route changes and handle modal state
	watch(
		() => [route.query.diff, route.query.direction, route.query.sourceControl],
		handleRouteChange,
		{ immediate: true },
	);

	// Initial setup
	handleRouteChange();

	return {
		workflowDiffEventBus,
	};
}
