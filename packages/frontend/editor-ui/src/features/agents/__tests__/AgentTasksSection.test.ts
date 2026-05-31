import { createTestingPinia } from '@pinia/testing';
import type { AgentTaskDto } from '@n8n/api-types';
import { configure, fireEvent, waitFor } from '@testing-library/vue';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { createComponentRenderer } from '@/__tests__/render';
import { MODAL_CONFIRM } from '@/app/constants';

import AgentTasksSection from '../components/AgentTasksSection.vue';
import { AGENT_TASK_MODAL_KEY } from '../constants';

// Components use `data-testid`; the global setup configures `data-test-id`.
configure({ testIdAttribute: 'data-testid' });

vi.mock('@n8n/i18n', () => {
	const i18n = { baseText: (key: string) => key };
	return { useI18n: () => i18n, i18n, i18nInstance: { install: vi.fn() } };
});

vi.mock('@n8n/stores/useRootStore', () => ({
	useRootStore: () => ({ restApiContext: {}, timezone: 'UTC' }),
}));

const openModalWithDataSpy = vi.fn();
vi.mock('@/app/stores/ui.store', () => ({
	useUIStore: () => ({ openModalWithData: openModalWithDataSpy }),
}));

const getAgentTasksSpy = vi.fn();
const updateAgentTaskSpy = vi.fn();
const deleteAgentTaskSpy = vi.fn();
vi.mock('../composables/useAgentApi', () => ({
	getAgentTasks: (...args: unknown[]) => getAgentTasksSpy(...args),
	updateAgentTask: (...args: unknown[]) => updateAgentTaskSpy(...args),
	deleteAgentTask: (...args: unknown[]) => deleteAgentTaskSpy(...args),
	createAgentTask: vi.fn(),
}));

const confirmSpy = vi.fn();
vi.mock('../composables/useAgentConfirmationModal', () => ({
	useAgentConfirmationModal: () => ({ openAgentConfirmationModal: confirmSpy }),
}));

function makeTask(overrides: Partial<AgentTaskDto> = {}): AgentTaskDto {
	return {
		id: 'task-1',
		name: 'Daily summary',
		objective: 'Do X',
		cronExpression: '0 9 * * *',
		enabled: true,
		nextRunAt: '2026-06-01T09:00:00.000Z',
		lastRunAt: null,
		lastRunStatus: null,
		createdAt: '2026-01-01T00:00:00.000Z',
		updatedAt: '2026-01-01T00:00:00.000Z',
		...overrides,
	};
}

const stubs = {
	N8nButton: {
		template:
			'<button v-bind="$attrs" @click="$emit(\'click\')"><slot name="icon" /><slot /></button>',
	},
	N8nIcon: { template: '<i />' },
	N8nText: { template: '<span><slot /></span>' },
	N8nTooltip: { template: '<div><slot /></div>' },
	N8nSwitch2: {
		props: ['modelValue'],
		template: '<button v-bind="$attrs" @click="$emit(\'update:modelValue\', !modelValue)" />',
	},
};

function renderSection(props: Record<string, unknown> = {}) {
	const renderComponent = createComponentRenderer(AgentTasksSection, { global: { stubs } });
	return renderComponent({
		props: { projectId: 'p1', agentId: 'a1', ...props },
	});
}

describe('AgentTasksSection', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		createTestingPinia({ stubActions: false });
		getAgentTasksSpy.mockResolvedValue([]);
	});

	it('renders tasks from the API', async () => {
		getAgentTasksSpy.mockResolvedValue([makeTask()]);
		const { findByText } = renderSection();
		expect(await findByText('Daily summary')).toBeTruthy();
	});

	it('shows the empty state when there are no tasks', async () => {
		const { findByTestId } = renderSection();
		expect(await findByTestId('agent-tasks-empty')).toBeTruthy();
	});

	it('toggling a task calls updateAgentTask with the new enabled value', async () => {
		getAgentTasksSpy.mockResolvedValue([makeTask({ enabled: true })]);
		updateAgentTaskSpy.mockResolvedValue(makeTask({ enabled: false }));
		const { findByTestId } = renderSection({ isPublished: true });

		await fireEvent.click(await findByTestId('agent-task-toggle'));

		await waitFor(() =>
			expect(updateAgentTaskSpy).toHaveBeenCalledWith({}, 'p1', 'a1', 'task-1', { enabled: false }),
		);
	});

	it('disables the toggle when the agent is not published', async () => {
		getAgentTasksSpy.mockResolvedValue([makeTask({ enabled: false })]);
		const { findByTestId } = renderSection({ isPublished: false });

		const toggle = await findByTestId('agent-task-toggle');
		expect(toggle.hasAttribute('disabled')).toBe(true);
	});

	it('deleting a confirmed task calls deleteAgentTask', async () => {
		getAgentTasksSpy.mockResolvedValue([makeTask()]);
		confirmSpy.mockResolvedValue(MODAL_CONFIRM);
		deleteAgentTaskSpy.mockResolvedValue({ success: true });
		const { findByTestId } = renderSection();

		await fireEvent.click(await findByTestId('agent-task-delete'));

		await waitFor(() => expect(deleteAgentTaskSpy).toHaveBeenCalledWith({}, 'p1', 'a1', 'task-1'));
	});

	it('does not delete when the confirmation is cancelled', async () => {
		getAgentTasksSpy.mockResolvedValue([makeTask()]);
		confirmSpy.mockResolvedValue('cancel');
		const { findByTestId } = renderSection();

		await fireEvent.click(await findByTestId('agent-task-delete'));

		await waitFor(() => expect(confirmSpy).toHaveBeenCalled());
		expect(deleteAgentTaskSpy).not.toHaveBeenCalled();
	});

	it('opening "Add task" opens the task modal via the modal registry', async () => {
		const { findByTestId } = renderSection({ isPublished: true });
		await findByTestId('agent-tasks-empty');

		await fireEvent.click(await findByTestId('agent-tasks-add'));

		expect(openModalWithDataSpy).toHaveBeenCalledWith(
			expect.objectContaining({
				name: AGENT_TASK_MODAL_KEY,
				data: expect.objectContaining({
					projectId: 'p1',
					agentId: 'a1',
					task: null,
					isPublished: true,
				}),
			}),
		);
	});

	it('opening edit passes the task to the modal', async () => {
		getAgentTasksSpy.mockResolvedValue([makeTask()]);
		const { findByTestId } = renderSection({ isPublished: true });

		await fireEvent.click(await findByTestId('agent-task-edit'));

		expect(openModalWithDataSpy).toHaveBeenCalledWith(
			expect.objectContaining({
				name: AGENT_TASK_MODAL_KEY,
				data: expect.objectContaining({ task: expect.objectContaining({ id: 'task-1' }) }),
			}),
		);
	});
});
