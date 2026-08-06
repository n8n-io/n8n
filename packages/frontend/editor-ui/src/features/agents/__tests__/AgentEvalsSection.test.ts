import { describe, it, expect, vi, beforeEach } from 'vitest';
import { configure } from '@testing-library/vue';
import { createTestingPinia } from '@pinia/testing';
import userEvent from '@testing-library/user-event';

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

const render = (
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

	return { ...renderComponent({ pinia, props }), store };
};

describe('AgentEvalsSection', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe('the first-run state', () => {
		it('renders its title, description and CTA when the agent has no datasets', () => {
			const { getByTestId, getByText } = render({ datasets: [] });

			expect(getByTestId('agent-evals-section')).toBeInTheDocument();
			expect(getByTestId('agent-evals-empty-state')).toBeInTheDocument();
			// Asserting on the mocked key prefix verifies the keys we intended rather
			// than arbitrary copy.
			expect(getByText('mocked-agents.builder.agentEvals.empty.title')).toBeInTheDocument();
			expect(getByText('mocked-agents.builder.agentEvals.empty.description')).toBeInTheDocument();
		});

		it('emits generate when the CTA is clicked', async () => {
			const { getByTestId, emitted } = render({ datasets: [] });

			await userEvent.click(getByTestId('agent-evals-generate-button'));

			expect(emitted('generate')).toBeTruthy();
		});

		it('disables the CTA for users who cannot edit the agent', () => {
			const { getByTestId } = render({ datasets: [] }, { disabled: true });

			expect(getByTestId('agent-evals-generate-button')).toBeDisabled();
		});
	});

	describe('branching', () => {
		it('shows a skeleton until the datasets have loaded', () => {
			const { getByTestId, queryByTestId } = render({ loaded: false });

			expect(getByTestId('agent-evals-loading')).toBeInTheDocument();
			expect(queryByTestId('agent-evals-empty-state')).not.toBeInTheDocument();
		});

		it('shows the review card for the newest run of the newest dataset', () => {
			const { getByTestId } = render({
				datasets: [dataset('d-new'), dataset('d-old')],
				latestRunId: 'run-7',
			});

			expect(getByTestId('agent-eval-results-panel')).toHaveTextContent('run-7');
		});

		// Starting a run belongs to the case list, so this state offers no CTA.
		it('explains itself when a dataset exists but has never run', () => {
			const { getByTestId, queryByTestId } = render({
				datasets: [dataset('d1')],
				latestRunId: null,
			});

			expect(getByTestId('agent-eval-no-runs')).toBeInTheDocument();
			expect(queryByTestId('agent-evals-generate-button')).not.toBeInTheDocument();
			expect(queryByTestId('agent-eval-results-panel')).not.toBeInTheDocument();
		});
	});

	describe('fetching', () => {
		it('reads the datasets on mount', () => {
			const { store } = render({ datasets: [dataset('d1')] });

			expect(store.fetchDatasets).toHaveBeenCalledWith(PROJECT_ID, AGENT_ID);
		});

		// An unsaved agent has no row yet, so the agent-scoped routes would 404.
		it('fetches nothing while the agent is unsaved', () => {
			const { store } = render({ datasets: [] }, { agentUnsaved: true });

			expect(store.fetchDatasets).not.toHaveBeenCalled();
		});
	});

	// The card only asks; the section owns which dataset gets run.
	it('starts a run on the shown dataset when the card asks for one', async () => {
		const { getByTestId, store } = render({
			datasets: [dataset('d1')],
			latestRunId: 'run-7',
		});

		await userEvent.click(getByTestId('stub-rerun'));

		expect(store.startRun).toHaveBeenCalledWith(PROJECT_ID, AGENT_ID, 'd1');
	});
});
