import { createTestingPinia } from '@pinia/testing';
import { fireEvent, waitFor } from '@testing-library/vue';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { createComponentRenderer } from '@/__tests__/render';
import type { EvaluationConfigDto } from '@n8n/api-types';
import { useEvalCollectionsStore } from '../../evalCollections.store';
import { useEvaluationStore } from '../../evaluation.store';
import type { EvalVersionsResponse, EvaluationCollectionRecord } from '../../evalCollections.types';

import SetupCollectionWizard from './SetupCollectionWizard.vue';

vi.mock('@/app/composables/useToast', () => ({
	useToast: vi.fn(() => ({
		showError: vi.fn(),
		showMessage: vi.fn(),
	})),
}));

// Minimal shape of the fields the wizard reads (`id`, `name`, `metrics[].name`).
// Cast to the full DTO — test code may use `as` (see AGENTS.md).
const CONFIGS = [
	{
		id: 'cfg-1',
		name: 'Q&A v1',
		status: 'valid',
		metrics: [
			{ name: 'Helpfulness', type: 'string_similarity' },
			{ name: 'Relevance', type: 'string_similarity' },
		],
	},
] as unknown as EvaluationConfigDto[];

const VERSIONS: EvalVersionsResponse = {
	evaluationConfigId: 'cfg-1',
	versions: [
		{
			workflowVersionId: 'v1',
			label: 'baseline',
			sourceLabel: 'Published v1 · May 5',
			isCurrent: false,
			lastRun: {
				testRunId: 'run-a',
				runAt: '2026-05-12T10:00:00Z',
				status: 'completed',
				avgScore: 0.8,
				isBest: false,
				isCritical: false,
			},
		},
		{
			workflowVersionId: 'v2',
			label: 'tone-tuned',
			sourceLabel: 'Published v2 · May 7',
			isCurrent: false,
			lastRun: {
				testRunId: 'run-b',
				runAt: '2026-05-13T10:00:00Z',
				status: 'completed',
				avgScore: 0.84,
				isBest: true,
				isCritical: false,
			},
		},
		{
			workflowVersionId: null,
			label: 'Current draft',
			sourceLabel: 'Unpublished',
			isCurrent: true,
			lastRun: null,
		},
	],
};

const renderComponent = createComponentRenderer(SetupCollectionWizard, {
	global: {
		plugins: [createTestingPinia({ stubActions: false, createSpy: vi.fn })],
	},
});

describe('SetupCollectionWizard', () => {
	let store: ReturnType<typeof useEvalCollectionsStore>;
	let evaluationStore: ReturnType<typeof useEvaluationStore>;

	beforeEach(() => {
		// `createTestingPinia` activates a pinia automatically — the store getters
		// return those instances. We override actions per-test to drive state.
		store = useEvalCollectionsStore();
		evaluationStore = useEvaluationStore();
	});

	const setup = (overrides: Partial<Record<string, unknown>> = {}) => {
		// Evaluation configs are owned by the evaluation store now.
		evaluationStore.fetchEvaluationConfigs = vi.fn(async (wfId: string) => {
			evaluationStore.evaluationConfigsByWorkflowId[wfId] = CONFIGS;
			return CONFIGS;
		}) as unknown as typeof evaluationStore.fetchEvaluationConfigs;

		store.fetchEvalVersions = vi.fn(async (_wfId: string, configId: string) => {
			store.$patch({
				versionsByConfigId: { [configId]: VERSIONS },
			} as Record<string, unknown>);
			return VERSIONS;
		}) as unknown as typeof store.fetchEvalVersions;

		store.createCollection = vi.fn(
			async () =>
				({
					id: 'col-new',
					name: 'X',
					description: null,
					workflowId: 'wf-1',
					evaluationConfigId: 'cfg-1',
					createdById: 'u1',
					createdAt: '',
					updatedAt: '',
					runCount: 0,
					runsStartedIds: [],
				}) as EvaluationCollectionRecord & { runsStartedIds: string[] },
		) as unknown as typeof store.createCollection;

		return renderComponent({
			props: { open: true, workflowId: 'wf-1' },
			...overrides,
		});
	};

	it('opens and loads configs from the evaluation store', async () => {
		setup();
		await waitFor(() =>
			expect(evaluationStore.fetchEvaluationConfigs).toHaveBeenCalledWith('wf-1'),
		);
	});

	it('renders the dataset picker and a disabled submit CTA when open', async () => {
		const { findByTestId } = setup();

		// `findByTestId` is portal-aware — it queries the whole document, so
		// it works even though N8nDialog renders into a teleported portal.
		const picker = await findByTestId('dataset-picker');
		expect(picker).not.toBeNull();

		const submit = (await findByTestId('setup-collection-wizard-submit')) as HTMLButtonElement;
		expect(submit).toBeDisabled();
	});

	it('emits update:open(false) when Cancel is clicked', async () => {
		const { findByTestId, emitted } = setup();
		const cancel = (await findByTestId('setup-collection-wizard-cancel')) as HTMLButtonElement;
		await fireEvent.click(cancel);

		expect(emitted()['update:open']).toBeTruthy();
		expect(emitted()['update:open']?.[0]).toEqual([false]);
	});
});
