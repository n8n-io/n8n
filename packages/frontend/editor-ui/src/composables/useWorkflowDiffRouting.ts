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

	type Direction = 'push' | 'pull';

	const closeModal = (modalKey: string) => {
		if (uiStore.modalsById[modalKey]?.open) {
			uiStore.closeModal(modalKey);
		}
	};

	const reopenSourceControlModal = (direction: Direction, preserveData = false) => {
		const modalKey =
			direction === 'push' ? SOURCE_CONTROL_PUSH_MODAL_KEY : SOURCE_CONTROL_PULL_MODAL_KEY;

		// If preserving data, try to reuse existing data from recently closed modal
		// This helps when returning from diff modal via query manipulation (no browser history)
		const modalData =
			preserveData && uiStore.modalsById[modalKey]?.data?.eventBus
				? uiStore.modalsById[modalKey].data
				: { eventBus: createEventBus() };

		uiStore.openModalWithData({
			name: modalKey,
			data: modalData,
		});
	};

	const handleDiffModal = (
		diffWorkflowId: string | undefined,
		direction: Direction | undefined,
	) => {
		const shouldOpen = diffWorkflowId && direction;
		const isOpen = uiStore.modalsById[WORKFLOW_DIFF_MODAL_KEY]?.open;

		if (shouldOpen && !isOpen) {
			uiStore.openModalWithData({
				name: WORKFLOW_DIFF_MODAL_KEY,
				data: {
					eventBus: workflowDiffEventBus,
					workflowId: diffWorkflowId,
					direction,
				},
			});
		} else if (!shouldOpen && isOpen) {
			uiStore.closeModal(WORKFLOW_DIFF_MODAL_KEY);
		}
	};

	const handleSourceControlModals = (
		sourceControl: Direction | undefined,
		diffWorkflowId: string | undefined,
		direction: Direction | undefined,
	) => {
		// Open source control modal when sourceControl param present (but not viewing diff)
		if (sourceControl && !diffWorkflowId) {
			const modalKey =
				sourceControl === 'push' ? SOURCE_CONTROL_PUSH_MODAL_KEY : SOURCE_CONTROL_PULL_MODAL_KEY;
			const isOpen = uiStore.modalsById[modalKey]?.open;

			if (!isOpen) {
				reopenSourceControlModal(sourceControl);
			}
			return;
		}

		// Open parent modal when returning from diff (direction without diff or sourceControl)
		if (direction && !diffWorkflowId && !sourceControl) {
			const modalKey =
				direction === 'push' ? SOURCE_CONTROL_PUSH_MODAL_KEY : SOURCE_CONTROL_PULL_MODAL_KEY;
			const isOpen = uiStore.modalsById[modalKey]?.open;

			if (!isOpen) {
				// Always preserve data when returning from diff modal
				// This handles both router.back() and query manipulation scenarios
				reopenSourceControlModal(direction, true);
			}
			return;
		}

		// Close both modals when no relevant params
		if (!sourceControl && !diffWorkflowId) {
			closeModal(SOURCE_CONTROL_PUSH_MODAL_KEY);
			closeModal(SOURCE_CONTROL_PULL_MODAL_KEY);
		}
	};

	const handleRouteChange = () => {
		const diffWorkflowId = typeof route.query.diff === 'string' ? route.query.diff : undefined;
		const direction =
			typeof route.query.direction === 'string' &&
			(route.query.direction === 'push' || route.query.direction === 'pull')
				? route.query.direction
				: undefined;
		const sourceControl =
			typeof route.query.sourceControl === 'string' &&
			(route.query.sourceControl === 'push' || route.query.sourceControl === 'pull')
				? route.query.sourceControl
				: undefined;

		handleDiffModal(diffWorkflowId, direction);
		handleSourceControlModals(sourceControl, diffWorkflowId, direction);
	};

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
