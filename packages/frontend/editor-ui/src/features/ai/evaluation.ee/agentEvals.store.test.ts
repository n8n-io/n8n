import { createPinia, setActivePinia } from 'pinia';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useAgentEvalsStore } from './agentEvals.store';
import type { AgentEvalDatasetRecord } from './agentEvals.types';

const { getDatasets, createDataset, updateDataset, deleteDataset, generateDraftCases } = vi.hoisted(
	() => ({
		getDatasets: vi.fn(),
		createDataset: vi.fn(),
		updateDataset: vi.fn(),
		deleteDataset: vi.fn(),
		generateDraftCases: vi.fn(),
	}),
);

vi.mock('./agentEvals.api', () => ({
	getDatasets,
	createDataset,
	updateDataset,
	deleteDataset,
	generateDraftCases,
}));

vi.mock('@n8n/stores/useRootStore', () => ({
	useRootStore: vi.fn(() => ({
		restApiContext: { instanceId: 'test-instance-id' },
	})),
}));

const PROJECT_ID = 'project-1';
const AGENT_ID = 'agent-1';

const dataset = (id: string, name = `dataset-${id}`): AgentEvalDatasetRecord => ({
	id,
	name,
	description: null,
	agentId: AGENT_ID,
	columnMapping: null,
	createdById: null,
	createdAt: '2026-01-01T00:00:00.000Z',
	updatedAt: '2026-01-01T00:00:00.000Z',
	datasetSource: 'data_table',
	datasetRef: { dataTableId: 'dt-1' },
});

describe('useAgentEvalsStore', () => {
	beforeEach(() => {
		setActivePinia(createPinia());
		vi.clearAllMocks();
	});

	describe('fetchDatasets', () => {
		it('caches datasets under the agent id', async () => {
			getDatasets.mockResolvedValue([dataset('d1')]);
			const store = useAgentEvalsStore();

			await store.fetchDatasets(PROJECT_ID, AGENT_ID);

			expect(getDatasets).toHaveBeenCalledWith(
				{ instanceId: 'test-instance-id' },
				PROJECT_ID,
				AGENT_ID,
			);
			expect(store.getDatasets(AGENT_ID)).toHaveLength(1);
			// Another agent's cache must stay empty — switching agents in the
			// builder should never surface the previous agent's datasets.
			expect(store.getDatasets('agent-2')).toEqual([]);
		});

		it('distinguishes "not loaded" from "loaded but empty"', async () => {
			getDatasets.mockResolvedValue([]);
			const store = useAgentEvalsStore();

			expect(store.isLoaded(AGENT_ID)).toBe(false);
			await store.fetchDatasets(PROJECT_ID, AGENT_ID);

			expect(store.isLoaded(AGENT_ID)).toBe(true);
			expect(store.getDatasets(AGENT_ID)).toEqual([]);
		});

		it('clears the loading flag when the request rejects', async () => {
			getDatasets.mockRejectedValue(new Error('boom'));
			const store = useAgentEvalsStore();

			await expect(store.fetchDatasets(PROJECT_ID, AGENT_ID)).rejects.toThrow('boom');

			expect(store.isLoadingDatasets(AGENT_ID)).toBe(false);
			expect(store.isBusy).toBe(false);
		});
	});

	describe('dataset mutations', () => {
		it('appends a created dataset to the cache', async () => {
			getDatasets.mockResolvedValue([dataset('d1')]);
			createDataset.mockResolvedValue(dataset('d2'));
			const store = useAgentEvalsStore();
			await store.fetchDatasets(PROJECT_ID, AGENT_ID);

			await store.createDataset(PROJECT_ID, AGENT_ID, {
				name: 'new',
				agentId: AGENT_ID,
				datasetSource: 'data_table',
				datasetRef: { dataTableId: 'dt-1' },
			});

			expect(store.getDatasets(AGENT_ID).map((d) => d.id)).toEqual(['d1', 'd2']);
		});

		it('replaces the updated dataset in place', async () => {
			getDatasets.mockResolvedValue([dataset('d1'), dataset('d2')]);
			updateDataset.mockResolvedValue(dataset('d1', 'renamed'));
			const store = useAgentEvalsStore();
			await store.fetchDatasets(PROJECT_ID, AGENT_ID);

			await store.updateDataset(PROJECT_ID, AGENT_ID, 'd1', { name: 'renamed' });

			expect(store.getDatasets(AGENT_ID).map((d) => d.name)).toEqual(['renamed', 'dataset-d2']);
		});

		it('drops the deleted dataset from the cache', async () => {
			getDatasets.mockResolvedValue([dataset('d1'), dataset('d2')]);
			deleteDataset.mockResolvedValue({ success: true });
			const store = useAgentEvalsStore();
			await store.fetchDatasets(PROJECT_ID, AGENT_ID);

			await store.deleteDataset(PROJECT_ID, AGENT_ID, 'd1');

			expect(store.getDatasets(AGENT_ID).map((d) => d.id)).toEqual(['d2']);
		});
	});

	describe('generateDraftCases', () => {
		it('refreshes the dataset cache from the dataset the server created', async () => {
			generateDraftCases.mockResolvedValue({
				datasetId: 'd1',
				dataTableId: 'dt-1',
				cases: [{ input: 'hi', whatToCheck: 'is polite' }],
			});
			getDatasets.mockResolvedValue([dataset('d1')]);
			const store = useAgentEvalsStore();

			const result = await store.generateDraftCases(PROJECT_ID, AGENT_ID, { count: 3 });

			expect(generateDraftCases).toHaveBeenCalledWith(
				{ instanceId: 'test-instance-id' },
				PROJECT_ID,
				AGENT_ID,
				{ count: 3 },
			);
			expect(result.cases).toHaveLength(1);
			expect(store.getDatasets(AGENT_ID).map((d) => d.id)).toEqual(['d1']);
		});

		it('clears the generating flag when generation rejects', async () => {
			generateDraftCases.mockRejectedValue(new Error('no model'));
			const store = useAgentEvalsStore();

			await expect(store.generateDraftCases(PROJECT_ID, AGENT_ID)).rejects.toThrow('no model');

			expect(store.isGeneratingCases(AGENT_ID)).toBe(false);
		});
	});
});
