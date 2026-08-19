import { createTestingPinia } from '@pinia/testing';
import { waitFor } from '@testing-library/vue';
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
	props: { workflowId: 'wf-1', collectionId: 'col-1', ready: true },
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

	it('generates insights once ready and renders the three takeaways', async () => {
		const { container } = renderComponent();

		await waitFor(() =>
			expect(store.generateInsights).toHaveBeenCalledWith('wf-1', 'col-1', false),
		);
		await waitFor(() => expect(container.textContent).toContain('B wins'));
		expect(container.textContent).toContain('A slipped');
		expect(container.textContent).toContain('Try C');
	});

	it('waits for runs to settle: no generation until ready flips true', async () => {
		const { rerender } = renderComponent({ props: { ready: false } });

		// Runs still in flight → no generation attempt (would 400 on <2 completed).
		await new Promise((resolve) => setTimeout(resolve, 0));
		expect(store.generateInsights).not.toHaveBeenCalled();

		// The last run lands → ready flips true → insights generate without a click.
		await rerender({ ready: true });
		await waitFor(() =>
			expect(store.generateInsights).toHaveBeenCalledWith('wf-1', 'col-1', false),
		);
	});

	it('renders nothing while never ready and nothing cached (no empty shell)', async () => {
		const { container } = renderComponent({ props: { ready: false } });

		// A collection whose runs never settle shows no card at all — not a
		// header-only shell with no body and nothing to click.
		await new Promise((resolve) => setTimeout(resolve, 0));
		expect(container.querySelector('[data-test-id="compare-ai-insights"]')).toBeNull();
	});

	it('uses cached insights without a manual regenerate affordance', async () => {
		store.$patch({ insightsByCollectionId: { 'col-1': INSIGHTS } });
		const { container, queryByTestId } = renderComponent();

		// cached → renders without a mount fetch
		await waitFor(() => expect(container.textContent).toContain('B wins'));
		expect(store.generateInsights).not.toHaveBeenCalled();
		// no on-demand regeneration is exposed
		expect(queryByTestId('compare-ai-insights-regenerate')).toBeNull();
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
