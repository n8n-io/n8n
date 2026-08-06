import { configure, waitFor } from '@testing-library/vue';
import userEvent from '@testing-library/user-event';
import { createPinia, setActivePinia } from 'pinia';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { MODAL_CANCEL, MODAL_CONFIRM } from '@/app/constants';
import { createComponentRenderer } from '@/__tests__/render';

import AgentEvalCasesCard from '../components/AgentEvalCasesCard.vue';
import type { AgentEvalDataTableDataset } from '../agentEvals.types';

configure({ testIdAttribute: 'data-testid' });

const { fetchDataTableContent, insertRow, updateRow, deleteRows } = vi.hoisted(() => ({
	fetchDataTableContent: vi.fn(),
	insertRow: vi.fn(),
	updateRow: vi.fn(),
	deleteRows: vi.fn(),
}));

const { startRun, getRunSummary, listRuns } = vi.hoisted(() => ({
	startRun: vi.fn(),
	getRunSummary: vi.fn(),
	listRuns: vi.fn(),
}));

const { openAgentConfirmationModal } = vi.hoisted(() => ({
	openAgentConfirmationModal: vi.fn(),
}));

vi.mock('../agentEvals.api', () => ({
	getDatasets: vi.fn(),
	generateDraftCases: vi.fn(),
	startRun,
	getRunSummary,
	listRuns,
}));

vi.mock('@/features/core/dataTable/dataTable.store', () => ({
	useDataTableStore: vi.fn(() => ({
		fetchDataTableContent,
		insertRow,
		updateRow,
		deleteRows,
	})),
}));

vi.mock('../composables/useAgentConfirmationModal', () => ({
	useAgentConfirmationModal: () => ({ openAgentConfirmationModal }),
}));

vi.mock('@n8n/i18n', async (importOriginal) => ({
	...(await importOriginal()),
	useI18n: () => ({ baseText: (key: string) => `mocked-${key}` }),
}));

const dataset = (columnMapping: AgentEvalDataTableDataset['columnMapping']) =>
	({
		id: 'd1',
		name: 'Test cases',
		description: null,
		agentId: 'agent-1',
		columnMapping,
		createdById: null,
		createdAt: '2026-01-01T00:00:00.000Z',
		updatedAt: '2026-01-01T00:00:00.000Z',
		datasetSource: 'data_table',
		datasetRef: { dataTableId: 'dt-1' },
	}) as AgentEvalDataTableDataset;

const MAPPED = dataset({ input: 'input', criteria: 'criteria' });

const renderComponent = createComponentRenderer(AgentEvalCasesCard, {
	props: {
		projectId: 'project-1',
		agentId: 'agent-1',
		dataset: MAPPED,
		canRun: true,
	},
});

const twoCases = {
	count: 2,
	data: [
		{ id: 1, input: 'Plan a trip', criteria: 'Asks for dates' },
		{ id: 2, input: 'Find a hotel', criteria: 'Asks for a budget' },
	],
};

describe('AgentEvalCasesCard', () => {
	beforeEach(() => {
		setActivePinia(createPinia());
		vi.clearAllMocks();
		fetchDataTableContent.mockResolvedValue(twoCases);
		listRuns.mockResolvedValue({ count: 0, data: [] });
	});

	it('renders one row per case, numbered from one', async () => {
		const { getAllByTestId, getByText } = renderComponent();

		await waitFor(() => expect(getAllByTestId('agent-evals-case-row')).toHaveLength(2));
		expect(getByText('Plan a trip')).toBeInTheDocument();
		expect(getByText('Asks for a budget')).toBeInTheDocument();
		expect(getByText('1')).toBeInTheDocument();
		expect(getByText('2')).toBeInTheDocument();
	});

	it('counts the run from the server total, not the loaded page', async () => {
		fetchDataTableContent.mockResolvedValue({ count: 7, data: twoCases.data });
		const { getByTestId } = renderComponent();

		await waitFor(() => expect(getByTestId('agent-evals-run-all')).toBeEnabled());
		expect(getByTestId('agent-evals-run-all')).toHaveTextContent(
			'mocked-agents.builder.agentEvals.cases.runAll',
		);
	});

	it('cannot run a dataset with no cases', async () => {
		fetchDataTableContent.mockResolvedValue({ count: 0, data: [] });
		const { getByTestId } = renderComponent();

		await waitFor(() => expect(getByTestId('agent-evals-run-all')).toBeDisabled());
	});

	it('starts a run and reports progress', async () => {
		startRun.mockResolvedValue({ id: 'run-1', status: 'running' });
		getRunSummary.mockResolvedValue({
			runId: 'run-1',
			status: 'running',
			counts: { total: 2, success: 1, error: 0, cancelled: 0, pending: 1 },
		});
		const { getByTestId } = renderComponent();
		await waitFor(() => expect(getByTestId('agent-evals-run-all')).toBeEnabled());

		await userEvent.click(getByTestId('agent-evals-run-all'));

		expect(startRun).toHaveBeenCalledWith(expect.anything(), 'project-1', 'agent-1', 'd1');
		await waitFor(() =>
			expect(getByTestId('agent-evals-run-status')).toHaveTextContent(
				'mocked-agents.builder.agentEvals.run.progress',
			),
		);
	});

	it('swaps one row into the editor and leaves its siblings in read mode', async () => {
		const { getAllByTestId, getByTestId } = renderComponent();
		await waitFor(() => expect(getAllByTestId('agent-evals-case-row')).toHaveLength(2));

		await userEvent.click(getAllByTestId('agent-evals-case-edit')[0]);

		expect(getByTestId('agent-evals-case-editor')).toBeInTheDocument();
		expect(getAllByTestId('agent-evals-case-row')).toHaveLength(1);
	});

	it('keeps only one editor open at a time', async () => {
		const { getAllByTestId, getAllByTestId: all } = renderComponent();
		await waitFor(() => expect(getAllByTestId('agent-evals-case-row')).toHaveLength(2));

		await userEvent.click(getAllByTestId('agent-evals-case-edit')[0]);
		// The remaining row's pencil is now the only one left.
		await userEvent.click(getAllByTestId('agent-evals-case-edit')[0]);

		expect(all('agent-evals-case-editor')).toHaveLength(1);
	});

	it('saves an edit and returns the row to read mode', async () => {
		updateRow.mockResolvedValue(true);
		const { getAllByTestId, getByTestId, queryByTestId } = renderComponent();
		await waitFor(() => expect(getAllByTestId('agent-evals-case-row')).toHaveLength(2));
		await userEvent.click(getAllByTestId('agent-evals-case-edit')[0]);

		const input = getByTestId('agent-evals-case-input');
		await userEvent.clear(input);
		await userEvent.type(input, 'Edited request');
		await userEvent.click(getByTestId('agent-evals-case-save'));

		await waitFor(() => expect(queryByTestId('agent-evals-case-editor')).not.toBeInTheDocument());
		expect(updateRow).toHaveBeenCalledWith('dt-1', 'project-1', 1, {
			input: 'Edited request',
			criteria: 'Asks for dates',
		});
	});

	it('adds a case through an empty editor with no removal offered', async () => {
		insertRow.mockResolvedValue({ id: 3, input: 'New case', criteria: 'Stays on topic' });
		const { getByTestId, queryByTestId, getAllByTestId } = renderComponent();
		await waitFor(() => expect(getAllByTestId('agent-evals-case-row')).toHaveLength(2));

		await userEvent.click(getByTestId('agent-evals-add-case'));

		expect(getByTestId('agent-evals-case-input')).toHaveValue('');
		expect(queryByTestId('agent-evals-case-remove')).not.toBeInTheDocument();

		await userEvent.type(getByTestId('agent-evals-case-input'), 'New case');
		await userEvent.type(getByTestId('agent-evals-case-check'), 'Stays on topic');
		await userEvent.click(getByTestId('agent-evals-case-save'));

		await waitFor(() => expect(getAllByTestId('agent-evals-case-row')).toHaveLength(3));
		expect(insertRow).toHaveBeenCalledWith('dt-1', 'project-1', {
			input: 'New case',
			criteria: 'Stays on topic',
		});
	});

	it('removes a case from inside the editor', async () => {
		deleteRows.mockResolvedValue(true);
		const { getAllByTestId, getByTestId } = renderComponent();
		await waitFor(() => expect(getAllByTestId('agent-evals-case-row')).toHaveLength(2));
		await userEvent.click(getAllByTestId('agent-evals-case-edit')[0]);

		await userEvent.click(getByTestId('agent-evals-case-remove'));

		await waitFor(() => expect(getAllByTestId('agent-evals-case-row')).toHaveLength(1));
		expect(deleteRows).toHaveBeenCalledWith('dt-1', 'project-1', [1]);
	});

	describe('regenerate', () => {
		it('emits only once the user confirms', async () => {
			openAgentConfirmationModal.mockResolvedValue(MODAL_CONFIRM);
			const { getByTestId, emitted } = renderComponent();
			await waitFor(() => expect(getByTestId('agent-evals-regenerate')).toBeInTheDocument());

			await userEvent.click(getByTestId('agent-evals-regenerate'));

			await waitFor(() => expect(emitted('regenerate')).toHaveLength(1));
		});

		it('does nothing when the user backs out', async () => {
			openAgentConfirmationModal.mockResolvedValue(MODAL_CANCEL);
			const { getByTestId, emitted } = renderComponent();
			await waitFor(() => expect(getByTestId('agent-evals-regenerate')).toBeInTheDocument());

			await userEvent.click(getByTestId('agent-evals-regenerate'));

			await waitFor(() => expect(openAgentConfirmationModal).toHaveBeenCalled());
			expect(emitted('regenerate')).toBeUndefined();
		});
	});

	describe('permissions', () => {
		it('hides every write affordance without agent update', async () => {
			const { getAllByTestId, queryByTestId } = renderComponent({ props: { disabled: true } });
			await waitFor(() => expect(getAllByTestId('agent-evals-case-row')).toHaveLength(2));

			expect(queryByTestId('agent-evals-regenerate')).not.toBeInTheDocument();
			expect(queryByTestId('agent-evals-add-case')).not.toBeInTheDocument();
			expect(queryByTestId('agent-evals-case-edit')).not.toBeInTheDocument();
		});

		// A project viewer holds `agent:execute` without `agent:update`, and checking
		// an agent looks right is exactly what that role is for.
		it('still allows running when the agent cannot be edited', async () => {
			const { getByTestId } = renderComponent({ props: { disabled: true, canRun: true } });

			await waitFor(() => expect(getByTestId('agent-evals-run-all')).toBeEnabled());
		});

		it('blocks running without agent execute', async () => {
			const { getByTestId } = renderComponent({ props: { canRun: false } });

			await waitFor(() => expect(getByTestId('agent-evals-run-all')).toBeDisabled());
		});
	});

	describe('a dataset this view cannot write', () => {
		it('renders read-only with a notice and reads no rows', async () => {
			const { getByTestId, queryByTestId } = renderComponent({
				props: { dataset: dataset(null) },
			});

			await waitFor(() => expect(getByTestId('agent-evals-cases-unmapped')).toBeInTheDocument());
			expect(fetchDataTableContent).not.toHaveBeenCalled();
			expect(queryByTestId('agent-evals-add-case')).not.toBeInTheDocument();
			expect(queryByTestId('agent-evals-case-edit')).not.toBeInTheDocument();
		});
	});
});
