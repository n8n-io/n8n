import { createPinia, setActivePinia } from 'pinia';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useAgentEvalsStore } from '../agentEvals.store';
import type { AgentEvalDatasetRecord } from '../agentEvals.types';

const { getDatasets, generateDraftCases } = vi.hoisted(() => ({
	getDatasets: vi.fn(),
	generateDraftCases: vi.fn(),
}));

vi.mock('../agentEvals.api', () => ({
	getDatasets,
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

	describe('evals focus request', () => {
		it('has no request pending by default', () => {
			const store = useAgentEvalsStore();

			expect(store.pendingEvalsFocus).toBeNull();
			expect(store.consumeEvalsFocus(AGENT_ID)).toBeNull();
		});

		it('survives until consumed, so a builder mounting later still sees it', () => {
			const store = useAgentEvalsStore();

			store.requestEvalsFocus(AGENT_ID, true);

			expect(store.pendingEvalsFocus).toEqual({ agentId: AGENT_ID, generate: true });
			expect(store.consumeEvalsFocus(AGENT_ID)).toEqual({ agentId: AGENT_ID, generate: true });
		});

		it('is claimed once, so a second builder cannot re-run generation', () => {
			const store = useAgentEvalsStore();

			store.requestEvalsFocus(AGENT_ID, true);

			expect(store.consumeEvalsFocus(AGENT_ID)).not.toBeNull();
			expect(store.consumeEvalsFocus(AGENT_ID)).toBeNull();
			expect(store.pendingEvalsFocus).toBeNull();
		});

		it('is left alone by a builder rendering a different agent', () => {
			const store = useAgentEvalsStore();

			store.requestEvalsFocus(AGENT_ID, true);

			expect(store.consumeEvalsFocus('other-agent')).toBeNull();
			expect(store.pendingEvalsFocus).toEqual({ agentId: AGENT_ID, generate: true });
		});

		it('defaults to focusing without generating', () => {
			const store = useAgentEvalsStore();

			store.requestEvalsFocus(AGENT_ID);

			expect(store.consumeEvalsFocus(AGENT_ID)).toEqual({ agentId: AGENT_ID, generate: false });
		});

		it('drops an abandoned request so it cannot fire in an unrelated context later', () => {
			const store = useAgentEvalsStore();
			store.requestEvalsFocus(AGENT_ID, true);

			store.clearEvalsFocus(AGENT_ID);

			expect(store.pendingEvalsFocus).toBeNull();
			expect(store.consumeEvalsFocus(AGENT_ID)).toBeNull();
		});

		it('leaves a request another surface raised for a different agent', () => {
			const store = useAgentEvalsStore();
			store.requestEvalsFocus(AGENT_ID, true);

			store.clearEvalsFocus('other-agent');

			expect(store.pendingEvalsFocus).toEqual({ agentId: AGENT_ID, generate: true });
		});
	});
});
