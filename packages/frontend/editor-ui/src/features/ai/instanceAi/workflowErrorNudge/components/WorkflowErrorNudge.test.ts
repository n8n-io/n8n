import { createTestingPinia } from '@pinia/testing';
import { setActivePinia } from 'pinia';
import { useSettingsStore } from '@n8n/stores/settings.store';
import { TELEMETRY_EVENT } from '@n8n/telemetry';
import userEvent from '@testing-library/user-event';
import { within } from '@testing-library/vue';
import { nextTick } from 'vue';

import { createComponentRenderer } from '@/__tests__/render';
import { mockedStore } from '@/__tests__/utils';
import {
	resetWorkflowErrorNudge,
	useWorkflowErrorNudge,
	WORKFLOW_ERROR_NUDGE_SHOW_DELAY_MS,
} from '../composables/useWorkflowErrorNudge';
import WorkflowErrorNudge from './WorkflowErrorNudge.vue';

const track = vi.fn();
vi.mock('@n8n/composables/useTelemetry', () => ({
	useTelemetry: () => ({ track }),
}));

const openWorkflow = vi.fn();
vi.mock('@/features/ai/instanceAi/composables/useInstanceAiHandoffCapability', () => ({
	useInstanceAiHandoffCapability: () => ({ openWorkflow }),
}));

const WORKFLOW_ID = 'wf-1';

vi.mock('vue-router', () => ({
	useRouter: () => ({ push: vi.fn() }),
	useRoute: () => ({ params: { workflowId: WORKFLOW_ID }, query: {} }),
}));

const canMessageInstanceAi = vi.fn(() => true);
vi.mock('@/features/ai/instanceAi/instanceAiPermissions', () => ({
	canManageInstanceAi: () => true,
	canMessageInstanceAi: () => canMessageInstanceAi(),
}));

const renderComponent = createComponentRenderer(WorkflowErrorNudge);

const EXECUTION_ID = 'exec-1';

let appRoot: HTMLElement | undefined;
let unmount: (() => void) | undefined;

async function showCta(workflowId = WORKFLOW_ID) {
	appRoot = document.createElement('div');
	appRoot.id = 'n8n-app';
	appRoot.innerHTML =
		'<div class="el-notification content-toast workflow-error-nudge-toast" style="bottom: 16px"><div class="el-notification__group"></div></div>' +
		'<div class="el-notification content-toast" style="bottom: 72px"><div class="el-notification__group"></div></div>';
	document.body.append(appRoot);

	const pinia = createTestingPinia();
	setActivePinia(pinia);
	const settingsStore = mockedStore(useSettingsStore);
	settingsStore.isModuleActive.mockReturnValue(true);
	settingsStore.moduleSettings = {
		'instance-ai': { enabled: true, setupCompleted: true },
	} as typeof settingsStore.moduleSettings;

	unmount = renderComponent({ pinia }).unmount;

	vi.useFakeTimers();
	useWorkflowErrorNudge().triggerOnWorkflowError(EXECUTION_ID, workflowId);
	await vi.advanceTimersByTimeAsync(WORKFLOW_ERROR_NUDGE_SHOW_DELAY_MS);
	await nextTick();
	vi.useRealTimers();

	const group = appRoot.querySelector('.el-notification__group');
	if (!(group instanceof HTMLElement)) {
		throw new Error('Error toast group was not found');
	}
	return { group: within(group), settingsStore };
}

async function showCtaButton() {
	const { group } = await showCta();
	return group.getByTestId('workflow-error-nudge-action');
}

describe('WorkflowErrorNudge', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		canMessageInstanceAi.mockReturnValue(true);
		resetWorkflowErrorNudge();
	});

	afterEach(() => {
		unmount?.();
		unmount = undefined;
		appRoot?.remove();
		appRoot = undefined;
		resetWorkflowErrorNudge();
		vi.useRealTimers();
	});

	it('injects the Fix with Assistant button into the error toast after a workflow error', async () => {
		const button = await showCtaButton();

		expect(button).toHaveTextContent('Fix with n8n Assistant');
		expect(button.closest('.el-notification.content-toast')).toBe(appRoot?.firstElementChild);
		expect(track).toHaveBeenCalledWith(
			TELEMETRY_EVENT.INSTANCE_AI.USER_VIEWED_FIX_WITH_ASSISTANT_NUDGE,
			{},
		);
	});

	it('restacks the toasts with the height of the mounted button', async () => {
		const TOAST_HEIGHT_PX = 40;
		const BUTTON_HEIGHT_PX = 40;
		const offsetHeight = vi
			.spyOn(HTMLElement.prototype, 'offsetHeight', 'get')
			.mockImplementation(function (this: HTMLElement) {
				const hasButton = this.querySelector('[data-test-id="workflow-error-nudge-action"]');
				return hasButton ? TOAST_HEIGHT_PX + BUTTON_HEIGHT_PX : TOAST_HEIGHT_PX;
			});

		await showCta();

		const toastAbove = appRoot?.querySelector<HTMLElement>(
			'.el-notification:not(.workflow-error-nudge-toast)',
		);
		expect(toastAbove?.style.bottom).toBe(`${16 + TOAST_HEIGHT_PX + BUTTON_HEIGHT_PX + 16}px`);
		offsetHeight.mockRestore();
	});

	it('does not inject the button when the error belongs to another workflow', async () => {
		const { group } = await showCta('other-workflow');

		expect(group.queryByTestId('workflow-error-nudge-action')).toBeNull();
		expect(track).not.toHaveBeenCalled();
	});

	it('opens the Assistant when the button is clicked', async () => {
		const button = await showCtaButton();

		await userEvent.click(button);

		expect(track).toHaveBeenCalledWith(
			TELEMETRY_EVENT.INSTANCE_AI.USER_CLICKED_ERROR_TOAST_FIX_WITH_ASSISTANT,
			{},
		);
		expect(openWorkflow).toHaveBeenCalledWith('workflow_error_nudge');
	});

	it('removes the button when Assistant stops being ready', async () => {
		const { group, settingsStore } = await showCta();

		expect(group.getByTestId('workflow-error-nudge-action')).toBeTruthy();

		settingsStore.moduleSettings = {
			'instance-ai': { enabled: false, setupCompleted: true },
		} as typeof settingsStore.moduleSettings;
		await nextTick();

		expect(group.queryByTestId('workflow-error-nudge-action')).toBeNull();
	});
});
