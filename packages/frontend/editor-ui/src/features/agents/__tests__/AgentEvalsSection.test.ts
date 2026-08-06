import { describe, it, expect, vi, beforeEach } from 'vitest';
import { configure, waitFor } from '@testing-library/vue';
import userEvent from '@testing-library/user-event';
import { createPinia, setActivePinia } from 'pinia';

import { createComponentRenderer } from '@/__tests__/render';
import AgentEvalsSection from '../components/AgentEvalsSection.vue';
import type { AgentEvalDatasetRecord } from '../agentEvals.types';

// Components use `data-testid`; the global setup configures `data-test-id`.
configure({ testIdAttribute: 'data-testid' });

const { getDatasets, listRuns } = vi.hoisted(() => ({
	getDatasets: vi.fn(),
	listRuns: vi.fn(),
}));

const { fetchDataTableContent } = vi.hoisted(() => ({
	fetchDataTableContent: vi.fn(),
}));

vi.mock('../agentEvals.api', () => ({
	getDatasets,
	generateDraftCases: vi.fn(),
	startRun: vi.fn(),
	getRunSummary: vi.fn(),
	listRuns,
}));

vi.mock('@/features/core/dataTable/dataTable.store', () => ({
	useDataTableStore: vi.fn(() => ({
		fetchDataTableContent,
		insertRow: vi.fn(),
		updateRow: vi.fn(),
		deleteRows: vi.fn(),
	})),
}));

// Regenerating is confirmed before it emits; the modal itself is the card's concern.
vi.mock('../composables/useAgentConfirmationModal', async () => {
	const { MODAL_CONFIRM } = await import('@/app/constants');
	return {
		useAgentConfirmationModal: () => ({
			openAgentConfirmationModal: vi.fn().mockResolvedValue(MODAL_CONFIRM),
		}),
	};
});

vi.mock('@n8n/i18n', async (importOriginal) => ({
	...(await importOriginal()),
	useI18n: () => ({ baseText: (key: string) => `mocked-${key}` }),
}));

const PROJECT_ID = 'project-1';
const AGENT_ID = 'agent-1';

const dataTableDataset = {
	id: 'd1',
	name: 'Test cases',
	description: null,
	agentId: AGENT_ID,
	columnMapping: { input: 'input', criteria: 'criteria' },
	createdById: null,
	createdAt: '2026-01-01T00:00:00.000Z',
	updatedAt: '2026-01-01T00:00:00.000Z',
	datasetSource: 'data_table',
	datasetRef: { dataTableId: 'dt-1' },
} as AgentEvalDatasetRecord;

const googleSheetsDataset = {
	...dataTableDataset,
	id: 'd2',
	datasetSource: 'google_sheets',
	datasetRef: { credentialId: 'c1', spreadsheetId: 's1', sheetName: 'Cases' },
} as AgentEvalDatasetRecord;

const renderComponent = createComponentRenderer(AgentEvalsSection, {
	props: { projectId: PROJECT_ID, agentId: AGENT_ID },
});

describe('AgentEvalsSection', () => {
	beforeEach(() => {
		setActivePinia(createPinia());
		vi.clearAllMocks();
		getDatasets.mockResolvedValue([]);
		listRuns.mockResolvedValue({ count: 0, data: [] });
		fetchDataTableContent.mockResolvedValue({ count: 0, data: [] });
	});

	it('renders the first-run state with its title, description and CTA', async () => {
		const { getByTestId, getByText } = renderComponent();

		await waitFor(() => expect(getByTestId('agent-evals-empty-state')).toBeInTheDocument());
		expect(getByTestId('agent-evals-section')).toBeInTheDocument();
		// Asserting on the mocked key prefix verifies the keys we intended rather
		// than arbitrary copy.
		expect(getByText('mocked-agents.builder.agentEvals.empty.title')).toBeInTheDocument();
		expect(getByText('mocked-agents.builder.agentEvals.empty.description')).toBeInTheDocument();
	});

	it('emits generate when the CTA is clicked', async () => {
		const { getByTestId, emitted } = renderComponent();
		await waitFor(() => expect(getByTestId('agent-evals-generate-button')).toBeInTheDocument());

		await userEvent.click(getByTestId('agent-evals-generate-button'));

		expect(emitted('generate')).toBeTruthy();
	});

	it('disables the CTA for users who cannot edit the agent', async () => {
		const { getByTestId } = renderComponent({ props: { disabled: true } });

		await waitFor(() => expect(getByTestId('agent-evals-generate-button')).toBeDisabled());
	});

	it('shows a skeleton until the dataset read settles', () => {
		const { getByTestId, queryByTestId } = renderComponent();

		expect(getByTestId('agent-evals-loading')).toBeInTheDocument();
		expect(queryByTestId('agent-evals-empty-state')).not.toBeInTheDocument();
	});

	it('renders the cases card, not the first-run state, once a dataset exists', async () => {
		getDatasets.mockResolvedValue([dataTableDataset]);
		const { getByTestId, queryByTestId } = renderComponent();

		await waitFor(() => expect(getByTestId('agent-evals-cases-card')).toBeInTheDocument());
		expect(queryByTestId('agent-evals-empty-state')).not.toBeInTheDocument();
	});

	it('falls back to the first-run state when the dataset read fails', async () => {
		getDatasets.mockRejectedValue(new Error('forbidden'));
		const { getByTestId } = renderComponent();

		// Notably not stuck on the skeleton: a failed read has to settle too.
		await waitFor(() => expect(getByTestId('agent-evals-empty-state')).toBeInTheDocument());
	});

	// The rows of a connected source aren't readable here, so claiming there are no
	// test cases would be untrue.
	it('explains an external source instead of claiming there are no cases', async () => {
		getDatasets.mockResolvedValue([googleSheetsDataset]);
		const { getByTestId, queryByTestId } = renderComponent();

		await waitFor(() => expect(getByTestId('agent-evals-external-source')).toBeInTheDocument());
		expect(queryByTestId('agent-evals-empty-state')).not.toBeInTheDocument();
		expect(queryByTestId('agent-evals-cases-card')).not.toBeInTheDocument();
	});

	it('prefers a data table dataset over a connected source', async () => {
		getDatasets.mockResolvedValue([googleSheetsDataset, dataTableDataset]);
		const { getByTestId } = renderComponent();

		await waitFor(() => expect(getByTestId('agent-evals-cases-card')).toBeInTheDocument());
	});

	it('does not re-read datasets that are already cached', async () => {
		getDatasets.mockResolvedValue([dataTableDataset]);
		const { getByTestId } = renderComponent();
		await waitFor(() => expect(getByTestId('agent-evals-cases-card')).toBeInTheDocument());

		renderComponent();

		await waitFor(() => expect(getDatasets).toHaveBeenCalledTimes(1));
	});

	it('forwards the card regenerate request as its own generate', async () => {
		getDatasets.mockResolvedValue([dataTableDataset]);
		const { getByTestId, emitted } = renderComponent();
		await waitFor(() => expect(getByTestId('agent-evals-cases-card')).toBeInTheDocument());

		await userEvent.click(getByTestId('agent-evals-regenerate'));

		await waitFor(() => expect(emitted('generate')).toBeTruthy());
	});
});
