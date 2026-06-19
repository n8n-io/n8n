import { createTestingPinia } from '@pinia/testing';
import { AGENT_TASK_OBJECTIVE_MAX_LENGTH, type AgentTaskDto } from '@n8n/api-types';
import { configure, fireEvent, waitFor } from '@testing-library/vue';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { createComponentRenderer } from '@/__tests__/render';
import { mockedStore } from '@/__tests__/utils';
import { MODAL_CONFIRM } from '@/app/constants';
import { useUIStore } from '@/app/stores/ui.store';

import AgentTaskModal from '../components/AgentTaskModal.vue';

// Components use `data-testid`; the global setup configures `data-test-id`.
configure({ testIdAttribute: 'data-testid' });

vi.mock('@n8n/i18n', () => {
	const i18n = { baseText: (key: string) => key };
	return { useI18n: () => i18n, i18n, i18nInstance: { install: vi.fn() } };
});

vi.mock('@n8n/stores/useRootStore', () => ({
	useRootStore: () => ({ restApiContext: {}, timezone: 'UTC' }),
}));

const createAgentTaskSpy = vi.fn();
const updateAgentTaskSpy = vi.fn();
const deleteAgentTaskSpy = vi.fn();
const runAgentTaskSpy = vi.fn();
vi.mock('../composables/useAgentApi', () => ({
	createAgentTask: (...args: unknown[]) => createAgentTaskSpy(...args),
	deleteAgentTask: (...args: unknown[]) => deleteAgentTaskSpy(...args),
	runAgentTask: (...args: unknown[]) => runAgentTaskSpy(...args),
	updateAgentTask: (...args: unknown[]) => updateAgentTaskSpy(...args),
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

const MODAL_NAME = 'AgentTaskModal';

// Modal + Select/Option use filename-inferred names (no N8n prefix).
const stubs = {
	Modal: {
		props: ['name', 'width'],
		template:
			'<div role="dialog"><slot name="header" /><slot name="content" /><slot name="footer" /></div>',
	},
	N8nHeading: { template: '<h2><slot /></h2>' },
	N8nText: { template: '<span v-bind="$attrs"><slot /></span>' },
	N8nTooltip: { template: '<span><slot /></span>' },
	N8nIcon: { template: '<span />' },
	N8nButton: {
		props: ['disabled', 'loading'],
		template:
			'<button v-bind="$attrs" :disabled="disabled" @click="$emit(\'click\')"><slot name="icon" /><slot /></button>',
	},
	N8nSwitch2: {
		props: ['modelValue'],
		template: '<button v-bind="$attrs" @click="$emit(\'update:modelValue\', !modelValue)" />',
	},
	N8nInput: {
		props: ['modelValue'],
		template:
			'<input v-bind="$attrs" :value="modelValue" @input="$emit(\'update:modelValue\', $event.target.value)" />',
	},
	// N8nMarkdownEditor uses a filename-inferred name (no N8n prefix).
	MarkdownEditor: {
		props: ['modelValue'],
		template:
			'<textarea v-bind="$attrs" :value="modelValue" @input="$emit(\'update:modelValue\', $event.target.value)" />',
	},
	Select: { props: ['modelValue'], template: '<select v-bind="$attrs"><slot /></select>' },
	Option: { props: ['value', 'label'], template: '<option :value="value">{{ label }}</option>' },
};

function renderModal(dataOverrides: Record<string, unknown> = {}) {
	const onSaved = vi.fn();
	const renderComponent = createComponentRenderer(AgentTaskModal, { global: { stubs } });
	const result = renderComponent({
		props: {
			modalName: MODAL_NAME,
			data: { projectId: 'p1', agentId: 'a1', isPublished: true, onSaved, ...dataOverrides },
		},
	});
	return { ...result, onSaved };
}

function makeTask(overrides: Partial<AgentTaskDto> = {}): AgentTaskDto {
	return {
		id: 'task-9',
		name: 'Existing',
		objective: 'Obj',
		cronExpression: '0 9 * * *',
		createdAt: '2026-01-01T00:00:00.000Z',
		updatedAt: '2026-01-01T00:00:00.000Z',
		...overrides,
	};
}

describe('AgentTaskModal', () => {
	let uiStore: ReturnType<typeof mockedStore<typeof useUIStore>>;

	beforeEach(() => {
		vi.clearAllMocks();
		createTestingPinia({ stubActions: false });
		uiStore = mockedStore(useUIStore);
		uiStore.openModal(MODAL_NAME);
		uiStore.closeModal = vi.fn();
		confirmSpy.mockResolvedValue(MODAL_CONFIRM);
	});

	it('creates a published task with the form values', async () => {
		createAgentTaskSpy.mockResolvedValue({});
		const { getByTestId, onSaved } = renderModal();

		await fireEvent.update(getByTestId('agent-task-name-input'), 'My Task');
		await fireEvent.update(getByTestId('agent-task-objective-input'), 'Do the thing');
		await fireEvent.click(getByTestId('agent-task-save'));

		await waitFor(() => expect(createAgentTaskSpy).toHaveBeenCalled());
		expect(createAgentTaskSpy).toHaveBeenCalledWith(
			{},
			'p1',
			'a1',
			expect.objectContaining({
				name: 'My Task',
				objective: 'Do the thing',
				cronExpression: '0 9 * * *',
				enabled: true,
			}),
		);
		expect(onSaved).toHaveBeenCalled();
		expect(uiStore.closeModal).toHaveBeenCalledWith(MODAL_NAME);
	});

	it('creates the task ref enabled even when the agent is not published', async () => {
		createAgentTaskSpy.mockResolvedValue({});
		const { getByTestId } = renderModal({ isPublished: false });

		await fireEvent.update(getByTestId('agent-task-name-input'), 'My Task');
		await fireEvent.update(getByTestId('agent-task-objective-input'), 'Do the thing');
		await fireEvent.click(getByTestId('agent-task-save'));

		await waitFor(() => expect(createAgentTaskSpy).toHaveBeenCalled());
		expect(createAgentTaskSpy).toHaveBeenCalledWith(
			{},
			'p1',
			'a1',
			expect.objectContaining({ enabled: true }),
		);
	});

	it('does not save when required fields are empty', async () => {
		const { getByTestId } = renderModal();

		await fireEvent.click(getByTestId('agent-task-save'));

		expect(createAgentTaskSpy).not.toHaveBeenCalled();
	});

	it('does not save when objective exceeds the maximum length', async () => {
		const { getByTestId, getByText } = renderModal();

		await fireEvent.update(getByTestId('agent-task-name-input'), 'My Task');
		await fireEvent.update(
			getByTestId('agent-task-objective-input'),
			'x'.repeat(AGENT_TASK_OBJECTIVE_MAX_LENGTH + 1),
		);
		await fireEvent.click(getByTestId('agent-task-save'));

		expect(createAgentTaskSpy).not.toHaveBeenCalled();
		expect(getByText('agents.builder.tasks.validation.objectiveMaxLength')).toBeInTheDocument();
	});

	it('updates an existing task without changing enabled', async () => {
		updateAgentTaskSpy.mockResolvedValue({});
		const { getByTestId } = renderModal({ task: makeTask() });

		await fireEvent.update(getByTestId('agent-task-name-input'), 'Renamed');
		await fireEvent.click(getByTestId('agent-task-save'));

		await waitFor(() => expect(updateAgentTaskSpy).toHaveBeenCalled());
		expect(updateAgentTaskSpy).toHaveBeenCalledWith(
			{},
			'p1',
			'a1',
			'task-9',
			expect.objectContaining({ name: 'Renamed' }),
		);
	});

	it('toggles an existing task through the modal callback', async () => {
		const onToggle = vi.fn();
		const { getByTestId } = renderModal({
			task: makeTask(),
			taskState: { enabled: true },
			onToggle,
		});

		await fireEvent.click(getByTestId('agent-task-toggle'));

		expect(onToggle).toHaveBeenCalledWith({ id: 'task-9', enabled: false });
	});

	it('runs an existing task and shows a success toast', async () => {
		runAgentTaskSpy.mockResolvedValue({ success: true });
		const { getByTestId } = renderModal({
			task: makeTask(),
			taskState: { enabled: true },
		});

		await fireEvent.click(getByTestId('agent-task-run'));

		await waitFor(() => expect(runAgentTaskSpy).toHaveBeenCalledWith({}, 'p1', 'a1', 'task-9'));
		expect(showMessageSpy).toHaveBeenCalled();
	});

	it('deletes an existing task after confirmation', async () => {
		deleteAgentTaskSpy.mockResolvedValue({ success: true });
		const { getByTestId, onSaved } = renderModal({
			task: makeTask(),
			taskState: { enabled: true },
		});

		await fireEvent.click(getByTestId('agent-task-delete'));

		await waitFor(() => expect(deleteAgentTaskSpy).toHaveBeenCalledWith({}, 'p1', 'a1', 'task-9'));
		expect(onSaved).toHaveBeenCalled();
		expect(uiStore.closeModal).toHaveBeenCalledWith(MODAL_NAME);
	});

	it('keeps task actions in the header for existing tasks only', async () => {
		const { getByTestId, rerender, queryByTestId } = renderModal({
			task: makeTask(),
			taskState: { enabled: true },
		});

		expect(getByTestId('agent-task-toggle')).toBeTruthy();
		expect(getByTestId('agent-task-run')).toBeTruthy();

		await rerender({
			modalName: MODAL_NAME,
			data: { projectId: 'p1', agentId: 'a1', isPublished: true, onSaved: vi.fn() },
		});

		expect(queryByTestId('agent-task-toggle')).toBeNull();
		expect(queryByTestId('agent-task-run')).toBeNull();
	});
});
