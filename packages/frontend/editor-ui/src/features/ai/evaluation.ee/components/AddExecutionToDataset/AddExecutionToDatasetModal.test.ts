import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createTestingPinia } from '@pinia/testing';
import userEvent from '@testing-library/user-event';
import { waitFor } from '@testing-library/vue';
import type { DatasetCandidateResponse, EvaluationConfigDto } from '@n8n/api-types';

import { createComponentRenderer } from '@/__tests__/render';
import AddExecutionToDatasetModal from './AddExecutionToDatasetModal.vue';

const getDatasetCandidate = vi.fn<() => Promise<DatasetCandidateResponse>>();
const addExecutionToDataset = vi.fn();
const showError = vi.fn();
const showMessage = vi.fn();
const track = vi.fn();

// Render the modal's slot content directly — bypasses teleport / uiStore open state.
vi.mock('@/app/components/Modal.vue', () => ({
	default: {
		name: 'Modal',
		template: '<div><slot name="content" /><slot name="footer" :close="closeFn" /></div>',
		setup() {
			return { closeFn: () => {} };
		},
	},
}));

vi.mock('../../evaluation.store', () => ({
	useEvaluationStore: () => ({ getDatasetCandidate, addExecutionToDataset }),
}));

vi.mock('@/app/composables/useToast', () => ({
	useToast: () => ({ showError, showMessage }),
}));

vi.mock('@/app/composables/useTelemetry', () => ({
	useTelemetry: () => ({ track }),
}));

vi.mock('@n8n/i18n', async (importOriginal) => ({
	...(await importOriginal()),
	useI18n: () => ({ baseText: (key: string) => key }),
}));

const renderComponent = createComponentRenderer(AddExecutionToDatasetModal);

function candidate(overrides: Partial<DatasetCandidateResponse> = {}): DatasetCandidateResponse {
	return {
		dataTableId: 'dt-1',
		columns: [
			{ name: 'question', type: 'string' },
			{ name: 'answer', type: 'string' },
			{ name: 'notes', type: 'string' },
		],
		fields: {
			inputs: [{ key: 'question', sample: 'Q1' }],
			outputs: [{ key: 'answer', sample: 'A1' }],
		},
		suggestedMapping: {
			question: { source: 'input', field: 'question' },
			answer: { source: 'output', field: 'answer' },
			notes: null,
		},
		...overrides,
	};
}

const configs = [
	{ id: 'cfg-1', name: 'My eval', datasetSource: 'data_table' },
] as EvaluationConfigDto[];

const defaultProps = {
	modalName: 'addExecutionToDataset',
	data: { workflowId: 'wf-1', executionId: 'exec-1', configs },
};

describe('AddExecutionToDatasetModal', () => {
	beforeEach(() => {
		createTestingPinia({ stubActions: false });
		getDatasetCandidate.mockReset();
		addExecutionToDataset.mockReset();
		showError.mockReset();
		showMessage.mockReset();
		track.mockReset();
		getDatasetCandidate.mockResolvedValue(candidate());
		addExecutionToDataset.mockResolvedValue([{ id: 1 }]);
	});

	it('loads the candidate and renders a row per data table column', async () => {
		const { getByTestId } = renderComponent({ props: defaultProps });

		await waitFor(() => {
			expect(getByTestId('add-execution-to-dataset-column-question')).toBeInTheDocument();
		});
		expect(getByTestId('add-execution-to-dataset-column-answer')).toBeInTheDocument();
		expect(getByTestId('add-execution-to-dataset-column-notes')).toBeInTheDocument();
		expect(getDatasetCandidate).toHaveBeenCalledWith({
			workflowId: 'wf-1',
			configId: 'cfg-1',
			executionId: 'exec-1',
		});
	});

	it('tracks an event when the modal opens', () => {
		renderComponent({ props: defaultProps });
		expect(track).toHaveBeenCalledWith(
			'User opened add execution to dataset modal',
			expect.objectContaining({ workflow_id: 'wf-1', execution_id: 'exec-1', config_count: 1 }),
		);
	});

	it('submits the suggested mapping, mapping unmatched columns to null', async () => {
		const { getByTestId } = renderComponent({ props: defaultProps });

		await waitFor(() => expect(getByTestId('add-execution-to-dataset-submit')).toBeEnabled());
		await userEvent.click(getByTestId('add-execution-to-dataset-submit'));

		await waitFor(() =>
			expect(addExecutionToDataset).toHaveBeenCalledWith({
				workflowId: 'wf-1',
				configId: 'cfg-1',
				payload: {
					executionId: 'exec-1',
					mapping: {
						question: { source: 'input', field: 'question' },
						answer: { source: 'output', field: 'answer' },
						notes: null,
					},
				},
			}),
		);
		expect(showMessage).toHaveBeenCalledWith(expect.objectContaining({ type: 'success' }));
		expect(track).toHaveBeenCalledWith(
			'User added execution to evaluation dataset',
			expect.objectContaining({ config_id: 'cfg-1', columns_mapped: 2 }),
		);
	});

	it('shows an error toast and does not close when adding fails', async () => {
		addExecutionToDataset.mockRejectedValueOnce(new Error('boom'));
		const { getByTestId } = renderComponent({ props: defaultProps });

		await waitFor(() => expect(getByTestId('add-execution-to-dataset-submit')).toBeEnabled());
		await userEvent.click(getByTestId('add-execution-to-dataset-submit'));

		await waitFor(() => expect(showError).toHaveBeenCalled());
		expect(showMessage).not.toHaveBeenCalled();
	});

	it('ignores a stale candidate response when the selected config has changed', async () => {
		const twoConfigs = [
			{ id: 'cfg-1', name: 'First eval', datasetSource: 'data_table' },
			{ id: 'cfg-2', name: 'Second eval', datasetSource: 'data_table' },
		] as EvaluationConfigDto[];

		// Hand out a deferred promise per call so we control resolution order.
		const resolvers: Array<(r: DatasetCandidateResponse) => void> = [];
		getDatasetCandidate.mockImplementation(
			async () =>
				await new Promise<DatasetCandidateResponse>((resolve) => {
					resolvers.push(resolve);
				}),
		);

		const { getByTestId, getByText, queryByTestId } = renderComponent({
			props: { ...defaultProps, data: { ...defaultProps.data, configs: twoConfigs } },
		});

		// onMounted fired the first request (cfg-1); wait for it to be in flight.
		await waitFor(() => expect(resolvers).toHaveLength(1));

		// Switch to cfg-2, starting a second request before the first resolves.
		await userEvent.click(getByTestId('add-execution-to-dataset-config-select'));
		await userEvent.click(getByText('Second eval'));
		await waitFor(() => expect(resolvers).toHaveLength(2));

		// Resolve the current (cfg-2) request first, then the stale (cfg-1) one.
		resolvers[1](
			candidate({
				columns: [{ name: 'fresh', type: 'string' }],
				suggestedMapping: { fresh: null },
			}),
		);
		resolvers[0](
			candidate({
				columns: [{ name: 'stale', type: 'string' }],
				suggestedMapping: { stale: null },
			}),
		);

		await waitFor(() =>
			expect(getByTestId('add-execution-to-dataset-column-fresh')).toBeInTheDocument(),
		);
		// The late stale response must not have overwritten the current config's data.
		expect(queryByTestId('add-execution-to-dataset-column-stale')).not.toBeInTheDocument();
	});

	it('disables submit and shows a message when the dataset has no columns', async () => {
		getDatasetCandidate.mockResolvedValue(candidate({ columns: [], suggestedMapping: {} }));
		const { getByTestId } = renderComponent({ props: defaultProps });

		await waitFor(() =>
			expect(getByTestId('add-execution-to-dataset-modal')).toHaveTextContent(
				'evaluations.addToDataset.noColumns',
			),
		);
		expect(getByTestId('add-execution-to-dataset-submit')).toBeDisabled();
	});
});
