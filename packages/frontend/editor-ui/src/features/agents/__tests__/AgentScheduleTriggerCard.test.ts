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
	}),
}));

vi.mock('@n8n/i18n', () => ({
	useI18n: () => ({
		baseText: (key: string) => key,
	}),
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
	N8nIcon: {
		template: '<i />',
		props: ['icon', 'size'],
	},
	N8nButton: {
		template:
			'<button :disabled="disabled" :data-testid="$attrs[\'data-testid\']" @click="$emit(\'click\')"><slot /></button>',
		props: ['disabled', 'loading', 'variant', 'type'],
		emits: ['click'],
	},
	N8nInput: {
		template:
			'<textarea v-if="type === \'textarea\'" :value="modelValue" :data-testid="$attrs[\'data-testid\']" @input="$emit(\'update:modelValue\', $event.target.value)" /><input v-else :value="modelValue" :data-testid="$attrs[\'data-testid\']" @input="$emit(\'update:modelValue\', $event.target.value)" />',
		props: ['modelValue', 'type', 'rows', 'disabled', 'placeholder'],
		emits: ['update:modelValue'],
	},
	N8nSwitch2: {
		template:
			'<input type="checkbox" :checked="modelValue" :disabled="disabled" ' +
			':data-testid="$attrs[\'data-testid\']" ' +
			'@change="$emit(\'update:modelValue\', $event.target.checked)" />',
		props: ['modelValue', 'disabled', 'size'],
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

	it('loads the persisted cron state and emits the configured status', async () => {
		getScheduleIntegrationMock.mockResolvedValue({
			active: true,
			cronExpression: '*/5 * * * *',
			wakeUpPrompt: 'Automated message: you were triggered on schedule.',
		});

		const wrapper = await renderComponent();

		expect(getScheduleIntegrationMock).toHaveBeenCalledWith({}, 'project-1', 'agent-1');
		expect(
			(wrapper.find('[data-testid="schedule-cron-input"]').element as HTMLInputElement).value,
		).toBe('*/5 * * * *');
		expect(wrapper.emitted('status-change')?.[0]).toEqual([true]);
	});

	it('activates the schedule after saving the current config and emits trigger-added', async () => {
		getScheduleIntegrationMock.mockResolvedValueOnce({
			active: false,
			cronExpression: '',
			wakeUpPrompt: 'Automated message: you were triggered on schedule.',
		});
		const wrapper = await renderComponent();

		await wrapper.find('[data-testid="schedule-cron-input"]').setValue('* * * * *');
		await wrapper.find('[data-testid="schedule-active-toggle"]').trigger('click');
		await wrapper.find('[data-testid="schedule-save-button"]').trigger('click');
		await flushPromises();

		expect(updateScheduleIntegrationMock).toHaveBeenCalledWith({}, 'project-1', 'agent-1', {
			cronExpression: '* * * * *',
			wakeUpPrompt: 'Automated message: you were triggered on schedule.',
		});
		expect(activateScheduleIntegrationMock).toHaveBeenCalledWith({}, 'project-1', 'agent-1');
		expect(wrapper.emitted('trigger-added')).toBeTruthy();
		expect(wrapper.emitted('saved')).toBeTruthy();
		expect(wrapper.emitted('status-change')?.at(-1)).toEqual([true]);
	});

	it('keeps activation retry available after a general save error', async () => {
		updateScheduleIntegrationMock.mockRejectedValueOnce(new Error('Temporary outage'));
		const wrapper = await renderComponent();

		await wrapper.find('[data-testid="schedule-active-toggle"]').trigger('click');
		await wrapper.find('[data-testid="schedule-save-button"]').trigger('click');
		await flushPromises();

		expect(wrapper.text()).toContain('Temporary outage');
		expect(
			wrapper.find('[data-testid="schedule-save-button"]').attributes('disabled'),
		).toBeUndefined();
		expect(activateScheduleIntegrationMock).not.toHaveBeenCalled();
		expect(wrapper.emitted('saved')).toBeUndefined();

		updateScheduleIntegrationMock.mockResolvedValueOnce({
			active: false,
			cronExpression: '* * * * *',
			wakeUpPrompt: 'Automated message: you were triggered on schedule.',
		});

		await wrapper.find('[data-testid="schedule-save-button"]').trigger('click');
		await flushPromises();

		expect(activateScheduleIntegrationMock).toHaveBeenCalledWith({}, 'project-1', 'agent-1');
	});

	it('saves cron changes when Save is clicked', async () => {
		updateScheduleIntegrationMock.mockImplementation(async (_ctx, _projectId, _agentId, data) => ({
			active: false,
			cronExpression: data.cronExpression,
			wakeUpPrompt: data.wakeUpPrompt,
		}));
		const wrapper = await renderComponent();

		await wrapper.find('[data-testid="schedule-cron-input"]').setValue('*/10 * * * *');
		await flushPromises();
		expect(updateScheduleIntegrationMock).not.toHaveBeenCalled();

		await wrapper.find('[data-testid="schedule-save-button"]').trigger('click');
		await flushPromises();

		expect(updateScheduleIntegrationMock).toHaveBeenCalledWith({}, 'project-1', 'agent-1', {
			cronExpression: '*/10 * * * *',
			wakeUpPrompt: 'Automated message: you were triggered on schedule.',
		});
	});

	it('keeps cancel enabled when there are no changes', async () => {
		const wrapper = await renderComponent();

		expect(
			wrapper.find('[data-testid="schedule-cancel-button"]').attributes('disabled'),
		).toBeUndefined();
	});

	it('shows invalid cron errors below the cron input and clears them on cron edit', async () => {
		const wrapper = await renderComponent();
		updateScheduleIntegrationMock.mockRejectedValueOnce(new Error('Invalid cron expression'));

		await wrapper.find('[data-testid="schedule-cron-input"]').setValue('not-a-cron');
		await wrapper.find('[data-testid="schedule-save-button"]').trigger('click');
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

		await wrapper.find('[data-testid="schedule-active-toggle"]').trigger('click');

		expect(wrapper.find('[data-testid="schedule-save-button"]').attributes('disabled')).toBe('');
	});

	it('deactivates through the active toggle without removing the configured schedule', async () => {
		getScheduleIntegrationMock.mockResolvedValueOnce({
			active: true,
			cronExpression: '* * * * *',
			wakeUpPrompt: 'Automated message: you were triggered on schedule.',
		});
		updateScheduleIntegrationMock.mockResolvedValueOnce({
			active: false,
			cronExpression: '* * * * *',
			wakeUpPrompt: 'Automated message: you were triggered on schedule.',
		});
		const wrapper = await renderComponent();

		await wrapper.find('[data-testid="schedule-active-toggle"]').trigger('click');
		await wrapper.find('[data-testid="schedule-save-button"]').trigger('click');
		await flushPromises();

		expect(deactivateScheduleIntegrationMock).toHaveBeenCalledWith({}, 'project-1', 'agent-1');
		expect(wrapper.emitted('status-change')?.at(-1)).toEqual([true]);
	});

	it('disconnects a configured schedule trigger from the trigger list', async () => {
		getScheduleIntegrationMock.mockResolvedValueOnce({
			active: true,
			cronExpression: '* * * * *',
			wakeUpPrompt: 'Automated message: you were triggered on schedule.',
		});
		updateScheduleIntegrationMock.mockImplementationOnce(
			async (_ctx, _projectId, _agentId, data) => ({
				active: false,
				cronExpression: data.cronExpression,
				wakeUpPrompt: data.wakeUpPrompt,
			}),
		);
		const wrapper = await renderComponent();

		await wrapper.find('[data-testid="schedule-disconnect-button"]').trigger('click');
		await flushPromises();

		expect(deactivateScheduleIntegrationMock).toHaveBeenCalledWith({}, 'project-1', 'agent-1');
		expect(updateScheduleIntegrationMock).toHaveBeenCalledWith({}, 'project-1', 'agent-1', {
			cronExpression: '',
			wakeUpPrompt: 'Automated message: you were triggered on schedule.',
		});
		expect(wrapper.emitted('status-change')?.at(-1)).toEqual([false]);
		expect(wrapper.emitted('saved')).toBeTruthy();
	});

	it('does not persist unsaved wake-up prompt edits when disconnecting', async () => {
		getScheduleIntegrationMock.mockResolvedValueOnce({
			active: true,
			cronExpression: '* * * * *',
			wakeUpPrompt: 'Original prompt',
		});
		updateScheduleIntegrationMock.mockImplementationOnce(
			async (_ctx, _projectId, _agentId, data) => ({
				active: false,
				cronExpression: data.cronExpression,
				wakeUpPrompt: data.wakeUpPrompt,
			}),
		);
		const wrapper = await renderComponent();

		await wrapper
			.find('[data-testid="schedule-wake-up-prompt-input"]')
			.setValue('Dirty unsaved edit');
		await wrapper.find('[data-testid="schedule-disconnect-button"]').trigger('click');
		await flushPromises();

		expect(updateScheduleIntegrationMock).toHaveBeenCalledWith({}, 'project-1', 'agent-1', {
			cronExpression: '',
			wakeUpPrompt: 'Original prompt',
		});
		expect(
			(wrapper.find('[data-testid="schedule-wake-up-prompt-input"]').element as HTMLTextAreaElement)
				.value,
		).toBe('Original prompt');
	});
});
