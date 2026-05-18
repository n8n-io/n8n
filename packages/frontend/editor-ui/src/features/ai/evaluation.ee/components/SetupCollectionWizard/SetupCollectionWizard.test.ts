import { createTestingPinia } from '@pinia/testing';
import { fireEvent, waitFor } from '@testing-library/vue';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { createComponentRenderer } from '@/__tests__/render';
import { useEvalCollectionsStore } from '../../evalCollections.store';
import type { EvalVersionsResponse, EvaluationCollectionRecord } from '../../evalCollections.types';
import type { EvaluationConfigSummary } from '../../evalCollections.api';

import SetupCollectionWizard from './SetupCollectionWizard.vue';

vi.mock('@/app/composables/useToast', () => ({
	useToast: vi.fn(() => ({
		showError: vi.fn(),
		showMessage: vi.fn(),
	})),
}));

const CONFIGS: EvaluationConfigSummary[] = [
	{
		id: 'cfg-1',
		name: 'Q&A v1',
		status: 'valid',
		datasetSource: 'dataTable',
		updatedAt: '2026-05-10T08:00:00Z',
		metrics: [{ name: 'Helpfulness' }, { name: 'Relevance' }],
	},
];

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

	beforeEach(() => {
		// `createTestingPinia` activates a pinia automatically — `useEvalCollectionsStore`
		// returns that store. We override actions per-test to drive state.
		store = useEvalCollectionsStore();
	});

	const setup = (overrides: Partial<Record<string, unknown>> = {}) => {
		store.fetchEvaluationConfigs = vi.fn(async (wfId: string) => {
			// Mirror the real action's side-effect — write into the keyed cache.
			store.$patch({
				configsByWorkflowId: { [wfId]: CONFIGS },
			} as Record<string, unknown>);
			return CONFIGS;
		}) as unknown as typeof store.fetchEvaluationConfigs;

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

	it('opens, loads configs, and shows the dataset picker', async () => {
		setup();
		await waitFor(() => expect(store.fetchEvaluationConfigs).toHaveBeenCalledWith('wf-1'));
	});

	it('keeps the submit CTA disabled until ≥2 versions are selected', async () => {
		const { findByTestId } = setup();

		const cta = (await findByTestId('setup-collection-wizard-submit')) as HTMLButtonElement;
		expect(cta).toBeDisabled();
	});

	it('renders the dataset picker and submit CTA when open', async () => {
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
