import type { AgentJsonTaskConfig, AgentTaskDto } from '@n8n/api-types';
import { enableAutoUnmount, flushPromises, mount } from '@vue/test-utils';
import { screen } from '@testing-library/vue';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { AGENT_TASK_MODAL_KEY } from '../constants';
import AgentSchedulesRow from '../components/AgentSchedulesRow.vue';

enableAutoUnmount(afterEach);

vi.mock('@n8n/stores/useRootStore', () => ({
	useRootStore: () => ({ restApiContext: {} }),
}));

const openModalWithDataSpy = vi.fn();
vi.mock('@/app/stores/ui.store', () => ({
	useUIStore: () => ({ openModalWithData: openModalWithDataSpy }),
}));

const getAgentTasksSpy = vi.fn();
const deleteAgentTaskSpy = vi.fn();
vi.mock('../composables/useAgentApi', () => ({
	getAgentTasks: (...args: unknown[]) => getAgentTasksSpy(...args),
	deleteAgentTask: (...args: unknown[]) => deleteAgentTaskSpy(...args),
}));

const showErrorSpy = vi.fn();
vi.mock('@n8n/composables/useToast', () => ({
	useToast: () => ({ showError: showErrorSpy }),
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
		attachTo: document.body,
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
		expect(wrapper.text()).not.toContain('agents.builder.capabilities.deactivated');
		expect(
			wrapper.get('[data-testid="agent-capabilities-task-row"]').attributes('aria-description'),
		).toBe('agents.builder.capabilities.deactivated');
		expect(wrapper.findAll('[data-testid="agent-capabilities-task-row"]')).toHaveLength(1);
	});

	it.each([true, false])('toggles a schedule with enabled=%s from its menu', async (enabled) => {
		getAgentTasksSpy.mockResolvedValue([makeTask()]);
		const wrapper = mountRow([taskRef('task-1', enabled)]);
		await flushPromises();

		await wrapper.get('[data-testid="agent-capabilities-task-row"]').trigger('contextmenu');
		await userEvent.click(
			await screen.findByRole('menuitem', {
				name: `agents.builder.contextMenu.${enabled ? 'deactivate' : 'activate'}`,
			}),
		);

		expect(wrapper.emitted('toggle-task')).toEqual([[{ id: 'task-1', enabled: !enabled }]]);
		expect(openModalWithDataSpy).not.toHaveBeenCalled();
	});

	it('removes a schedule after the request succeeds and blocks another request while pending', async () => {
		getAgentTasksSpy.mockResolvedValueOnce([makeTask()]);
		const pending = Promise.withResolvers<void>();
		deleteAgentTaskSpy.mockReturnValueOnce(pending.promise);
		const wrapper = mountRow([taskRef()]);
		await flushPromises();

		const chip = wrapper.get('[data-testid="agent-capabilities-task-row"]');
		await chip.trigger('contextmenu');
		await userEvent.click(
			await screen.findByRole('menuitem', { name: 'agents.builder.contextMenu.remove' }),
		);
		expect(deleteAgentTaskSpy).toHaveBeenCalledExactlyOnceWith(
			{},
			'project-id',
			'agent-id',
			'task-1',
		);
		expect(wrapper.text()).toContain('Daily summary');
		expect(chip.attributes('disabled')).toBeDefined();
		await chip.trigger('contextmenu');
		expect(screen.queryByRole('menuitem')).not.toBeInTheDocument();

		pending.resolve();
		await flushPromises();
		expect(wrapper.find('[data-testid="agent-capabilities-task-row"]').exists()).toBe(false);
		expect(wrapper.emitted('tasks-changed')).toEqual([[]]);
		expect(openModalWithDataSpy).not.toHaveBeenCalled();
	});

	it('keeps the schedule and reports a failed removal', async () => {
		getAgentTasksSpy.mockResolvedValue([makeTask()]);
		const error = new Error('Request failed');
		deleteAgentTaskSpy.mockRejectedValueOnce(error);
		const wrapper = mountRow([taskRef()]);
		await flushPromises();

		await wrapper.get('[data-testid="agent-capabilities-task-row"]').trigger('contextmenu');
		await userEvent.click(
			await screen.findByRole('menuitem', { name: 'agents.builder.contextMenu.remove' }),
		);
		await flushPromises();

		expect(wrapper.text()).toContain('Daily summary');
		expect(
			wrapper.get('[data-testid="agent-capabilities-task-row"]').attributes('disabled'),
		).toBeUndefined();
		expect(showErrorSpy).toHaveBeenCalledWith(error, 'agents.builder.tasks.removeError');
		expect(wrapper.emitted('tasks-changed')).toBeUndefined();
	});

	it('does not refresh a different agent after a pending removal completes', async () => {
		getAgentTasksSpy.mockResolvedValueOnce([makeTask()]);
		const pending = Promise.withResolvers<void>();
		deleteAgentTaskSpy.mockReturnValueOnce(pending.promise);
		const wrapper = mountRow([taskRef()]);
		await flushPromises();
		await wrapper.get('[data-testid="agent-capabilities-task-row"]').trigger('contextmenu');
		await userEvent.click(
			await screen.findByRole('menuitem', { name: 'agents.builder.contextMenu.remove' }),
		);

		getAgentTasksSpy.mockResolvedValue([makeTask({ id: 'task-2', name: 'Weekly digest' })]);
		await wrapper.setProps({ agentId: 'agent-2', taskRefs: [taskRef('task-2')] });
		await flushPromises();
		pending.resolve();
		await flushPromises();

		expect(wrapper.text()).toContain('Weekly digest');
		expect(wrapper.emitted('tasks-changed')).toBeUndefined();
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

	it('loads tasks after same-ID persistence', async function loadPersistedTasks() {
		getAgentTasksSpy.mockResolvedValue([makeTask()]);
		const wrapper = mountRow([], { agentUnsaved: true });
		await flushPromises();

		expect(getAgentTasksSpy).not.toHaveBeenCalled();

		await wrapper.setProps({ agentUnsaved: false });
		await flushPromises();

		expect(getAgentTasksSpy).toHaveBeenCalledExactlyOnceWith({}, 'project-id', 'agent-id');
		expect(wrapper.text()).toContain('Daily summary');
	});

	it('forwards persistence to the new task modal', async function forwardPersistenceToModal() {
		const ensureAgentPersisted = vi.fn().mockResolvedValue(undefined);
		const wrapper = mountRow([], { agentUnsaved: true, ensureAgentPersisted });
		await flushPromises();

		await wrapper.find('[data-testid="agent-capabilities-add-task"]').trigger('click');

		expect(openModalWithDataSpy).toHaveBeenCalledWith({
			name: AGENT_TASK_MODAL_KEY,
			data: expect.objectContaining({
				projectId: 'project-id',
				agentId: 'agent-id',
				task: null,
				ensureAgentPersisted,
			}),
		});
		expect(ensureAgentPersisted).not.toHaveBeenCalled();
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
		const validationIssues = [
			{
				code: 'missing_required',
				message: 'Missing model',
				capability: { kind: 'llm' },
				path: ['llm'],
			},
		];
		const wrapper = mountRow([taskRef()], { isRunnable: true, validationIssues });
		await flushPromises();

		await wrapper.find('[data-testid="agent-capabilities-task-row"]').trigger('click');
		expect(openModalWithDataSpy).toHaveBeenCalledWith(
			expect.objectContaining({
				name: AGENT_TASK_MODAL_KEY,
				data: expect.objectContaining({
					task: expect.objectContaining({ id: 'task-1' }),
					taskState: { enabled: true },
					isRunnable: true,
					validationIssues,
				}),
			}),
		);

		const modalData = openModalWithDataSpy.mock.calls[0][0].data;
		modalData.onPreview('Test these instructions');
		expect(wrapper.emitted('preview-task')).toEqual([['Test these instructions']]);
	});
});
