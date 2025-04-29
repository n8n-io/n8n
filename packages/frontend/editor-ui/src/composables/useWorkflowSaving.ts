import { useNpsSurveyStore } from '@/stores/npsSurvey.store';
import { useUIStore } from '@/stores/ui.store';
import type { NavigationGuardNext, useRouter } from 'vue-router';
import { useMessage } from './useMessage';
import { useI18n } from '@/composables/useI18n';
import {
	MODAL_CANCEL,
	MODAL_CLOSE,
	MODAL_CONFIRM,
	PLACEHOLDER_EMPTY_WORKFLOW_ID,
	VIEWS,
} from '@/constants';
import { useWorkflowHelpers } from '@/composables/useWorkflowHelpers';
import { useWorkflowsStore } from '@/stores/workflows.store';

export function useWorkflowSaving({ router }: { router: ReturnType<typeof useRouter> }) {
	const uiStore = useUIStore();
	const npsSurveyStore = useNpsSurveyStore();
	const message = useMessage();
	const i18n = useI18n();
	const workflowsStore = useWorkflowsStore();

	const { saveCurrentWorkflow } = useWorkflowHelpers({ router });

	async function promptSaveUnsavedWorkflowChanges(
		next: NavigationGuardNext,
		{
			confirm = async () => true,
			cancel = async () => {},
		}: {
			confirm?: () => Promise<boolean>;
			cancel?: () => Promise<void>;
		} = {},
	) {
		if (!uiStore.stateIsDirty) {
			next();

			return;
		}

		const response = await message.confirm(
			i18n.baseText('generic.unsavedWork.confirmMessage.message'),
			{
				title: i18n.baseText('generic.unsavedWork.confirmMessage.headline'),
				type: 'warning',
				confirmButtonText: i18n.baseText('generic.unsavedWork.confirmMessage.confirmButtonText'),
				cancelButtonText: i18n.baseText('generic.unsavedWork.confirmMessage.cancelButtonText'),
				showClose: true,
			},
		);

		switch (response) {
			case MODAL_CONFIRM:
				const saved = await saveCurrentWorkflow({}, false);
				if (saved) {
					await npsSurveyStore.fetchPromptsData();
					uiStore.stateIsDirty = false;
					const goToNext = await confirm();
					next(goToNext);
				} else {
					// if new workflow and did not save, modal reopens again to force user to try to save again
					stayOnCurrentWorkflow(next);
				}

				return;
			case MODAL_CANCEL:
				await cancel();

				uiStore.stateIsDirty = false;
				next();

				return;
			case MODAL_CLOSE:
				// for new workflows that are not saved yet, don't do anything, only close modal
				if (workflowsStore.workflow.id !== PLACEHOLDER_EMPTY_WORKFLOW_ID) {
					stayOnCurrentWorkflow(next);
				}

				return;
		}
	}

	function stayOnCurrentWorkflow(next: NavigationGuardNext) {
		// The route may have already changed due to the browser back button, so let's restore it
		next(
			router.resolve({
				name: VIEWS.WORKFLOW,
				params: { name: workflowsStore.workflow.id },
			}),
		);
	}

	return {
		promptSaveUnsavedWorkflowChanges,
	};
}
