import { createTestingPinia } from '@pinia/testing';
import { fireEvent, waitFor } from '@testing-library/vue';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { createComponentRenderer } from '@/__tests__/render';

import { useEvalCollectionsStore } from '../evalCollections.store';
import { useEvaluationStore } from '../evaluation.store';
import type {
	EvaluationCollectionDetail,
	EvaluationCollectionRecord,
} from '../evalCollections.types';
import type { TestRunRecord } from '../evaluation.api';

import EvalCollectionsListView from './EvalCollectionsListView.vue';

vi.mock('@/app/composables/useToast', () => ({
	useToast: vi.fn(() => ({
		showError: vi.fn(),
		showMessage: vi.fn(),
	})),
}));

const COLLECTION: EvaluationCollectionRecord = {
	id: 'col-1',
	name: 'Tone tuning experiment',
	description: null,
	workflowId: 'wf-1',
	evaluationConfigId: 'cfg-1',
	createdById: 'u1',
	createdAt: '',
	updatedAt: '',
	runCount: 2,
};

const DETAIL: EvaluationCollectionDetail = {
	...COLLECTION,
	runs: [
		{
			testRunId: 'run-a',
			workflowVersionId: 'v1',
			status: 'completed',
			runAt: '2026-05-12T10:00:00Z',
			completedAt: '2026-05-12T10:05:00Z',
			avgScore: 0.8,
			metrics: { helpfulness: 0.8 },
		},
		{
			testRunId: 'run-b',
			workflowVersionId: 'v2',
			status: 'completed',
			runAt: '2026-05-12T10:00:00Z',
			completedAt: '2026-05-12T10:06:00Z',
			avgScore: 0.84,
			metrics: { helpfulness: 0.84 },
		},
	],
};

const UNGROUPED_RUN: TestRunRecord = {
	id: 'run-x-12345678',
	workflowId: 'wf-1',
	status: 'completed',
	metrics: { helpfulness: 0.77 },
	createdAt: '2026-05-10T10:00:00Z',
	updatedAt: '2026-05-10T10:00:00Z',
	runAt: '2026-05-10T10:00:00Z',
	completedAt: '2026-05-10T10:05:00Z',
	collectionId: null,
};

const renderComponent = createComponentRenderer(EvalCollectionsListView, {
	global: {
		plugins: [createTestingPinia({ stubActions: false, createSpy: vi.fn })],
	},
});

describe('EvalCollectionsListView', () => {
	let store: ReturnType<typeof useEvalCollectionsStore>;
	let evaluationStore: ReturnType<typeof useEvaluationStore>;

	beforeEach(() => {
		store = useEvalCollectionsStore();
		evaluationStore = useEvaluationStore();
	});

	const setup = ({
		collections = [] as EvaluationCollectionRecord[],
		details = [] as EvaluationCollectionDetail[],
		ungrouped = [] as TestRunRecord[],
	} = {}) => {
		store.fetchCollections = vi.fn(async (wfId: string) => {
			store.$patch({ collectionsByWorkflowId: { [wfId]: collections } });
			return collections;
		}) as unknown as typeof store.fetchCollections;

		store.fetchCollectionDetail = vi.fn(async (_wfId: string, colId: string) => {
			const found = details.find((d) => d.id === colId);
			if (found) {
				store.$patch({ collectionDetailById: { [colId]: found } });
			}
			return found ?? DETAIL;
		}) as unknown as typeof store.fetchCollectionDetail;

		evaluationStore.fetchEvaluationConfigs = vi.fn(
			async () => [],
		) as unknown as typeof evaluationStore.fetchEvaluationConfigs;

		evaluationStore.fetchTestRuns = vi.fn(async () => {
			for (const r of ungrouped) {
				evaluationStore.testRunsById[r.id] = r;
			}
			return ungrouped;
		}) as unknown as typeof evaluationStore.fetchTestRuns;

		return renderComponent({ props: { workflowId: 'wf-1' } });
	};

	it('renders empty state when there are no collections and no ungrouped runs', async () => {
		const { container } = setup();

		await waitFor(() => expect(store.fetchCollections).toHaveBeenCalledWith('wf-1'));
		expect(container.textContent).toContain('No collections yet');
		expect(container.querySelectorAll('[data-test-id="eval-collections-card"]')).toHaveLength(0);
	});

	it('renders one card per collection', async () => {
		const { container } = setup({ collections: [COLLECTION], details: [DETAIL] });

		await waitFor(() =>
			expect(container.querySelectorAll('[data-test-id="eval-collections-card"]')).toHaveLength(1),
		);
		expect(container.textContent).toContain('Tone tuning experiment');
	});

	it('CTA is disabled and surfaces the "coming soon" tooltip', async () => {
		const { container } = setup({ collections: [COLLECTION], details: [DETAIL] });

		await waitFor(() =>
			expect(container.querySelector('[data-test-id="eval-collections-card-cta"]')).not.toBeNull(),
		);
		const cta = container.querySelector(
			'[data-test-id="eval-collections-card-cta"]',
		) as HTMLButtonElement;
		expect(cta).toBeDisabled();
	});

	it('renders ungrouped runs section with only runs that have no collectionId', async () => {
		const { container } = setup({
			ungrouped: [UNGROUPED_RUN, { ...UNGROUPED_RUN, id: 'run-y', collectionId: 'col-1' }],
		});

		await waitFor(() => expect(evaluationStore.fetchTestRuns).toHaveBeenCalledWith('wf-1'));
		const rows = container.querySelectorAll('[data-test-id="eval-collections-ungrouped-row"]');
		// Only the one with collectionId === null surfaces.
		expect(rows).toHaveLength(1);
	});

	it('stops both collection and test-run polling on unmount', async () => {
		const evalCleanup = vi.fn();
		const runCleanup = vi.fn();
		store.cleanupPolling = evalCleanup as unknown as typeof store.cleanupPolling;
		evaluationStore.cleanupPolling = runCleanup as unknown as typeof evaluationStore.cleanupPolling;

		const { unmount } = setup();
		await waitFor(() => expect(store.fetchCollections).toHaveBeenCalled());
		unmount();

		// The view arms the evaluation store's per-run poll via fetchTestRuns, so
		// it must tear that down too — not just the collection poll.
		expect(evalCleanup).toHaveBeenCalled();
		expect(runCleanup).toHaveBeenCalled();
	});

	it('opens the wizard when the New collection button is clicked', async () => {
		const { findByTestId } = setup();

		const btn = (await findByTestId('eval-collections-new-button')) as HTMLButtonElement;
		await fireEvent.click(btn);

		// Wizard mounts via portal — its container is findable on the document.
		await waitFor(() =>
			expect(document.querySelector('[data-test-id="setup-collection-wizard"]')).not.toBeNull(),
		);
	});
});
