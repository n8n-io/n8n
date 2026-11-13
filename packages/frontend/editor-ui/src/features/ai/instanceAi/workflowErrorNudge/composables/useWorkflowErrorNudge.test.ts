import { createTestingPinia } from '@pinia/testing';
import { setActivePinia } from 'pinia';
import { useSettingsStore } from '@n8n/stores/settings.store';

import { mockedStore } from '@/__tests__/utils';
import {
	isWorkflowErrorNudgeVisible,
	resetWorkflowErrorNudge,
	useWorkflowErrorNudge,
	WORKFLOW_ERROR_NUDGE_SHOW_DELAY_MS,
} from './useWorkflowErrorNudge';

const canManageInstanceAi = vi.fn(() => true);
const canMessageInstanceAi = vi.fn(() => true);
vi.mock('@/features/ai/instanceAi/instanceAiPermissions', () => ({
	canManageInstanceAi: () => canManageInstanceAi(),
	canMessageInstanceAi: () => canMessageInstanceAi(),
}));

const EXECUTION_ID = 'exec-1';
const WORKFLOW_ID = 'wf-1';

function setup({
	cloud = false,
	moduleActive = true,
	assistantEnabled = true,
	setupCompleted = true,
}: {
	cloud?: boolean;
	moduleActive?: boolean;
	assistantEnabled?: boolean;
	setupCompleted?: boolean;
} = {}) {
	setActivePinia(createTestingPinia());

	const settingsStore = mockedStore(useSettingsStore);
	settingsStore.isCloudDeployment = cloud;
	settingsStore.isModuleActive.mockReturnValue(moduleActive);
	settingsStore.moduleSettings = {
		'instance-ai': { enabled: assistantEnabled, setupCompleted },
	} as typeof settingsStore.moduleSettings;

	return { settingsStore, trigger: useWorkflowErrorNudge().triggerOnWorkflowError };
}

describe('useWorkflowErrorNudge', () => {
	beforeEach(() => {
		vi.useFakeTimers();
		canManageInstanceAi.mockReturnValue(true);
		canMessageInstanceAi.mockReturnValue(true);
		resetWorkflowErrorNudge();
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	it('shows the nudge after the delay when Assistant is ready, including on self-hosted', () => {
		const { trigger } = setup({ cloud: false });

		trigger(EXECUTION_ID, WORKFLOW_ID);

		expect(isWorkflowErrorNudgeVisible.value).toBe(false);

		vi.advanceTimersByTime(WORKFLOW_ERROR_NUDGE_SHOW_DELAY_MS);

		expect(isWorkflowErrorNudgeVisible.value).toBe(true);
	});

	it('shows the nudge on Cloud when Assistant is ready', () => {
		const { trigger } = setup({ cloud: true });

		trigger(EXECUTION_ID, WORKFLOW_ID);
		vi.advanceTimersByTime(WORKFLOW_ERROR_NUDGE_SHOW_DELAY_MS);

		expect(isWorkflowErrorNudgeVisible.value).toBe(true);
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

	it('hides the nudge when Assistant is disabled, even for an admin who can turn it on', () => {
		const { trigger } = setup({ assistantEnabled: false });

		trigger(EXECUTION_ID, WORKFLOW_ID);
		vi.advanceTimersByTime(WORKFLOW_ERROR_NUDGE_SHOW_DELAY_MS);

		expect(isWorkflowErrorNudgeVisible.value).toBe(false);
	});

	it('hides the nudge when Assistant setup is incomplete, even for an admin', () => {
		const { trigger } = setup({ setupCompleted: false });

		trigger(EXECUTION_ID, WORKFLOW_ID);
		vi.advanceTimersByTime(WORKFLOW_ERROR_NUDGE_SHOW_DELAY_MS);

		expect(isWorkflowErrorNudgeVisible.value).toBe(false);
	});

	it('hides the nudge when the Assistant module is inactive', () => {
		const { trigger } = setup({ moduleActive: false });

		trigger(EXECUTION_ID, WORKFLOW_ID);
		vi.advanceTimersByTime(WORKFLOW_ERROR_NUDGE_SHOW_DELAY_MS);

		expect(isWorkflowErrorNudgeVisible.value).toBe(false);
	});

	it('does not show a scheduled nudge if Assistant stops being ready before the delay', () => {
		const { settingsStore, trigger } = setup();

		trigger(EXECUTION_ID, WORKFLOW_ID);
		settingsStore.moduleSettings = {
			'instance-ai': { enabled: false, setupCompleted: true },
		} as typeof settingsStore.moduleSettings;
		vi.advanceTimersByTime(WORKFLOW_ERROR_NUDGE_SHOW_DELAY_MS);

		expect(isWorkflowErrorNudgeVisible.value).toBe(false);
	});
});
