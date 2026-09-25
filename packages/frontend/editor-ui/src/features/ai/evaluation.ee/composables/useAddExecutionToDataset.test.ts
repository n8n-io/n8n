import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ref } from 'vue';
import type { EvaluationConfigDto } from '@n8n/api-types';

import { ADD_EXECUTION_TO_DATASET_MODAL_KEY } from '@/app/constants';

const isFeatureEnabled = ref(false);
const fetchEvaluationConfigs = vi.fn<(workflowId: string) => Promise<EvaluationConfigDto[]>>();
const openModalWithData = vi.fn();

vi.mock('@/experiments/evaluationsWizardSidepanel/useEvaluationsWizardSidepanelExperiment', () => ({
	useEvaluationsWizardSidepanelExperiment: () => ({ isFeatureEnabled }),
}));

vi.mock('../evaluation.store', () => ({
	useEvaluationStore: () => ({ fetchEvaluationConfigs }),
}));

vi.mock('@/app/stores/ui.store', () => ({
	useUIStore: () => ({ openModalWithData }),
}));

import { useAddExecutionToDataset } from './useAddExecutionToDataset';

function config(overrides: Partial<EvaluationConfigDto>): EvaluationConfigDto {
	return {
		id: 'cfg-1',
		name: 'Eval',
		datasetSource: 'data_table',
		...overrides,
	} as EvaluationConfigDto;
}

describe('useAddExecutionToDataset', () => {
	beforeEach(() => {
		isFeatureEnabled.value = false;
		fetchEvaluationConfigs.mockReset();
		openModalWithData.mockReset();
	});

	it('does not fetch configs when the experiment is disabled', async () => {
		isFeatureEnabled.value = false;
		const { fetchDataTableConfigs, hasDataTableConfig } = useAddExecutionToDataset('wf-1');

		await fetchDataTableConfigs();

		expect(fetchEvaluationConfigs).not.toHaveBeenCalled();
		expect(hasDataTableConfig.value).toBe(false);
	});

	it('keeps only data_table configs when the experiment is enabled', async () => {
		isFeatureEnabled.value = true;
		fetchEvaluationConfigs.mockResolvedValue([
			config({ id: 'a', datasetSource: 'data_table' }),
			config({ id: 'b', datasetSource: 'google_sheets' }),
		]);
		const { fetchDataTableConfigs, hasDataTableConfig } = useAddExecutionToDataset('wf-1');

		await fetchDataTableConfigs();

		expect(fetchEvaluationConfigs).toHaveBeenCalledWith('wf-1');
		expect(hasDataTableConfig.value).toBe(true);
	});

	it('reports no config when only non-data_table configs exist', async () => {
		isFeatureEnabled.value = true;
		fetchEvaluationConfigs.mockResolvedValue([config({ id: 'b', datasetSource: 'google_sheets' })]);
		const { fetchDataTableConfigs, hasDataTableConfig } = useAddExecutionToDataset('wf-1');

		await fetchDataTableConfigs();

		expect(hasDataTableConfig.value).toBe(false);
	});

	it('leaves the action disabled when fetching configs fails', async () => {
		isFeatureEnabled.value = true;
		fetchEvaluationConfigs.mockRejectedValue(new Error('boom'));
		const { fetchDataTableConfigs, hasDataTableConfig } = useAddExecutionToDataset('wf-1');

		await expect(fetchDataTableConfigs()).resolves.toBeUndefined();
		expect(hasDataTableConfig.value).toBe(false);
	});

	it('opens the modal with the workflow id, execution id and filtered configs', async () => {
		isFeatureEnabled.value = true;
		const dataTableConfig = config({ id: 'a', datasetSource: 'data_table' });
		fetchEvaluationConfigs.mockResolvedValue([
			dataTableConfig,
			config({ id: 'b', datasetSource: 'google_sheets' }),
		]);
		const { fetchDataTableConfigs, openModal } = useAddExecutionToDataset('wf-1');
		await fetchDataTableConfigs();

		openModal('exec-1');

		expect(openModalWithData).toHaveBeenCalledWith({
			name: ADD_EXECUTION_TO_DATASET_MODAL_KEY,
			data: {
				workflowId: 'wf-1',
				executionId: 'exec-1',
				configs: [dataTableConfig],
			},
		});
	});
});
