import { describe, it, expect, vi, beforeEach } from 'vitest';
import { configure } from '@testing-library/vue';
import { createTestingPinia } from '@pinia/testing';
import userEvent from '@testing-library/user-event';
import { flushPromises } from '@vue/test-utils';
import { ref } from 'vue';

import { createComponentRenderer } from '@/__tests__/render';
import { useAgentEvalsStore } from '../agentEvals.store';
import type {
	AgentEvalColumnMapping,
	AgentEvalDatasetRecord,
	AgentEvalDraftCase,
} from '../agentEvals.types';
import AgentEvalsSection from '../components/AgentEvalsSection.vue';

// Components use `data-testid`; the global setup configures `data-test-id`.
configure({ testIdAttribute: 'data-testid' });

const { showError } = vi.hoisted(() => ({ showError: vi.fn() }));
vi.mock('@n8n/composables/useToast', () => ({
	useToast: () => ({ showError }),
}));

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

vi.mock('../components/AgentEvalChecksPanel.vue', () => ({
	default: {
		name: 'AgentEvalChecksPanel',
		props: ['runId'],
		emits: ['rerun'],
		template: `<div data-testid="agent-eval-checks-panel">{{ runId }}
			<button data-testid="stub-checks-rerun" @click="$emit('rerun')" /></div>`,
	},
}));

vi.mock('../components/AgentEvalsEmptyStatePreview.vue', () => ({
	default: {
		name: 'AgentEvalsEmptyStatePreview',
		props: ['examples', 'loading', 'addingChecks', 'disabled'],
		emits: ['add-example', 'add-checks'],
		template: `<div
			data-testid="agent-evals-empty-state-preview"
			:data-loading="loading"
			:data-disabled="disabled"
		>{{ examples.length }}
			<button data-testid="stub-add-example" @click="$emit('add-example', 'own example')" />
			<button data-testid="stub-add-checks" @click="$emit('add-checks', 2)" /></div>`,
	},
}));

// A real `ref`, not a plain `{ value }` object — the template reads it as a
// bare identifier, which only auto-unwraps for genuine refs. A plain object
// would read as itself (always truthy) instead of its `.value`.
const isFeatureEnabled = ref(false);
vi.mock('@/experiments/testAgentPreview/useTestAgentPreviewExperiment', () => ({
	useTestAgentPreviewExperiment: () => ({ isFeatureEnabled }),
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

const dataTableDataset = (
	id: string,
	dataTableId: string,
	columnMapping: AgentEvalColumnMapping,
): AgentEvalDatasetRecord => ({
	id,
	name: `dataset-${id}`,
	description: null,
	agentId: AGENT_ID,
	columnMapping,
	createdById: null,
	createdAt: '2026-01-01T00:00:00.000Z',
	updatedAt: '2026-01-01T00:00:00.000Z',
	datasetSource: 'data_table',
	datasetRef: { dataTableId },
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
		isFeatureEnabled.value = false;
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

	describe("the experiment's empty-state preview", () => {
		beforeEach(() => {
			isFeatureEnabled.value = true;
		});

		// `generateDraftCases` is called during the initial mount/flush, so its
		// mock must be configured before rendering — too late to set afterwards,
		// unlike the plain `render()` helper's fire-and-forget store actions.
		const renderPreview = async (
			generatedCases: AgentEvalDraftCase[],
			configure?: (store: ReturnType<typeof useAgentEvalsStore>) => void,
			props: Record<string, unknown> = {},
		) => {
			const pinia = createTestingPinia({ stubActions: true });
			const store = useAgentEvalsStore();
			vi.mocked(store.isLoaded).mockReturnValue(true);
			vi.mocked(store.getDatasets).mockReturnValue([]);
			vi.mocked(store.getLatestRunId).mockReturnValue(null);
			vi.mocked(store.isStartingRun).mockReturnValue(false);
			vi.mocked(store.fetchDatasets).mockResolvedValue([]);
			vi.mocked(store.generateDraftCases).mockResolvedValue({ cases: generatedCases });
			configure?.(store);

			const rendered = renderComponent({ pinia, props });
			await flushPromises();
			return { ...rendered, store };
		};

		it('generates a save:false preview instead of the plain CTA when no dataset exists', async () => {
			const { getByTestId, queryByTestId, store } = await renderPreview([
				{ input: 'case 1', whatToCheck: 'check 1', scenario: 'A' },
			]);

			expect(store.generateDraftCases).toHaveBeenCalledWith(PROJECT_ID, AGENT_ID, {
				count: 10,
				save: false,
			});
			expect(getByTestId('agent-evals-empty-state-preview')).toBeInTheDocument();
			expect(queryByTestId('agent-evals-empty-state')).not.toBeInTheDocument();
		});

		// AgentEvalsEmptyStatePreview is mocked above, so this only proves the
		// prop reaches it — the component's own test covers what it does with it.
		it('forwards disabled to the preview for a viewer without agent:update', async () => {
			const { getByTestId } = await renderPreview(
				[{ input: 'case 1', whatToCheck: 'check 1', scenario: 'A' }],
				undefined,
				{ disabled: true },
			);

			expect(getByTestId('agent-evals-empty-state-preview')).toHaveAttribute(
				'data-disabled',
				'true',
			);
		});

		it('shows the empty-state preview with its slider loading right away, instead of blocking the whole section behind a skeleton', async () => {
			const pinia = createTestingPinia({ stubActions: true });
			const store = useAgentEvalsStore();
			vi.mocked(store.isLoaded).mockReturnValue(true);
			vi.mocked(store.getDatasets).mockReturnValue([]);
			vi.mocked(store.getLatestRunId).mockReturnValue(null);
			vi.mocked(store.isStartingRun).mockReturnValue(false);
			vi.mocked(store.fetchDatasets).mockResolvedValue([]);
			let resolveGenerate!: (value: { cases: AgentEvalDraftCase[] }) => void;
			vi.mocked(store.generateDraftCases).mockImplementation(
				async () =>
					await new Promise((resolve) => {
						resolveGenerate = resolve;
					}),
			);

			const { getByTestId, queryByTestId } = renderComponent({ pinia });
			// `fetchDatasets` settles (all `load()` needs to flip `hasSettled`) —
			// the preview generation itself is deliberately left pending.
			await flushPromises();

			expect(queryByTestId('agent-evals-loading')).not.toBeInTheDocument();
			expect(getByTestId('agent-evals-empty-state-preview')).toHaveAttribute(
				'data-loading',
				'true',
			);

			resolveGenerate({ cases: [{ input: 'case 1', whatToCheck: 'check 1', scenario: 'A' }] });
			await flushPromises();

			expect(getByTestId('agent-evals-empty-state-preview')).toHaveAttribute(
				'data-loading',
				'false',
			);
		});

		it('falls back to the plain CTA when the preview generation fails', async () => {
			const pinia = createTestingPinia({ stubActions: true });
			const store = useAgentEvalsStore();
			vi.mocked(store.isLoaded).mockReturnValue(true);
			vi.mocked(store.getDatasets).mockReturnValue([]);
			vi.mocked(store.getLatestRunId).mockReturnValue(null);
			vi.mocked(store.isStartingRun).mockReturnValue(false);
			vi.mocked(store.fetchDatasets).mockResolvedValue([]);
			vi.mocked(store.generateDraftCases).mockRejectedValue(new Error('no model'));

			const { getByTestId, queryByTestId } = renderComponent({ pinia });
			await flushPromises();

			expect(getByTestId('agent-evals-empty-state')).toBeInTheDocument();
			expect(queryByTestId('agent-evals-empty-state-preview')).not.toBeInTheDocument();
		});

		it('commits the preview on "add checks": creates a draft dataset, inserts the picked and self-written cases, then runs', async () => {
			const { getByTestId, store } = await renderPreview(
				[
					{ input: 'case 1', whatToCheck: 'check 1', scenario: 'A' },
					{ input: 'case 2', whatToCheck: 'check 2', scenario: 'B' },
					{ input: 'case 3', whatToCheck: 'check 3', scenario: 'C' },
				],
				(store) => {
					vi.mocked(store.createDraftDataset).mockResolvedValue({
						datasetId: 'committed-1',
						dataTableId: 'dt-committed',
						columnMapping: { input: 'input', criteria: 'criteria' },
					});
					vi.mocked(store.createCase).mockResolvedValue(null);
				},
			);
			// Not read for the commit itself (the create response now carries its own
			// columns), but `load()` re-renders off `getDatasets` afterward, so the
			// just-created dataset has to be there for the post-commit view.
			vi.mocked(store.getDatasets).mockReturnValue([
				dataTableDataset('committed-1', 'dt-committed', { input: 'input', criteria: 'criteria' }),
			]);

			// A fresh "own example" before committing, same as the slider would emit.
			await userEvent.click(getByTestId('stub-add-example'));
			await userEvent.click(getByTestId('stub-add-checks'));
			await flushPromises();

			expect(store.createDraftDataset).toHaveBeenCalledWith(PROJECT_ID, AGENT_ID);
			// Trimmed to the slider's count (2) plus the one self-written example.
			expect(store.createCase).toHaveBeenCalledTimes(3);
			expect(store.createCase).toHaveBeenCalledWith(
				PROJECT_ID,
				expect.objectContaining({ datasetId: 'committed-1' }),
				{ input: 'case 1', whatToCheck: 'check 1' },
			);
			expect(store.createCase).toHaveBeenCalledWith(
				PROJECT_ID,
				expect.objectContaining({ datasetId: 'committed-1' }),
				{ input: 'case 2', whatToCheck: 'check 2' },
			);
			expect(store.createCase).toHaveBeenCalledWith(
				PROJECT_ID,
				expect.objectContaining({ datasetId: 'committed-1' }),
				{ input: 'own example', whatToCheck: '' },
			);
			expect(store.startRun).toHaveBeenCalledWith(PROJECT_ID, AGENT_ID, 'committed-1');
		});

		// The section is reused when the agent switches. The commit must keep using the
		// agent and cases it started with, not whatever the live props and preview hold
		// once the draft dataset request returns.
		it('commits the agent and cases it started with when the agent switches mid-commit', async () => {
			let resolveCreate!: (value: {
				datasetId: string;
				dataTableId: string;
				columnMapping: { input: string; criteria: string };
			}) => void;
			const { getByTestId, rerender, store } = await renderPreview(
				[{ input: 'case of A', whatToCheck: 'check of A', scenario: 'A' }],
				(store) => {
					vi.mocked(store.createDraftDataset).mockImplementation(
						async () =>
							await new Promise((resolve) => {
								resolveCreate = resolve;
							}),
					);
					vi.mocked(store.createCase).mockResolvedValue(null);
				},
			);

			await userEvent.click(getByTestId('stub-add-checks'));
			// Switching agents reloads the section, which clears the preview it held.
			vi.mocked(store.generateDraftCases).mockResolvedValue({
				cases: [{ input: 'case of B', whatToCheck: 'check of B', scenario: 'B' }],
			});
			await rerender({ agentId: 'agent-b' });
			await flushPromises();
			resolveCreate({
				datasetId: 'committed-a',
				dataTableId: 'dt-a',
				columnMapping: { input: 'input', criteria: 'criteria' },
			});
			await flushPromises();

			expect(store.createCase).toHaveBeenCalledWith(
				PROJECT_ID,
				expect.objectContaining({ datasetId: 'committed-a' }),
				{ input: 'case of A', whatToCheck: 'check of A' },
			);
			expect(store.createCase).not.toHaveBeenCalledWith(
				PROJECT_ID,
				expect.anything(),
				expect.objectContaining({ input: 'case of B' }),
			);
			expect(store.startRun).toHaveBeenCalledWith(PROJECT_ID, AGENT_ID, 'committed-a');
			expect(store.startRun).not.toHaveBeenCalledWith(PROJECT_ID, 'agent-b', expect.anything());
		});

		it('does not toast the old agent’s failed commit over the agent now on screen', async () => {
			let rejectCreate!: (error: Error) => void;
			const { getByTestId, rerender, store } = await renderPreview(
				[{ input: 'case of A', whatToCheck: 'check of A', scenario: 'A' }],
				(store) => {
					vi.mocked(store.createDraftDataset).mockImplementation(
						async () =>
							await new Promise((_, reject) => {
								rejectCreate = reject;
							}),
					);
				},
			);

			await userEvent.click(getByTestId('stub-add-checks'));
			await rerender({ agentId: 'agent-b' });
			await flushPromises();
			showError.mockClear();
			rejectCreate(new Error('create failed'));
			await flushPromises();

			expect(showError).not.toHaveBeenCalled();
			expect(store.startRun).not.toHaveBeenCalled();
		});

		it('rolls back the draft dataset when a case fails to save, before the run is ever started', async () => {
			const { getByTestId, store } = await renderPreview(
				[{ input: 'case 1', whatToCheck: 'check 1', scenario: 'A' }],
				(store) => {
					vi.mocked(store.createDraftDataset).mockResolvedValue({
						datasetId: 'committed-1',
						dataTableId: 'dt-committed',
						columnMapping: { input: 'input', criteria: 'criteria' },
					});
					vi.mocked(store.createCase).mockRejectedValue(new Error('row insert failed'));
					vi.mocked(store.deleteDraftDataset).mockResolvedValue(undefined as never);
				},
			);

			await userEvent.click(getByTestId('stub-add-checks'));
			await flushPromises();

			expect(store.deleteDraftDataset).toHaveBeenCalledWith(PROJECT_ID, AGENT_ID, 'committed-1');
			expect(store.startRun).not.toHaveBeenCalled();
		});

		// Once `startRun` has been sent, a failure is ambiguous — the request may
		// have reached the server and seeded a real run before the response itself
		// failed. Rolling back here would delete that run along with the dataset.
		it('does not roll back the dataset when only starting the run fails', async () => {
			const { getByTestId, store } = await renderPreview(
				[{ input: 'case 1', whatToCheck: 'check 1', scenario: 'A' }],
				(store) => {
					vi.mocked(store.createDraftDataset).mockResolvedValue({
						datasetId: 'committed-1',
						dataTableId: 'dt-committed',
						columnMapping: { input: 'input', criteria: 'criteria' },
					});
					vi.mocked(store.createCase).mockResolvedValue(null);
					vi.mocked(store.startRun).mockRejectedValue(new Error('timeout'));
				},
			);

			await userEvent.click(getByTestId('stub-add-checks'));
			await flushPromises();

			expect(store.deleteDraftDataset).not.toHaveBeenCalled();
		});
	});
});
