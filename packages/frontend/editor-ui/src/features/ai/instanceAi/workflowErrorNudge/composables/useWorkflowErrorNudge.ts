// Shows the "Fix with n8n Assistant" button on a workflow error toast when Assistant can answer.
import { ref } from 'vue';
import { TIME } from '@/app/constants';
import { useInstanceAiReady } from '@/features/ai/instanceAi/composables/useInstanceAiAvailability';

export const WORKFLOW_ERROR_NUDGE_SHOW_DELAY_MS = 1 * TIME.SECOND;
export const WORKFLOW_ERROR_NUDGE_BORDER_PASS_MS = 800;

export const WORKFLOW_ERROR_NUDGE_TOAST_CLASS = 'workflow-error-nudge-toast';
export const WORKFLOW_ERROR_NUDGE_TOAST_CUSTOM_CLASS = `content-toast ${WORKFLOW_ERROR_NUDGE_TOAST_CLASS}`;

let lastTriggeredExecutionId: string | undefined;
let showNudgeTimer: ReturnType<typeof setTimeout> | undefined;

export const isWorkflowErrorNudgeVisible = ref(false);
export const workflowErrorNudgeWorkflowId = ref<string | undefined>();

function clearShowNudgeTimer() {
	if (showNudgeTimer === undefined) return;
	clearTimeout(showNudgeTimer);
	showNudgeTimer = undefined;
}

export function dismissWorkflowErrorNudge() {
	clearShowNudgeTimer();
	isWorkflowErrorNudgeVisible.value = false;
}

export function releaseWorkflowErrorNudge(executionId: string) {
	if (lastTriggeredExecutionId !== executionId) return;

	dismissWorkflowErrorNudge();
}

export function resetWorkflowErrorNudge() {
	lastTriggeredExecutionId = undefined;
	workflowErrorNudgeWorkflowId.value = undefined;
	clearShowNudgeTimer();
	isWorkflowErrorNudgeVisible.value = false;
}

export function useWorkflowErrorNudge() {
	const instanceAiReady = useInstanceAiReady();

	function triggerOnWorkflowError(
		executionId: string,
		workflowId: string,
		options?: { reopen?: boolean },
	) {
		if (lastTriggeredExecutionId === executionId && !options?.reopen) {
			return;
		}

		if (!instanceAiReady.value) {
			return;
		}

		lastTriggeredExecutionId = executionId;
		workflowErrorNudgeWorkflowId.value = workflowId;
		clearShowNudgeTimer();
		showNudgeTimer = setTimeout(() => {
			showNudgeTimer = undefined;
			if (!instanceAiReady.value) return;
			isWorkflowErrorNudgeVisible.value = true;
		}, WORKFLOW_ERROR_NUDGE_SHOW_DELAY_MS);
	}

	return { triggerOnWorkflowError };
}
