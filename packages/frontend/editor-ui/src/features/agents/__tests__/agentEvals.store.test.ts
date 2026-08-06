import { createPinia, setActivePinia } from 'pinia';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useAgentEvalsStore } from '../agentEvals.store';
import type {
	AgentEvalDatasetRecord,
	AgentEvalRunRecord,
	AgentEvalRunSummary,
} from '../agentEvals.types';
import type { AgentEvalCaseSource } from '../utils/agentEvalCases.utils';

const { getDatasets, generateDraftCases, startRun, getRunSummary, listRuns } = vi.hoisted(() => ({
	getDatasets: vi.fn(),
	generateDraftCases: vi.fn(),
	startRun: vi.fn(),
	getRunSummary: vi.fn(),
	listRuns: vi.fn(),
}));

const { fetchDataTableContent, insertRow, updateRow, deleteRows } = vi.hoisted(() => ({
	fetchDataTableContent: vi.fn(),
	insertRow: vi.fn(),
	updateRow: vi.fn(),
	deleteRows: vi.fn(),
}));

vi.mock('../agentEvals.api', () => ({
	getDatasets,
	generateDraftCases,
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

vi.mock('@n8n/stores/useRootStore', () => ({
	useRootStore: vi.fn(() => ({
		restApiContext: { instanceId: 'test-instance-id' },
	})),
}));

const PROJECT_ID = 'project-1';
const AGENT_ID = 'agent-1';
const DATASET_ID = 'd1';
const RUN_ID = 'run-1';

const source: AgentEvalCaseSource = {
	datasetId: DATASET_ID,
	dataTableId: 'dt-1',
	columns: { input: 'input', whatToCheck: 'criteria' },
};

const run = (overrides: Partial<AgentEvalRunRecord> = {}): AgentEvalRunRecord => ({
	id: RUN_ID,
	datasetId: DATASET_ID,
	agentVersionId: null,
	status: 'running',
	runAt: null,
	completedAt: null,
	metrics: null,
	errorCode: null,
	errorDetails: null,
	createdById: null,
	createdAt: '2026-01-01T00:00:00.000Z',
	updatedAt: '2026-01-01T00:00:00.000Z',
	...overrides,
});

const summary = (
	counts: Partial<AgentEvalRunSummary['counts']> = {},
	status: AgentEvalRunSummary['status'] = 'running',
): AgentEvalRunSummary => ({
	runId: RUN_ID,
	status,
	counts: { total: 2, success: 0, error: 0, cancelled: 0, pending: 2, ...counts },
});

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
		});
	});

	describe('generateDraftCases', () => {
		it('re-reads the dataset list once the server has persisted the drafts', async () => {
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
			// The generate response carries drafts, not the dataset row, so the
			// cache has to come from the follow-up read.
			expect(getDatasets).toHaveBeenCalledTimes(1);
			expect(store.getDatasets(AGENT_ID).map((d) => d.id)).toEqual(['d1']);
		});

		it('clears the generating flag when generation rejects', async () => {
			generateDraftCases.mockRejectedValue(new Error('no model'));
			const store = useAgentEvalsStore();

			await expect(store.generateDraftCases(PROJECT_ID, AGENT_ID)).rejects.toThrow('no model');

			expect(store.isGeneratingCases(AGENT_ID)).toBe(false);
		});
	});

	describe('fetchCases', () => {
		it('maps rows through the source columns and caches them under the dataset id', async () => {
			fetchDataTableContent.mockResolvedValue({
				count: 2,
				data: [
					{ id: 1, input: 'first', criteria: 'a' },
					{ id: 2, input: 'second', criteria: 'b' },
				],
			});
			const store = useAgentEvalsStore();

			await store.fetchCases(PROJECT_ID, source);

			expect(fetchDataTableContent).toHaveBeenCalledWith('dt-1', PROJECT_ID, 1, 100, 'id:asc');
			expect(store.getCases(DATASET_ID)).toEqual([
				{ rowId: 1, input: 'first', whatToCheck: 'a' },
				{ rowId: 2, input: 'second', whatToCheck: 'b' },
			]);
			// Another dataset's cache must stay empty — one agent accumulates a
			// dataset per generation, and each has its own rows.
			expect(store.getCases('d2')).toEqual([]);
		});

		it('caches the server total, which the run button counts rather than the loaded page', async () => {
			fetchDataTableContent.mockResolvedValue({
				count: 120,
				data: [{ id: 1, input: 'first', criteria: 'a' }],
			});
			const store = useAgentEvalsStore();

			await store.fetchCases(PROJECT_ID, source);

			expect(store.getCases(DATASET_ID)).toHaveLength(1);
			expect(store.getCasesCount(DATASET_ID)).toBe(120);
		});

		it('drops a row with no numeric id rather than caching a case that cannot be saved', async () => {
			fetchDataTableContent.mockResolvedValue({
				count: 2,
				data: [
					{ id: 1, input: 'first', criteria: 'a' },
					{ input: 'orphan', criteria: 'b' },
				],
			});
			const store = useAgentEvalsStore();

			await store.fetchCases(PROJECT_ID, source);

			expect(store.getCases(DATASET_ID)).toEqual([{ rowId: 1, input: 'first', whatToCheck: 'a' }]);
		});

		it('distinguishes "not loaded" from "loaded but empty"', async () => {
			fetchDataTableContent.mockResolvedValue({ count: 0, data: [] });
			const store = useAgentEvalsStore();

			expect(store.areCasesLoaded(DATASET_ID)).toBe(false);
			await store.fetchCases(PROJECT_ID, source);

			expect(store.areCasesLoaded(DATASET_ID)).toBe(true);
			expect(store.getCases(DATASET_ID)).toEqual([]);
		});

		it('clears the loading flag when the read rejects', async () => {
			fetchDataTableContent.mockRejectedValue(new Error('boom'));
			const store = useAgentEvalsStore();

			await expect(store.fetchCases(PROJECT_ID, source)).rejects.toThrow('boom');

			expect(store.isLoadingCases(DATASET_ID)).toBe(false);
		});
	});

	describe('createCase', () => {
		it('appends the created row and moves the total once the insert resolves', async () => {
			fetchDataTableContent.mockResolvedValue({
				count: 1,
				data: [{ id: 1, input: 'first', criteria: 'a' }],
			});
			insertRow.mockResolvedValue({ id: 2, input: 'second', criteria: 'b' });
			const store = useAgentEvalsStore();
			await store.fetchCases(PROJECT_ID, source);

			const created = await store.createCase(PROJECT_ID, source, {
				input: 'second',
				whatToCheck: 'b',
			});

			expect(insertRow).toHaveBeenCalledWith('dt-1', PROJECT_ID, {
				input: 'second',
				criteria: 'b',
			});
			expect(created).toEqual({ rowId: 2, input: 'second', whatToCheck: 'b' });
			expect(store.getCases(DATASET_ID).map((c) => c.rowId)).toEqual([1, 2]);
			expect(store.getCasesCount(DATASET_ID)).toBe(2);
		});

		it('leaves the cache untouched when the insert rejects', async () => {
			insertRow.mockRejectedValue(new Error('too big'));
			const store = useAgentEvalsStore();

			await expect(
				store.createCase(PROJECT_ID, source, { input: 'second', whatToCheck: 'b' }),
			).rejects.toThrow('too big');

			expect(store.getCases(DATASET_ID)).toEqual([]);
			expect(store.getCasesCount(DATASET_ID)).toBe(0);
		});
	});

	describe('updateCase', () => {
		beforeEach(async () => {
			fetchDataTableContent.mockResolvedValue({
				count: 2,
				data: [
					{ id: 1, input: 'first', criteria: 'a' },
					{ id: 2, input: 'second', criteria: 'b' },
				],
			});
		});

		it('patches the row in place and leaves its siblings alone', async () => {
			updateRow.mockResolvedValue(true);
			const store = useAgentEvalsStore();
			await store.fetchCases(PROJECT_ID, source);

			const result = await store.updateCase(PROJECT_ID, source, 1, {
				input: 'edited',
				whatToCheck: 'edited check',
			});

			expect(updateRow).toHaveBeenCalledWith('dt-1', PROJECT_ID, 1, {
				input: 'edited',
				criteria: 'edited check',
			});
			expect(result).toBe(true);
			expect(store.getCases(DATASET_ID)).toEqual([
				{ rowId: 1, input: 'edited', whatToCheck: 'edited check' },
				{ rowId: 2, input: 'second', whatToCheck: 'b' },
			]);
		});

		it('leaves the cache unchanged when the write is not acknowledged', async () => {
			updateRow.mockResolvedValue(false);
			const store = useAgentEvalsStore();
			await store.fetchCases(PROJECT_ID, source);

			const result = await store.updateCase(PROJECT_ID, source, 1, {
				input: 'edited',
				whatToCheck: 'edited check',
			});

			expect(result).toBe(false);
			expect(store.getCases(DATASET_ID)[0].input).toBe('first');
		});

		it('clears the per-row mutating flag when the write rejects', async () => {
			updateRow.mockRejectedValue(new Error('boom'));
			const store = useAgentEvalsStore();
			await store.fetchCases(PROJECT_ID, source);

			await expect(
				store.updateCase(PROJECT_ID, source, 1, { input: 'edited', whatToCheck: 'c' }),
			).rejects.toThrow('boom');

			expect(store.isMutatingCase(DATASET_ID, 1)).toBe(false);
			expect(store.getCases(DATASET_ID)[0].input).toBe('first');
		});
	});

	describe('deleteCase', () => {
		beforeEach(async () => {
			fetchDataTableContent.mockResolvedValue({
				count: 2,
				data: [
					{ id: 1, input: 'first', criteria: 'a' },
					{ id: 2, input: 'second', criteria: 'b' },
				],
			});
		});

		it('removes the row and decrements the total', async () => {
			deleteRows.mockResolvedValue(true);
			const store = useAgentEvalsStore();
			await store.fetchCases(PROJECT_ID, source);

			const result = await store.deleteCase(PROJECT_ID, source, 1);

			expect(deleteRows).toHaveBeenCalledWith('dt-1', PROJECT_ID, [1]);
			expect(result).toBe(true);
			expect(store.getCases(DATASET_ID).map((c) => c.rowId)).toEqual([2]);
			expect(store.getCasesCount(DATASET_ID)).toBe(1);
		});

		it('keeps the row when the delete is not acknowledged', async () => {
			deleteRows.mockResolvedValue(false);
			const store = useAgentEvalsStore();
			await store.fetchCases(PROJECT_ID, source);

			const result = await store.deleteCase(PROJECT_ID, source, 1);

			expect(result).toBe(false);
			expect(store.getCases(DATASET_ID).map((c) => c.rowId)).toEqual([1, 2]);
			expect(store.getCasesCount(DATASET_ID)).toBe(2);
		});
	});

	describe('startRun', () => {
		it('records the started run under the dataset id', async () => {
			startRun.mockResolvedValue(run());
			const store = useAgentEvalsStore();

			await store.startRun(PROJECT_ID, AGENT_ID, DATASET_ID);

			expect(startRun).toHaveBeenCalledWith(
				{ instanceId: 'test-instance-id' },
				PROJECT_ID,
				AGENT_ID,
				DATASET_ID,
			);
			expect(store.getLatestRun(DATASET_ID)?.id).toBe(RUN_ID);
			expect(store.isStartingRun(DATASET_ID)).toBe(false);
		});

		it('clears the starting flag when the request rejects', async () => {
			startRun.mockRejectedValue(new Error('no cases'));
			const store = useAgentEvalsStore();

			await expect(store.startRun(PROJECT_ID, AGENT_ID, DATASET_ID)).rejects.toThrow('no cases');

			expect(store.isStartingRun(DATASET_ID)).toBe(false);
			expect(store.getLatestRun(DATASET_ID)).toBeNull();
		});
	});

	describe('fetchRunSummary', () => {
		it('caches the summary and keeps the cached run status coherent with it', async () => {
			startRun.mockResolvedValue(run({ status: 'new' }));
			getRunSummary.mockResolvedValue(summary({ pending: 0, success: 2 }, 'completed'));
			const store = useAgentEvalsStore();
			await store.startRun(PROJECT_ID, AGENT_ID, DATASET_ID);

			const result = await store.fetchRunSummary(PROJECT_ID, AGENT_ID, DATASET_ID, RUN_ID);

			expect(result.counts.pending).toBe(0);
			expect(store.getRunSummary(RUN_ID)?.counts.success).toBe(2);
			expect(store.getLatestRun(DATASET_ID)?.status).toBe('completed');
		});

		it('does not touch a cached run for a different run id', async () => {
			startRun.mockResolvedValue(run({ id: 'run-other', status: 'running' }));
			getRunSummary.mockResolvedValue(summary({ pending: 0 }, 'completed'));
			const store = useAgentEvalsStore();
			await store.startRun(PROJECT_ID, AGENT_ID, DATASET_ID);

			await store.fetchRunSummary(PROJECT_ID, AGENT_ID, DATASET_ID, RUN_ID);

			expect(store.getLatestRun(DATASET_ID)?.status).toBe('running');
		});
	});

	describe('fetchLatestRun', () => {
		it('caches the newest run so a reload can pick an in-flight run back up', async () => {
			listRuns.mockResolvedValue({ count: 3, data: [run()] });
			const store = useAgentEvalsStore();

			const result = await store.fetchLatestRun(PROJECT_ID, AGENT_ID, DATASET_ID);

			expect(listRuns).toHaveBeenCalledWith(
				{ instanceId: 'test-instance-id' },
				PROJECT_ID,
				AGENT_ID,
				DATASET_ID,
				{ skip: 0, take: 1 },
			);
			expect(result?.id).toBe(RUN_ID);
			expect(store.getLatestRun(DATASET_ID)?.id).toBe(RUN_ID);
		});

		it('tolerates a dataset that has never been run', async () => {
			listRuns.mockResolvedValue({ count: 0, data: [] });
			const store = useAgentEvalsStore();

			const result = await store.fetchLatestRun(PROJECT_ID, AGENT_ID, DATASET_ID);

			expect(result).toBeNull();
			expect(store.getLatestRun(DATASET_ID)).toBeNull();
		});
	});
});
