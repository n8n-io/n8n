/* eslint-disable import-x/no-extraneous-dependencies -- test-only imports */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';

const getScheduleIntegrationMock = vi.fn();
const updateScheduleIntegrationMock = vi.fn();
const activateScheduleIntegrationMock = vi.fn();
const deactivateScheduleIntegrationMock = vi.fn();

vi.mock('@n8n/stores/useRootStore', () => ({
	useRootStore: () => ({
		restApiContext: {},
		timezone: 'Europe/Berlin',
	}),
}));

vi.mock('@n8n/i18n', () => ({
	useI18n: () => ({
		baseText: (key: string, options?: { interpolate?: Record<string, string> }) => {
			if (key === 'agents.schedule.timezoneHelp') {
				return `Runs in the instance timezone: ${options?.interpolate?.timezone ?? 'UTC'}`;
			}

			return key;
		},
	}),
}));

vi.mock('@vueuse/core', () => ({
	useDebounceFn: (fn: () => void) => fn,
}));

vi.mock('../composables/useAgentApi', () => ({
	getScheduleIntegration: getScheduleIntegrationMock,
	updateScheduleIntegration: updateScheduleIntegrationMock,
	activateScheduleIntegration: activateScheduleIntegrationMock,
	deactivateScheduleIntegration: deactivateScheduleIntegrationMock,
}));

vi.setConfig({ testTimeout: 30_000 });

const STUBS = {
	N8nCard: {
		template: '<div><slot name="header" /><slot /></div>',
	},
	N8nText: {
		template: '<span v-bind="$attrs"><slot /></span>',
		props: ['size', 'bold', 'tag'],
	},
	N8nButton: {
		template:
			'<button :disabled="disabled" :data-testid="$attrs[\'data-testid\']" @click="$emit(\'click\')"><slot /></button>',
		props: ['disabled', 'loading', 'variant'],
		emits: ['click'],
	},
	N8nInput: {
		template:
			'<textarea v-if="type === \'textarea\'" :value="modelValue" :data-testid="$attrs[\'data-testid\']" @input="$emit(\'update:modelValue\', $event.target.value)" /><input v-else :value="modelValue" :data-testid="$attrs[\'data-testid\']" @input="$emit(\'update:modelValue\', $event.target.value)" />',
		props: ['modelValue', 'type', 'rows', 'disabled', 'placeholder'],
		emits: ['update:modelValue'],
	},
};

describe('AgentScheduleTriggerCard', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		getScheduleIntegrationMock.mockResolvedValue({
			active: false,
			cronExpression: '* * * * *',
			wakeUpPrompt: 'Automated message: you were triggered on schedule.',
		});
		updateScheduleIntegrationMock.mockResolvedValue({
			active: false,
			cronExpression: '* * * * *',
			wakeUpPrompt: 'Automated message: you were triggered on schedule.',
		});
		activateScheduleIntegrationMock.mockResolvedValue({
			active: true,
			cronExpression: '* * * * *',
			wakeUpPrompt: 'Automated message: you were triggered on schedule.',
		});
		deactivateScheduleIntegrationMock.mockResolvedValue({
			active: false,
			cronExpression: '* * * * *',
			wakeUpPrompt: 'Automated message: you were triggered on schedule.',
		});
	});

	async function renderComponent(props: Record<string, unknown> = {}) {
		const { default: AgentScheduleTriggerCard } = await import(
			'../components/AgentScheduleTriggerCard.vue'
		);
		const wrapper = mount(AgentScheduleTriggerCard, {
			props: {
				projectId: 'project-1',
				agentId: 'agent-1',
				isPublished: true,
				...props,
			},
			global: {
				stubs: STUBS,
			},
		});
		await flushPromises();
		return wrapper;
	}

	it('loads the persisted cron/prompt state and emits the active status', async () => {
		getScheduleIntegrationMock.mockResolvedValue({
			active: true,
			cronExpression: '*/5 * * * *',
			wakeUpPrompt: 'Wake up prompt',
		});

		const wrapper = await renderComponent();

		expect(getScheduleIntegrationMock).toHaveBeenCalledWith({}, 'project-1', 'agent-1');
		expect(
			(wrapper.find('[data-testid="schedule-cron-input"]').element as HTMLInputElement).value,
		).toBe('*/5 * * * *');
		expect(
			(wrapper.find('[data-testid="schedule-wake-up-prompt"]').element as HTMLTextAreaElement)
				.value,
		).toBe('Wake up prompt');
		expect(wrapper.emitted('status-change')?.[0]).toEqual([true]);
	});

	it('activates the schedule after saving the current config and emits trigger-added', async () => {
		const wrapper = await renderComponent();

		await wrapper.find('[data-testid="schedule-activate-button"]').trigger('click');
		await flushPromises();

		expect(updateScheduleIntegrationMock).toHaveBeenCalledWith({}, 'project-1', 'agent-1', {
			cronExpression: '* * * * *',
			wakeUpPrompt: 'Automated message: you were triggered on schedule.',
		});
		expect(activateScheduleIntegrationMock).toHaveBeenCalledWith({}, 'project-1', 'agent-1');
		expect(wrapper.emitted('trigger-added')).toBeTruthy();
		expect(wrapper.emitted('status-change')?.at(-1)).toEqual([true]);
	});

	it('keeps activation retry available after a general save error', async () => {
		updateScheduleIntegrationMock.mockRejectedValueOnce(new Error('Temporary outage'));
		const wrapper = await renderComponent();

		await wrapper.find('[data-testid="schedule-activate-button"]').trigger('click');
		await flushPromises();

		expect(wrapper.text()).toContain('Temporary outage');
		expect(
			wrapper.find('[data-testid="schedule-activate-button"]').attributes('disabled'),
		).toBeUndefined();
		expect(activateScheduleIntegrationMock).not.toHaveBeenCalled();

		updateScheduleIntegrationMock.mockResolvedValueOnce({
			active: false,
			cronExpression: '* * * * *',
			wakeUpPrompt: 'Automated message: you were triggered on schedule.',
		});

		await wrapper.find('[data-testid="schedule-activate-button"]').trigger('click');
		await flushPromises();

		expect(activateScheduleIntegrationMock).toHaveBeenCalledWith({}, 'project-1', 'agent-1');
	});

	it('autosaves cron and wake-up prompt changes', async () => {
		updateScheduleIntegrationMock.mockImplementation(async (_ctx, _projectId, _agentId, data) => ({
			active: false,
			cronExpression: data.cronExpression,
			wakeUpPrompt: data.wakeUpPrompt ?? 'Automated message: you were triggered on schedule.',
		}));
		const wrapper = await renderComponent();

		await wrapper.find('[data-testid="schedule-cron-input"]').setValue('*/10 * * * *');
		await flushPromises();

		expect(updateScheduleIntegrationMock).toHaveBeenCalledWith({}, 'project-1', 'agent-1', {
			cronExpression: '*/10 * * * *',
			wakeUpPrompt: 'Automated message: you were triggered on schedule.',
		});

		await wrapper.find('[data-testid="schedule-wake-up-prompt"]').setValue('New prompt');
		await flushPromises();

		expect(updateScheduleIntegrationMock).toHaveBeenCalledWith({}, 'project-1', 'agent-1', {
			cronExpression: '*/10 * * * *',
			wakeUpPrompt: 'New prompt',
		});
	});

	it('shows invalid cron errors below the cron input and clears them on cron edit', async () => {
		const wrapper = await renderComponent();
		updateScheduleIntegrationMock.mockRejectedValueOnce(new Error('Invalid cron expression'));

		await wrapper.find('[data-testid="schedule-cron-input"]').setValue('not-a-cron');
		await flushPromises();

		expect(wrapper.find('[data-testid="schedule-cron-error"]').text()).toBe(
			'Invalid cron expression',
		);

		updateScheduleIntegrationMock.mockResolvedValueOnce({
			active: false,
			cronExpression: '*/15 * * * *',
			wakeUpPrompt: 'Automated message: you were triggered on schedule.',
		});
		await wrapper.find('[data-testid="schedule-cron-input"]').setValue('*/15 * * * *');

		expect(wrapper.find('[data-testid="schedule-cron-error"]').exists()).toBe(false);
	});

	it('disables activation when the agent is not published', async () => {
		const wrapper = await renderComponent({ isPublished: false });

		expect(wrapper.find('[data-testid="schedule-activate-button"]').attributes('disabled')).toBe(
			'',
		);
	});
});
