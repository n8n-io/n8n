import { createTestingPinia } from '@pinia/testing';
import { waitFor } from '@testing-library/vue';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { createComponentRenderer } from '@/__tests__/render';
import { VIEWS } from '@/app/constants';

import { useEvalCollectionsStore } from '../evalCollections.store';
import type { EvaluationCollectionDetail } from '../evalCollections.types';
import CompareCollectionView from './CompareCollectionView.vue';

const routerReplace = vi.fn();
vi.mock('vue-router', async (importOriginal) => ({
	...(await importOriginal<typeof import('vue-router')>()),
	useRouter: () => ({ push: vi.fn(), replace: routerReplace }),
}));

vi.mock('@/app/composables/useToast', () => ({
	useToast: vi.fn(() => ({ showError: vi.fn(), showMessage: vi.fn() })),
}));

vi.mock('@/app/stores/posthog.store', () => ({
	usePostHog: () => ({ waitForFeatureFlags: vi.fn(async () => {}) }),
}));

const flagState = { enabled: true };
vi.mock('../composables/useEvalCollectionsFlag', () => ({
	useEvalCollectionsFlag: () => ({
		get value() {
			return flagState.enabled;
		},
	}),
}));

// Unlicensed → the child AiInsightsCard hides itself and never hits the network.
vi.mock('../composables/useEvaluationsLicense', () => ({
	useEvaluationsLicense: () => ({
		isLicensed: { value: false },
		isResolved: { value: true },
		ensureLicenseLoaded: vi.fn(async () => {}),
	}),
}));

const DETAIL: EvaluationCollectionDetail = {
	id: 'col-1',
	name: 'Tone tuning experiment',
	description: null,
	workflowId: 'wf-1',
	evaluationConfigId: 'cfg-1',
	createdById: 'u1',
	createdAt: '',
	updatedAt: '',
	runCount: 2,
	runs: [
		{
			testRunId: 'run-a',
			workflowVersionId: 'v1',
			status: 'completed',
			runAt: null,
			completedAt: null,
			avgScore: 0.7,
			metrics: { helpfulness: 0.7 },
		},
		{
			testRunId: 'run-b',
			workflowVersionId: 'v2',
			status: 'completed',
			runAt: null,
			completedAt: null,
			avgScore: 0.9,
			metrics: { helpfulness: 0.9 },
		},
	],
};

const renderComponent = createComponentRenderer(CompareCollectionView, {
	global: {
		plugins: [createTestingPinia({ stubActions: false, createSpy: vi.fn })],
	},
	props: { workflowId: 'wf-1', collectionId: 'col-1' },
});

describe('CompareCollectionView', () => {
	let store: ReturnType<typeof useEvalCollectionsStore>;

	beforeEach(() => {
		flagState.enabled = true;
		routerReplace.mockClear();
		store = useEvalCollectionsStore();
		store.stopPolling = vi.fn() as unknown as typeof store.stopPolling;
		// Hard-replace the shared testing pinia's maps so a prior test's cached
		// detail doesn't leak in (object-form `$patch` deep-merges stale keys).
		store.$patch((state) => {
			state.collectionDetailById = {};
			state.loadingDetail = {};
		});
	});

	it('redirects to the evaluations list when the flag is off', async () => {
		flagState.enabled = false;
		store.fetchCollectionDetail = vi.fn() as unknown as typeof store.fetchCollectionDetail;

		renderComponent();

		await waitFor(() =>
			expect(routerReplace).toHaveBeenCalledWith({
				name: VIEWS.EVALUATION_EDIT,
				params: { workflowId: 'wf-1' },
			}),
		);
		expect(store.fetchCollectionDetail).not.toHaveBeenCalled();
	});

	it('shows the loading skeleton until the detail resolves', () => {
		store.$patch((state) => {
			state.loadingDetail = { 'col-1': true };
		});
		store.fetchCollectionDetail = vi.fn(
			async () => new Promise(() => {}),
		) as unknown as typeof store.fetchCollectionDetail;

		const { container } = renderComponent();

		expect(container.querySelector('[data-test-id="compare-loading"]')).not.toBeNull();
	});

	it('renders the header and hero chart once the detail loads', async () => {
		store.fetchCollectionDetail = vi.fn(async () => {
			store.$patch({ collectionDetailById: { 'col-1': DETAIL } });
			return DETAIL;
		}) as unknown as typeof store.fetchCollectionDetail;

		const { container } = renderComponent();

		await waitFor(() =>
			expect(container.querySelector('[data-test-id="compare-header"]')).not.toBeNull(),
		);
		expect(container.querySelector('[data-test-id="compare-score-chart"]')).not.toBeNull();
		expect(container.textContent).toContain('Tone tuning experiment');
	});

	it('shows the not-found state when the collection has no detail', async () => {
		store.fetchCollectionDetail = vi.fn(
			async () => undefined,
		) as unknown as typeof store.fetchCollectionDetail;

		const { container } = renderComponent();

		await waitFor(() =>
			expect(container.querySelector('[data-test-id="compare-empty"]')).not.toBeNull(),
		);
	});

	it('shows the not-found state when the collection 404s, even with cached detail', async () => {
		// Detail is cached (e.g. pre-fetched by the list), then the collection is
		// deleted server-side → the refresh 404s and stale metrics must not persist.
		store.$patch({ collectionDetailById: { 'col-1': DETAIL } });
		store.fetchCollectionDetail = vi.fn(async () => {
			throw Object.assign(new Error('not found'), { httpStatusCode: 404 });
		}) as unknown as typeof store.fetchCollectionDetail;

		const { container } = renderComponent();

		await waitFor(() =>
			expect(container.querySelector('[data-test-id="compare-empty"]')).not.toBeNull(),
		);
		expect(container.querySelector('[data-test-id="compare-header"]')).toBeNull();
	});

	it('keeps cached detail on a transient (non-404) load failure', async () => {
		store.$patch({ collectionDetailById: { 'col-1': DETAIL } });
		store.fetchCollectionDetail = vi.fn(async () => {
			throw Object.assign(new Error('network'), { httpStatusCode: 500 });
		}) as unknown as typeof store.fetchCollectionDetail;

		const { container } = renderComponent();

		await waitFor(() =>
			expect(container.querySelector('[data-test-id="compare-header"]')).not.toBeNull(),
		);
		expect(container.querySelector('[data-test-id="compare-empty"]')).toBeNull();
	});

	it('stops the collection poll on unmount', async () => {
		store.fetchCollectionDetail = vi.fn(async () => {
			store.$patch({ collectionDetailById: { 'col-1': DETAIL } });
			return DETAIL;
		}) as unknown as typeof store.fetchCollectionDetail;

		const { unmount } = renderComponent();
		await waitFor(() => expect(store.fetchCollectionDetail).toHaveBeenCalled());
		unmount();

		expect(store.stopPolling).toHaveBeenCalledWith('col-1');
	});
});
