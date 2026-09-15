import { describe, it, expect, vi, beforeEach } from 'vitest';
import { configure } from '@testing-library/vue';
import { createTestingPinia } from '@pinia/testing';
import userEvent from '@testing-library/user-event';
import { flushPromises } from '@vue/test-utils';

import { createComponentRenderer } from '@/__tests__/render';
import { useAgentEvalsStore } from '../agentEvals.store';
import type { AgentEvalDatasetRecord } from '../agentEvals.types';
import AgentEvalsSection from '../components/AgentEvalsSection.vue';

// Components use `data-testid`; the global setup configures `data-test-id`.
configure({ testIdAttribute: 'data-testid' });

vi.mock('@n8n/i18n', async (importOriginal) => ({
	...(await importOriginal()),
	useI18n: () => ({ baseText: (key: string) => `mocked-${key}` }),
}));

vi.mock('../components/AgentEvalCasesCard.vue', () => ({
	default: {
		name: 'AgentEvalCasesCard',
		props: ['dataset', 'disabled', 'canRun', 'generating'],
		emits: ['regenerate'],
		template: `<div data-testid="agent-evals-cases-card">{{ dataset.id }}
			<button data-testid="stub-regenerate" @click="$emit('regenerate')" /></div>`,
	},
}));

vi.mock('../components/AgentEvalResultsPanel.vue', () => ({
	default: {
		name: 'AgentEvalResultsPanel',
		props: ['runId'],
		emits: ['rerun'],
		template: `<div data-testid="agent-eval-results-panel">{{ runId }}
			<button data-testid="stub-rerun" @click="$emit('rerun')" /></div>`,
	},
}));

const PROJECT_ID = 'project-1';
const AGENT_ID = 'agent-1';

const dataset = (id: string): AgentEvalDatasetRecord => ({
	id,
	name: `dataset-${id}`,
	description: null,
	agentId: AGENT_ID,
	columnMapping: null,
	createdById: null,
	createdAt: '2026-01-01T00:00:00.000Z',
	updatedAt: '2026-01-01T00:00:00.000Z',
	datasetSource: 'data_table',
	datasetRef: { dataTableId: 'dt-1' },
});

const renderComponent = createComponentRenderer(AgentEvalsSection, {
	props: { projectId: PROJECT_ID, agentId: AGENT_ID },
});

const renderRaw = (
	state: {
		loaded?: boolean;
		datasets?: AgentEvalDatasetRecord[];
		latestRunId?: string | null;
	} = {},
	props: Record<string, unknown> = {},
) => {
	const pinia = createTestingPinia({ stubActions: true });
	const store = useAgentEvalsStore();

	vi.mocked(store.isLoaded).mockReturnValue(state.loaded ?? true);
	vi.mocked(store.getDatasets).mockReturnValue(state.datasets ?? []);
	vi.mocked(store.getLatestRunId).mockReturnValue(state.latestRunId ?? null);
	vi.mocked(store.isStartingRun).mockReturnValue(false);
	vi.mocked(store.fetchDatasets).mockResolvedValue(state.datasets ?? []);

	const rendered = renderComponent({ pinia, props });
	return { rendered, store };
};

/** The section reads on mount, so every branch assertion needs that read settled. */
const render = async (
	state: Parameters<typeof renderRaw>[0] = {},
	props: Record<string, unknown> = {},
) => {
	const { rendered, store } = renderRaw(state, props);
	await flushPromises();
	return { ...rendered, store };
};

describe('AgentEvalsSection', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe('the first-run state', () => {
		it('renders its title, description and CTA when the agent has no datasets', async () => {
			const { getByTestId, getByText } = await render({ datasets: [] });

			expect(getByTestId('agent-evals-section')).toBeInTheDocument();
			expect(getByTestId('agent-evals-empty-state')).toBeInTheDocument();
			// Asserting on the mocked key prefix verifies the keys we intended rather
			// than arbitrary copy.
			expect(getByText('mocked-agents.builder.agentEvals.empty.title')).toBeInTheDocument();
			expect(getByText('mocked-agents.builder.agentEvals.empty.description')).toBeInTheDocument();
		});

		it('emits generate when the CTA is clicked', async () => {
			const { getByTestId, emitted } = await render({ datasets: [] });

			await userEvent.click(getByTestId('agent-evals-generate-button'));

			expect(emitted('generate')).toBeTruthy();
		});

		it('disables the CTA for users who cannot edit the agent', async () => {
			const { getByTestId } = await render({ datasets: [] }, { disabled: true });

			expect(getByTestId('agent-evals-generate-button')).toBeDisabled();
		});
	});

	describe('branching', () => {
		// Deliberately not flushed: the skeleton only exists while the read is in
		// flight, so awaiting it would assert on the state after it has gone.
		it('shows a skeleton while the datasets are still loading', () => {
			const { rendered } = renderRaw({ loaded: false });
			const { getByTestId, queryByTestId } = rendered;

			expect(getByTestId('agent-evals-loading')).toBeInTheDocument();
			expect(queryByTestId('agent-evals-empty-state')).not.toBeInTheDocument();
		});

		it('shows the review card for the newest run of the newest dataset', async () => {
			const { getByTestId } = await render({
				datasets: [dataset('d-new'), dataset('d-old')],
				latestRunId: 'run-7',
			});

			expect(getByTestId('agent-eval-results-panel')).toHaveTextContent('run-7');
		});

		// A dataset with no run shows its cases: reviewing and running a drafted set is
		// the case list's, and running from here is what makes the results view
		// reachable at all.
		it('shows the drafted cases when a dataset exists but has never run', async () => {
			const { getByTestId, queryByTestId } = await render({
				datasets: [dataset('d1')],
				latestRunId: null,
			});

			expect(getByTestId('agent-evals-cases-card')).toHaveTextContent('d1');
			expect(queryByTestId('agent-evals-generate-button')).not.toBeInTheDocument();
			expect(queryByTestId('agent-eval-results-panel')).not.toBeInTheDocument();
		});

		it("forwards the card's regenerate request to the host", async () => {
			const { getByTestId, emitted } = await render({
				datasets: [dataset('d1')],
				latestRunId: null,
			});

			await userEvent.click(getByTestId('stub-regenerate'));

			expect(emitted().generate).toBeTruthy();
		});

		// A run exists, so the results take the slot the cases card would otherwise hold.
		it('prefers the results panel once the dataset has a run', async () => {
			const { getByTestId, queryByTestId } = await render({
				datasets: [dataset('d1')],
				latestRunId: 'run-7',
			});

			expect(getByTestId('agent-eval-results-panel')).toBeInTheDocument();
			expect(queryByTestId('agent-evals-cases-card')).not.toBeInTheDocument();
		});
	});

	describe('fetching', () => {
		it('reads the datasets on mount', async () => {
			const { store } = await render({ datasets: [dataset('d1')] });

			expect(store.fetchDatasets).toHaveBeenCalledWith(PROJECT_ID, AGENT_ID);
		});

		// An unsaved agent has no row yet, so the agent-scoped routes would 404.
		it('fetches nothing while the agent is unsaved', async () => {
			const { store } = await render({ datasets: [] }, { agentUnsaved: true });

			expect(store.fetchDatasets).not.toHaveBeenCalled();
		});

		// Nothing is loading, so there is nothing to wait for — a skeleton here would
		// never resolve.
		it('shows the first-run state rather than a skeleton while the agent is unsaved', async () => {
			const { getByTestId, queryByTestId } = await render(
				{ loaded: false },
				{ agentUnsaved: true },
			);

			expect(getByTestId('agent-evals-empty-state')).toBeInTheDocument();
			expect(queryByTestId('agent-evals-loading')).not.toBeInTheDocument();
		});
	});

	// A failed read never populates the cache, so keying the skeleton off `isLoaded`
	// left it up for good once the toast had gone.
	it('falls through to the first-run state when the dataset read fails', async () => {
		const pinia = createTestingPinia({ stubActions: true });
		const store = useAgentEvalsStore();
		vi.mocked(store.isLoaded).mockReturnValue(false);
		vi.mocked(store.getDatasets).mockReturnValue([]);
		vi.mocked(store.getLatestRunId).mockReturnValue(null);
		vi.mocked(store.isStartingRun).mockReturnValue(false);
		vi.mocked(store.fetchDatasets).mockRejectedValue(new Error('offline'));

		const { getByTestId, queryByTestId } = renderComponent({ pinia });
		await flushPromises();

		expect(queryByTestId('agent-evals-loading')).not.toBeInTheDocument();
		expect(getByTestId('agent-evals-empty-state')).toBeInTheDocument();
	});

	// The card only asks; the section owns which dataset gets run.
	it('starts a run on the shown dataset when the card asks for one', async () => {
		const { getByTestId, store } = await render({
			datasets: [dataset('d1')],
			latestRunId: 'run-7',
		});

		await userEvent.click(getByTestId('stub-rerun'));

		expect(store.startRun).toHaveBeenCalledWith(PROJECT_ID, AGENT_ID, 'd1');
	});
});
