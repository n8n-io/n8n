import type { AgentConfigValidationIssue, AgentJsonTaskConfig, AgentTaskDto } from '@n8n/api-types';
import { enableAutoUnmount, flushPromises, mount } from '@vue/test-utils';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import AgentTriggersList from '../components/AgentTriggersList.vue';
import type { AgentTriggerChannelItem } from '../components/AgentTriggersList.types';

enableAutoUnmount(afterEach);

vi.mock('@n8n/stores/useRootStore', () => ({
	useRootStore: () => ({ restApiContext: {} }),
}));

const openModalWithDataSpy = vi.fn();
vi.mock('@/app/stores/ui.store', () => ({
	useUIStore: () => ({ openModalWithData: openModalWithDataSpy }),
}));

const getAgentTasksSpy = vi.fn();
vi.mock('../composables/useAgentApi', () => ({
	getAgentTasks: (...args: unknown[]) => getAgentTasksSpy(...args),
	deleteAgentTask: vi.fn(),
}));

vi.mock('@n8n/design-system', async (importOriginal) => {
	const original = await importOriginal<typeof import('@n8n/design-system')>();
	const { defineComponent } = await import('vue');
	return {
		...original,
		N8nSwitch2: defineComponent({
			name: 'N8nSwitch2',
			props: ['modelValue', 'disabled'],
			emits: ['update:modelValue'],
			template: '<input type="checkbox" />',
		}),
	};
});

vi.mock('@n8n/composables/useToast', () => ({
	useToast: () => ({ showError: vi.fn() }),
}));

vi.mock('@n8n/i18n', () => ({
	useI18n: () => ({
		baseText: (key: string, options?: { interpolate?: Record<string, string> }) =>
			options?.interpolate ? `${key}:${JSON.stringify(options.interpolate)}` : key,
	}),
}));

function makeTask(overrides: Partial<AgentTaskDto> = {}): AgentTaskDto {
	return {
		id: 'task-1',
		name: 'Daily summary',
		objective: 'Do X',
		cronExpression: '0 * * * *',
		createdAt: '2026-01-01T00:00:00.000Z',
		updatedAt: '2026-01-01T00:00:00.000Z',
		...overrides,
	};
}

function makeChannel(overrides: Partial<AgentTriggerChannelItem> = {}): AgentTriggerChannelItem {
	return {
		type: 'slack',
		label: 'Slack',
		icon: 'zap',
		invalidReasons: [],
		warningReasons: [],
		connected: true,
		...overrides,
	};
}

function mountList(props: Record<string, unknown> = {}) {
	return mount(AgentTriggersList, {
		props: { channels: [], projectId: 'project-id', agentId: 'agent-id', ...props },
		global: {
			stubs: {
				N8nIcon: { template: '<span />' },
				N8nText: { template: '<span><slot /></span>' },
				N8nTooltip: { template: '<span><slot /><slot name="content" /></span>' },
			},
		},
	});
}

describe('AgentTriggersList', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		getAgentTasksSpy.mockResolvedValue([]);
	});

	describe('channels', () => {
		it('uses the credential name as title and the channel as source', () => {
			const wrapper = mountList({ channels: [makeChannel({ credentialName: 'Team bot' })] });

			const text = wrapper.get('[data-testid="agent-triggers-channel"]').text();
			expect(text).toContain('Team bot');
			expect(text).toContain('agents.builder.triggers.channel.source:{"channel":"Slack"}');
		});

		it('uses the channel label as title when no credential is known', () => {
			const wrapper = mountList({ channels: [makeChannel()] });

			expect(wrapper.get('[data-testid="agent-triggers-channel"]').text()).toBe('Slack');
		});

		it('emits open-channel when a channel is clicked', async () => {
			const wrapper = mountList({ channels: [makeChannel({ connected: false })] });

			await wrapper.get('[data-testid="agent-triggers-channel"]').trigger('click');

			expect(wrapper.emitted('open-channel')).toEqual([[{ type: 'slack', connected: false }]]);
		});

		it('shows an alert only for a connected channel with reasons', () => {
			const wrapper = mountList({
				channels: [
					makeChannel({ type: 'a', invalidReasons: ['broken'] }),
					makeChannel({ type: 'b', connected: false, invalidReasons: ['broken'] }),
				],
			});

			expect(wrapper.findAll('[data-testid="agent-triggers-channel-alert"]')).toHaveLength(1);
		});
	});

	describe('schedules', () => {
		it('loads tasks and summarizes their schedule', async () => {
			getAgentTasksSpy.mockResolvedValue([makeTask()]);
			const wrapper = mountList();
			await flushPromises();

			expect(getAgentTasksSpy).toHaveBeenCalledWith({}, 'project-id', 'agent-id');
			expect(wrapper.get('[data-testid="agent-triggers-schedule"]').text()).toContain(
				'agents.builder.triggers.schedule.hourly',
			);
		});

		it('does not load tasks for an unsaved agent', async () => {
			const wrapper = mountList({ agentUnsaved: true });
			await flushPromises();

			expect(getAgentTasksSpy).not.toHaveBeenCalled();
			expect(wrapper.find('[data-testid="agent-triggers-schedule"]').exists()).toBe(false);
		});

		it('reads the enabled state from the task refs', async () => {
			getAgentTasksSpy.mockResolvedValue([makeTask()]);
			const taskRefs: AgentJsonTaskConfig[] = [{ type: 'task', id: 'task-1', enabled: false }];
			const wrapper = mountList({ taskRefs });
			await flushPromises();

			expect(wrapper.findComponent({ name: 'N8nSwitch2' }).props('modelValue')).toBe(false);
		});

		it('emits toggle-task when the switch changes', async () => {
			getAgentTasksSpy.mockResolvedValue([makeTask()]);
			const wrapper = mountList();
			await flushPromises();

			wrapper.findComponent({ name: 'N8nSwitch2' }).vm.$emit('update:modelValue', false);

			expect(wrapper.emitted('toggle-task')).toEqual([[{ id: 'task-1', enabled: false }]]);
		});

		it('does not emit toggle-task when disabled', async () => {
			getAgentTasksSpy.mockResolvedValue([makeTask()]);
			const wrapper = mountList({ disabled: true });
			await flushPromises();

			wrapper.findComponent({ name: 'N8nSwitch2' }).vm.$emit('update:modelValue', false);

			expect(wrapper.emitted('toggle-task')).toBeUndefined();
		});

		it('shows the validation reasons of a task', async () => {
			getAgentTasksSpy.mockResolvedValue([makeTask()]);
			const issue: AgentConfigValidationIssue = {
				code: 'missing_required',
				path: 'tasks.0',
				capability: { kind: 'task', id: 'task-1' },
			};
			const wrapper = mountList({ validationIssues: [issue] });
			await flushPromises();

			const row = wrapper.get('[data-testid="agent-triggers-schedule"]');
			expect(row.classes()).toContain('invalid');
			expect(row.text()).toContain('agents.builder.validation.issue.missingRequired');
		});

		it('shows the load error', async () => {
			getAgentTasksSpy.mockRejectedValue(new Error('Load failed'));
			const wrapper = mountList();
			await flushPromises();

			expect(wrapper.text()).toContain('Load failed');
		});

		it('ignores a load result after the agent changes', async () => {
			let resolveFirst: (tasks: AgentTaskDto[]) => void = () => {};
			getAgentTasksSpy.mockReturnValueOnce(
				new Promise<AgentTaskDto[]>((resolve) => {
					resolveFirst = resolve;
				}),
			);
			const wrapper = mountList();
			await wrapper.setProps({ agentId: 'other-agent' });
			await flushPromises();

			resolveFirst([makeTask({ id: 'stale' })]);
			await flushPromises();

			expect(wrapper.find('[data-testid="agent-triggers-schedule"]').exists()).toBe(false);
		});

		it('emits open-task for an existing task', async () => {
			getAgentTasksSpy.mockResolvedValue([makeTask()]);
			const wrapper = mountList();
			await flushPromises();

			await wrapper.get('[data-testid="agent-triggers-schedule"]').trigger('click');

			expect(wrapper.emitted('open-task')?.[0]?.[0]).toEqual(
				expect.objectContaining({ id: 'task-1', enabled: true }),
			);
			expect(openModalWithDataSpy).not.toHaveBeenCalled();
		});
	});

	describe('add trigger button', () => {
		it('uses the Add trigger label', () => {
			const wrapper = mountList();

			expect(wrapper.get('[data-testid="agent-triggers-add-trigger"]').text()).toContain(
				'agents.builder.triggers.add',
			);
		});

		it('emits add-channel on click', async () => {
			const wrapper = mountList();

			await wrapper.get('[data-testid="agent-triggers-add-trigger"]').trigger('click');

			expect(wrapper.emitted('add-channel')).toHaveLength(1);
			expect(openModalWithDataSpy).not.toHaveBeenCalled();
		});
	});
});
