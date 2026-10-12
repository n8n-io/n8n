// Experiment cleanup (119_surface_assistant_on_workflow_error)
// Defines the logic for showing the "Fix with n8n Assistant" button on workflow error toasts.
import { useSettingsStore } from '@n8n/stores/settings.store';
import { ref } from 'vue';
import { TIME } from '@/app/constants';
import { SURFACE_ASSISTANT_ON_WORKFLOW_ERROR_EXPERIMENT } from '@/app/constants/experiments';
import { usePostHog } from '@/app/stores/posthog.store';
import { CLOUD_ONLY } from '@/experiments/surfaceAssistantOnWorkflowError/cloudOnly';
import { useInstanceAiAvailable } from '@/features/ai/instanceAi/composables/useInstanceAiAvailability';
import { canManageInstanceAi } from '@/features/ai/instanceAi/instanceAiPermissions';

export const WORKFLOW_ERROR_NUDGE_SHOW_DELAY_MS = 1 * TIME.SECOND;
export const WORKFLOW_ERROR_NUDGE_BORDER_PASS_MS = 800;

export const WORKFLOW_ERROR_NUDGE_TOAST_CLASS = 'workflow-error-nudge-toast';
export const WORKFLOW_ERROR_NUDGE_TOAST_CUSTOM_CLASS = `content-toast ${WORKFLOW_ERROR_NUDGE_TOAST_CLASS}`;

export type WorkflowErrorNudgeVariant = (typeof SURFACE_ASSISTANT_ON_WORKFLOW_ERROR_EXPERIMENT)[
	| 'control'
	| 'variant'];

let lastTriggeredExecutionId: string | undefined;
let showNudgeTimer: ReturnType<typeof setTimeout> | undefined;

export const isWorkflowErrorNudgeVisible = ref(false);
export const workflowErrorNudgeWorkflowId = ref<string | undefined>();
export const workflowErrorNudgeVariant = ref<WorkflowErrorNudgeVariant>(
	SURFACE_ASSISTANT_ON_WORKFLOW_ERROR_EXPERIMENT.control,
);

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

export function resetSurfaceAssistantOnWorkflowError() {
	lastTriggeredExecutionId = undefined;
	workflowErrorNudgeWorkflowId.value = undefined;
	workflowErrorNudgeVariant.value = SURFACE_ASSISTANT_ON_WORKFLOW_ERROR_EXPERIMENT.control;
	clearShowNudgeTimer();
	isWorkflowErrorNudgeVisible.value = false;
}

export function useSurfaceAssistantOnWorkflowError() {
	const posthogStore = usePostHog();
	const settingsStore = useSettingsStore();
	const instanceAiAvailable = useInstanceAiAvailable();

	function canShowWorkflowErrorNudge(): boolean {
		if (instanceAiAvailable.value) return true;

		return (
			settingsStore.isModuleActive('instance-ai') &&
			settingsStore.moduleSettings['instance-ai']?.enabled === false &&
			canManageInstanceAi()
		);
	}

	function triggerOnWorkflowError(
		executionId: string,
		workflowId: string,
		options?: { reopen?: boolean },
	) {
		if (CLOUD_ONLY && !settingsStore.isCloudDeployment) {
			return;
		}

		if (lastTriggeredExecutionId === executionId && !options?.reopen) {
			return;
		}

		posthogStore.trackExposure(SURFACE_ASSISTANT_ON_WORKFLOW_ERROR_EXPERIMENT.name);

		if (
			!posthogStore.isVariantEnabled(
				SURFACE_ASSISTANT_ON_WORKFLOW_ERROR_EXPERIMENT.name,
				SURFACE_ASSISTANT_ON_WORKFLOW_ERROR_EXPERIMENT.variant,
			)
		) {
			return;
		}

		if (!canShowWorkflowErrorNudge()) {
			return;
		}

		lastTriggeredExecutionId = executionId;
		workflowErrorNudgeWorkflowId.value = workflowId;
		workflowErrorNudgeVariant.value = SURFACE_ASSISTANT_ON_WORKFLOW_ERROR_EXPERIMENT.variant;
		clearShowNudgeTimer();
		showNudgeTimer = setTimeout(() => {
			showNudgeTimer = undefined;
			isWorkflowErrorNudgeVisible.value = true;
		}, WORKFLOW_ERROR_NUDGE_SHOW_DELAY_MS);
	}

	return { triggerOnWorkflowError };
}
