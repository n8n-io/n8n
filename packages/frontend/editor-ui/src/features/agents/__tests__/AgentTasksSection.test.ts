import { createTestingPinia } from '@pinia/testing';
import type { AgentJsonTaskConfig, AgentTaskDto } from '@n8n/api-types';
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
const deleteAgentTaskSpy = vi.fn();
const runAgentTaskSpy = vi.fn();
vi.mock('../composables/useAgentApi', () => ({
	getAgentTasks: (...args: unknown[]) => getAgentTasksSpy(...args),
	deleteAgentTask: (...args: unknown[]) => deleteAgentTaskSpy(...args),
	runAgentTask: (...args: unknown[]) => runAgentTaskSpy(...args),
}));

const showMessageSpy = vi.fn();
const showErrorSpy = vi.fn();
vi.mock('@/app/composables/useToast', () => ({
	useToast: () => ({ showMessage: showMessageSpy, showError: showErrorSpy }),
}));

const confirmSpy = vi.fn();
vi.mock('../composables/useAgentConfirmationModal', () => ({
	useAgentConfirmationModal: () => ({ openAgentConfirmationModal: confirmSpy }),
}));

/** Body DTO (no enabled / nextRunAt — those come from the config ref). */
function makeBody(overrides: Partial<AgentTaskDto> = {}): AgentTaskDto {
	return {
		id: 'task-1',
		name: 'Daily summary',
		objective: 'Do X',
		cronExpression: '0 9 * * *',
		lastRunAt: null,
		lastRunStatus: null,
		createdAt: '2026-01-01T00:00:00.000Z',
		updatedAt: '2026-01-01T00:00:00.000Z',
		...overrides,
	};
}

function taskRef(id = 'task-1', enabled = true): AgentJsonTaskConfig {
	return { type: 'task', id, enabled };
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
		props: { projectId: 'p1', agentId: 'a1', taskRefs: [], ...props },
	});
}

describe('AgentTasksSection', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		createTestingPinia({ stubActions: false });
		getAgentTasksSpy.mockResolvedValue([]);
	});

	it('renders tasks by joining config refs with fetched bodies', async () => {
		getAgentTasksSpy.mockResolvedValue([makeBody()]);
		const { findByText } = renderSection({ taskRefs: [taskRef()] });
		expect(await findByText('Daily summary')).toBeTruthy();
	});

	it('shows the empty state when there are no task refs', async () => {
		const { findByTestId } = renderSection({ taskRefs: [] });
		expect(await findByTestId('agent-tasks-empty')).toBeTruthy();
	});

	it('toggling a task emits toggle with the new enabled value', async () => {
		getAgentTasksSpy.mockResolvedValue([makeBody()]);
		const { findByTestId, emitted } = renderSection({
			taskRefs: [taskRef('task-1', true)],
			isPublished: true,
		});

		await fireEvent.click(await findByTestId('agent-task-toggle'));

		await waitFor(() => expect(emitted().toggle).toBeTruthy());
		expect(emitted().toggle[0]).toEqual([{ id: 'task-1', enabled: false }]);
	});

	it('running a task calls runAgentTask and shows a success toast', async () => {
		getAgentTasksSpy.mockResolvedValue([makeBody()]);
		runAgentTaskSpy.mockResolvedValue({ success: true });
		const { findByTestId } = renderSection({ taskRefs: [taskRef()] });

		await fireEvent.click(await findByTestId('agent-task-run'));

		await waitFor(() => expect(runAgentTaskSpy).toHaveBeenCalledWith({}, 'p1', 'a1', 'task-1'));
		expect(showMessageSpy).toHaveBeenCalled();
	});

	it('deleting a confirmed task calls deleteAgentTask and emits changed', async () => {
		getAgentTasksSpy.mockResolvedValue([makeBody()]);
		confirmSpy.mockResolvedValue(MODAL_CONFIRM);
		deleteAgentTaskSpy.mockResolvedValue({ success: true });
		const { findByTestId, emitted } = renderSection({ taskRefs: [taskRef()] });

		await fireEvent.click(await findByTestId('agent-task-delete'));

		await waitFor(() => expect(deleteAgentTaskSpy).toHaveBeenCalledWith({}, 'p1', 'a1', 'task-1'));
		await waitFor(() => expect(emitted().changed).toBeTruthy());
	});

	it('does not delete when the confirmation is cancelled', async () => {
		getAgentTasksSpy.mockResolvedValue([makeBody()]);
		confirmSpy.mockResolvedValue('cancel');
		const { findByTestId } = renderSection({ taskRefs: [taskRef()] });

		await fireEvent.click(await findByTestId('agent-task-delete'));

		await waitFor(() => expect(confirmSpy).toHaveBeenCalled());
		expect(deleteAgentTaskSpy).not.toHaveBeenCalled();
	});

	it('opening "Add task" opens the task modal via the modal registry', async () => {
		const { findByTestId } = renderSection({ taskRefs: [], isPublished: true });
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

	it('clicking a task row opens the edit modal with that task', async () => {
		getAgentTasksSpy.mockResolvedValue([makeBody()]);
		const { findByTestId } = renderSection({ taskRefs: [taskRef()], isPublished: true });

		await fireEvent.click(await findByTestId('agent-task-row'));

		expect(openModalWithDataSpy).toHaveBeenCalledWith(
			expect.objectContaining({
				name: AGENT_TASK_MODAL_KEY,
				data: expect.objectContaining({ task: expect.objectContaining({ id: 'task-1' }) }),
			}),
		);
	});
});
