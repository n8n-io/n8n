import { createTestingPinia } from '@pinia/testing';
import { fireEvent, waitFor } from '@testing-library/vue';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { createComponentRenderer } from '@/__tests__/render';

import { useEvalCollectionsStore } from '../../evalCollections.store';
import type { AiInsightsResponse } from '../../evalCollections.types';
import AiInsightsCard from './AiInsightsCard.vue';

const licenseState = { isLicensed: true };
vi.mock('../../composables/useEvaluationsLicense', () => ({
	useEvaluationsLicense: () => ({
		isLicensed: {
			get value() {
				return licenseState.isLicensed;
			},
		},
		isResolved: { value: true },
		ensureLicenseLoaded: vi.fn(async () => {}),
	}),
}));

const INSIGHTS: AiInsightsResponse = {
	generatedAt: '2026-05-12T10:00:00Z',
	modelUsed: 'test-model',
	status: 'ok',
	insights: {
		winner: { versionLabel: 'B', headline: 'B wins', body: 'higher correctness' },
		regressions: [
			{
				versionLabel: 'A',
				metric: 'helpfulness',
				delta: -5,
				headline: 'A slipped',
				body: 'details',
			},
		],
		suggestedNext: { headline: 'Try C', body: 'raise temperature', hypothesis: 'maybe better' },
	},
};

const renderComponent = createComponentRenderer(AiInsightsCard, {
	global: {
		plugins: [createTestingPinia({ stubActions: false, createSpy: vi.fn })],
	},
	props: { workflowId: 'wf-1', collectionId: 'col-1' },
});

describe('AiInsightsCard', () => {
	let store: ReturnType<typeof useEvalCollectionsStore>;

	beforeEach(() => {
		licenseState.isLicensed = true;
		store = useEvalCollectionsStore();
		// The testing pinia is shared across tests — hard-replace the maps so a
		// prior test's cached insights don't satisfy this one's mount fetch.
		// (Object form of `$patch` deep-merges and would leave stale keys.)
		store.$patch((state) => {
			state.insightsByCollectionId = {};
			state.loadingInsights = {};
		});
		store.generateInsights = vi.fn(async () => {
			store.$patch({ insightsByCollectionId: { 'col-1': INSIGHTS } });
			return INSIGHTS;
		}) as unknown as typeof store.generateInsights;
	});

	it('is hidden entirely when the instance is not licensed', async () => {
		licenseState.isLicensed = false;
		const { container } = renderComponent();

		await waitFor(() =>
			expect(container.querySelector('[data-test-id="compare-ai-insights"]')).toBeNull(),
		);
		expect(store.generateInsights).not.toHaveBeenCalled();
	});

	it('generates insights on mount and renders the three takeaways', async () => {
		const { container } = renderComponent();

		await waitFor(() =>
			expect(store.generateInsights).toHaveBeenCalledWith('wf-1', 'col-1', false),
		);
		await waitFor(() => expect(container.textContent).toContain('B wins'));
		expect(container.textContent).toContain('A slipped');
		expect(container.textContent).toContain('Try C');
	});

	it('re-fires the endpoint with forceRegenerate when Regenerate is clicked', async () => {
		store.$patch({ insightsByCollectionId: { 'col-1': INSIGHTS } });
		const { getByTestId } = renderComponent();

		// cached → no mount fetch
		await waitFor(() => expect(getByTestId('compare-ai-insights-regenerate')).toBeTruthy());
		expect(store.generateInsights).not.toHaveBeenCalled();

		await fireEvent.click(getByTestId('compare-ai-insights-regenerate'));
		expect(store.generateInsights).toHaveBeenCalledWith('wf-1', 'col-1', true);
	});

	it('shows the error state when generation fails', async () => {
		store.generateInsights = vi.fn(async () => {
			throw new Error('boom');
		}) as unknown as typeof store.generateInsights;
		const { container } = renderComponent();

		await waitFor(() =>
			expect(container.querySelector('[data-test-id="compare-ai-insights-error"]')).not.toBeNull(),
		);
	});

	it('shows the fallback footer when insights are computed deterministically', async () => {
		store.$patch({
			insightsByCollectionId: { 'col-1': { ...INSIGHTS, status: 'fallback' } },
		});
		const { container } = renderComponent();

		await waitFor(() => expect(container.textContent).toContain('Computed from raw scores'));
	});
});
