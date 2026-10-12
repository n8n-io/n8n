// Experiment cleanup (119_surface_assistant_on_workflow_error)
import { createTestingPinia } from '@pinia/testing';
import { setActivePinia } from 'pinia';
import { useSettingsStore } from '@n8n/stores/settings.store';

import { mockedStore } from '@/__tests__/utils';
import { SURFACE_ASSISTANT_ON_WORKFLOW_ERROR_EXPERIMENT } from '@/app/constants/experiments';
import { usePostHog } from '@/app/stores/posthog.store';
import {
	isWorkflowErrorNudgeVisible,
	resetSurfaceAssistantOnWorkflowError,
	useSurfaceAssistantOnWorkflowError,
	WORKFLOW_ERROR_NUDGE_SHOW_DELAY_MS,
} from './useSurfaceAssistantOnWorkflowError';

const canManageInstanceAi = vi.fn(() => true);
const canMessageInstanceAi = vi.fn(() => true);
vi.mock('@/features/ai/instanceAi/instanceAiPermissions', () => ({
	canManageInstanceAi: () => canManageInstanceAi(),
	canMessageInstanceAi: () => canMessageInstanceAi(),
}));

const EXECUTION_ID = 'exec-1';
const WORKFLOW_ID = 'wf-1';

function setup({
	variant = 'variant',
	cloud = true,
	assistantEnabled = true,
}: { variant?: string; cloud?: boolean; assistantEnabled?: boolean } = {}) {
	setActivePinia(createTestingPinia());

	const posthogStore = mockedStore(usePostHog);
	posthogStore.getVariant.mockReturnValue(variant);
	posthogStore.isVariantEnabled.mockImplementation((_name, expected) => variant === expected);

	const settingsStore = mockedStore(useSettingsStore);
	settingsStore.isCloudDeployment = cloud;
	settingsStore.isModuleActive.mockReturnValue(true);
	settingsStore.moduleSettings = {
		'instance-ai': { enabled: assistantEnabled, setupCompleted: true },
	} as typeof settingsStore.moduleSettings;

	return { posthogStore, trigger: useSurfaceAssistantOnWorkflowError().triggerOnWorkflowError };
}

describe('useSurfaceAssistantOnWorkflowError', () => {
	beforeEach(() => {
		vi.useFakeTimers();
		canManageInstanceAi.mockReturnValue(true);
		canMessageInstanceAi.mockReturnValue(true);
		resetSurfaceAssistantOnWorkflowError();
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	it('shows the nudge after the delay for the variant arm', () => {
		const { posthogStore, trigger } = setup();

		trigger(EXECUTION_ID, WORKFLOW_ID);

		expect(posthogStore.trackExposure).toHaveBeenCalledWith(
			SURFACE_ASSISTANT_ON_WORKFLOW_ERROR_EXPERIMENT.name,
		);
		expect(isWorkflowErrorNudgeVisible.value).toBe(false);

		vi.advanceTimersByTime(WORKFLOW_ERROR_NUDGE_SHOW_DELAY_MS);

		expect(isWorkflowErrorNudgeVisible.value).toBe(true);
	});

	it('tracks exposure but does not show the nudge for the control arm', () => {
		const { posthogStore, trigger } = setup({ variant: 'control' });

		trigger(EXECUTION_ID, WORKFLOW_ID);
		vi.advanceTimersByTime(WORKFLOW_ERROR_NUDGE_SHOW_DELAY_MS);

		expect(posthogStore.trackExposure).toHaveBeenCalled();
		expect(isWorkflowErrorNudgeVisible.value).toBe(false);
	});

	it('skips self-hosted instances entirely', () => {
		const { posthogStore, trigger } = setup({ cloud: false });

		trigger(EXECUTION_ID, WORKFLOW_ID);
		vi.advanceTimersByTime(WORKFLOW_ERROR_NUDGE_SHOW_DELAY_MS);

		expect(posthogStore.trackExposure).not.toHaveBeenCalled();
		expect(isWorkflowErrorNudgeVisible.value).toBe(false);
	});

	it('ignores a repeated trigger for the same execution unless reopen is set', () => {
		const { trigger } = setup();

		trigger(EXECUTION_ID, WORKFLOW_ID);
		vi.advanceTimersByTime(WORKFLOW_ERROR_NUDGE_SHOW_DELAY_MS);
		isWorkflowErrorNudgeVisible.value = false;

		trigger(EXECUTION_ID, WORKFLOW_ID);
		vi.advanceTimersByTime(WORKFLOW_ERROR_NUDGE_SHOW_DELAY_MS);
		expect(isWorkflowErrorNudgeVisible.value).toBe(false);

		trigger(EXECUTION_ID, WORKFLOW_ID, { reopen: true });
		vi.advanceTimersByTime(WORKFLOW_ERROR_NUDGE_SHOW_DELAY_MS);
		expect(isWorkflowErrorNudgeVisible.value).toBe(true);
	});

	it('hides the nudge when the user cannot message the Assistant', () => {
		canMessageInstanceAi.mockReturnValue(false);
		const { trigger } = setup();

		trigger(EXECUTION_ID, WORKFLOW_ID);
		vi.advanceTimersByTime(WORKFLOW_ERROR_NUDGE_SHOW_DELAY_MS);

		expect(isWorkflowErrorNudgeVisible.value).toBe(false);
	});

	it('shows the nudge to an admin when the Assistant is disabled', () => {
		const { trigger } = setup({ assistantEnabled: false });

		trigger(EXECUTION_ID, WORKFLOW_ID);
		vi.advanceTimersByTime(WORKFLOW_ERROR_NUDGE_SHOW_DELAY_MS);

		expect(isWorkflowErrorNudgeVisible.value).toBe(true);
	});

	it('hides the nudge from a member when the Assistant is disabled', () => {
		canManageInstanceAi.mockReturnValue(false);
		const { trigger } = setup({ assistantEnabled: false });

		trigger(EXECUTION_ID, WORKFLOW_ID);
		vi.advanceTimersByTime(WORKFLOW_ERROR_NUDGE_SHOW_DELAY_MS);

		expect(isWorkflowErrorNudgeVisible.value).toBe(false);
	});
});
