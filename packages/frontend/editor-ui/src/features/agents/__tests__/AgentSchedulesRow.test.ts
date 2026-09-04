import type { AgentJsonTaskConfig, AgentTaskDto } from '@n8n/api-types';
import { flushPromises, mount } from '@vue/test-utils';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { AGENT_TASK_MODAL_KEY } from '../constants';
import AgentSchedulesRow from '../components/AgentSchedulesRow.vue';

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
}));

vi.mock('@n8n/i18n', () => ({
	useI18n: () => ({ baseText: (key: string) => key }),
}));

function makeTask(overrides: Partial<AgentTaskDto> = {}): AgentTaskDto {
	return {
		id: 'task-1',
		name: 'Daily summary',
		objective: 'Do X',
		cronExpression: '0 9 * * *',
		createdAt: '2026-01-01T00:00:00.000Z',
		updatedAt: '2026-01-01T00:00:00.000Z',
		...overrides,
	};
}

function taskRef(id = 'task-1', enabled = true): AgentJsonTaskConfig {
	return { type: 'task', id, enabled };
}

function mountRow(taskRefs: AgentJsonTaskConfig[] = [], extraProps: Record<string, unknown> = {}) {
	return mount(AgentSchedulesRow, {
		props: {
			taskRefs,
			projectId: 'project-id',
			agentId: 'agent-id',
			isPublished: false,
			...extraProps,
		},
		global: {
			stubs: {
				N8nButton: {
					props: ['disabled'],
					template:
						'<button v-bind="$attrs" :disabled="disabled" @click="$emit(\'click\')"><slot name="icon" /><slot /></button>',
				},
				N8nIcon: { template: '<span />' },
				N8nText: { template: '<span><slot /></span>' },
				N8nTooltip: { template: '<span><slot /></span>' },
			},
		},
	});
}

describe('AgentSchedulesRow', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		getAgentTasksSpy.mockResolvedValue([]);
	});

	it('renders fetched task bodies with their config state', async () => {
		getAgentTasksSpy.mockResolvedValue([makeTask()]);

		const wrapper = mountRow([taskRef('task-1', false)]);
		await flushPromises();

		expect(wrapper.text()).toContain('Daily summary');
		expect(wrapper.findAll('[data-testid="agent-capabilities-task-row"]')).toHaveLength(1);
	});

	it('renders a new fetched task before its config ref refreshes', async () => {
		getAgentTasksSpy
			.mockResolvedValueOnce([])
			.mockResolvedValueOnce([makeTask({ id: 'task-2', name: 'Weekly digest' })]);

		const wrapper = mountRow();
		await flushPromises();
		await wrapper.find('[data-testid="agent-capabilities-add-task"]').trigger('click');

		const modalData = openModalWithDataSpy.mock.calls[0][0].data;
		modalData.onSaved();
		await flushPromises();

		expect(wrapper.text()).toContain('Weekly digest');
		expect(wrapper.emitted('tasks-changed')).toEqual([[]]);
	});

	it('does not load tasks for an unsaved agent', async () => {
		mountRow([], { agentUnsaved: true });
		await flushPromises();

		expect(getAgentTasksSpy).not.toHaveBeenCalled();
	});

	it('reloads task bodies when the agent changes', async () => {
		getAgentTasksSpy.mockImplementation(
			async (_context: unknown, _projectId: string, agentId: string) =>
				agentId === 'agent-2' ? [makeTask({ id: 'task-2', name: 'Weekly digest' })] : [makeTask()],
		);

		const wrapper = mountRow([taskRef()]);
		await flushPromises();
		expect(wrapper.text()).toContain('Daily summary');

		await wrapper.setProps({ agentId: 'agent-2', taskRefs: [taskRef('task-2')] });
		await flushPromises();

		expect(getAgentTasksSpy).toHaveBeenLastCalledWith({}, 'project-id', 'agent-2');
		expect(wrapper.text()).toContain('Weekly digest');
		expect(wrapper.text()).not.toContain('Daily summary');
	});

	it('opens the task modal and forwards its callbacks', async () => {
		getAgentTasksSpy.mockResolvedValue([makeTask()]);
		const wrapper = mountRow([taskRef()]);
		await flushPromises();

		await wrapper.find('[data-testid="agent-capabilities-task-row"]').trigger('click');
		expect(openModalWithDataSpy).toHaveBeenCalledWith(
			expect.objectContaining({
				name: AGENT_TASK_MODAL_KEY,
				data: expect.objectContaining({
					task: expect.objectContaining({ id: 'task-1' }),
					taskState: { enabled: true },
				}),
			}),
		);

		const modalData = openModalWithDataSpy.mock.calls[0][0].data;
		modalData.onToggle({ id: 'task-1', enabled: false });
		expect(wrapper.emitted('toggle-task')).toEqual([[{ id: 'task-1', enabled: false }]]);
	});
});
