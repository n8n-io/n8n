import { createTestingPinia } from '@pinia/testing';
import { fireEvent, waitFor } from '@testing-library/vue';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { createComponentRenderer } from '@/__tests__/render';

import type { CompareVersion } from '../../composables/useCompareData';
import { useEvalCollectionsStore } from '../../evalCollections.store';
import CompareHeader from './CompareHeader.vue';

const { showError } = vi.hoisted(() => ({ showError: vi.fn() }));
vi.mock('@/app/composables/useToast', () => ({
	useToast: () => ({ showError, showMessage: vi.fn() }),
}));

const version = (
	overrides: Partial<CompareVersion> & Pick<CompareVersion, 'index'>,
): CompareVersion => ({
	testRunId: `run-${overrides.index}`,
	workflowVersionId: `v${overrides.index}`,
	letter: String.fromCharCode(65 + overrides.index),
	label: `v${overrides.index}`,
	status: 'completed',
	avgScore: 0.8,
	...overrides,
});

const renderComponent = createComponentRenderer(CompareHeader, {
	global: {
		plugins: [createTestingPinia({ createSpy: vi.fn })],
	},
	props: { workflowId: 'wf-1', collectionId: 'col-1' },
});

describe('CompareHeader', () => {
	let store: ReturnType<typeof useEvalCollectionsStore>;

	beforeEach(() => {
		vi.clearAllMocks();
		store = useEvalCollectionsStore();
	});

	it('renders the collection name and one chip per version', () => {
		const { container, getByText } = renderComponent({
			props: {
				collectionName: 'Tone tuning experiment',
				versions: [version({ index: 0 }), version({ index: 1 })],
				bestVersionIndex: 1,
			},
		});

		expect(getByText('Tone tuning experiment')).toBeTruthy();
		expect(container.querySelectorAll('[data-test-id="compare-header-version"]')).toHaveLength(2);
	});

	it('flags the best version once', () => {
		const { getAllByText } = renderComponent({
			props: {
				collectionName: 'Exp',
				versions: [version({ index: 0 }), version({ index: 1 }), version({ index: 2 })],
				bestVersionIndex: 2,
			},
		});

		expect(getAllByText('★ best')).toHaveLength(1);
	});

	it('shows a distinct running indicator with progress while a version is still in flight', () => {
		const { getByTestId } = renderComponent({
			props: {
				collectionName: 'Exp',
				versions: [
					version({ index: 0, status: 'completed' }),
					version({ index: 1, status: 'running', avgScore: null }),
				],
				bestVersionIndex: null,
			},
		});

		const indicator = getByTestId('eval-running-indicator');
		expect(indicator).toBeTruthy();
		// One of two versions has settled, so it reads "1/2".
		expect(indicator.textContent).toContain('1/2');
		expect(indicator.querySelector('[data-icon="spinner"]')).toBeTruthy();
	});

	it('hides the running indicator when the run set has settled', () => {
		const { queryByTestId, container } = renderComponent({
			props: {
				collectionName: 'Exp',
				versions: [version({ index: 0 }), version({ index: 1 })],
				bestVersionIndex: 1,
			},
		});

		expect(queryByTestId('eval-running-indicator')).toBeNull();
		expect(container.textContent).toContain('Done');
	});

	it('shows the failed badge (not the running indicator) when every run errored', () => {
		const { container, queryByTestId } = renderComponent({
			props: {
				collectionName: 'Exp',
				versions: [
					version({ index: 0, status: 'error', avgScore: null }),
					version({ index: 1, status: 'cancelled', avgScore: null }),
				],
				bestVersionIndex: null,
			},
		});

		expect(queryByTestId('eval-running-indicator')).toBeNull();
		expect(container.textContent).toContain('Failed');
		expect(container.textContent).not.toContain('Done');
	});

	describe('re-run', () => {
		it('offers the re-run button when the collection is done', () => {
			const { getByTestId } = renderComponent({
				props: {
					collectionName: 'Exp',
					versions: [version({ index: 0 }), version({ index: 1 })],
					bestVersionIndex: 1,
				},
			});

			expect(getByTestId('compare-rerun')).toBeTruthy();
		});

		it('offers the re-run button when every run failed', () => {
			const { getByTestId } = renderComponent({
				props: {
					collectionName: 'Exp',
					versions: [version({ index: 0, status: 'error', avgScore: null })],
					bestVersionIndex: null,
				},
			});

			expect(getByTestId('compare-rerun')).toBeTruthy();
		});

		it('hides the re-run button while runs are still in flight', () => {
			const { queryByTestId } = renderComponent({
				props: {
					collectionName: 'Exp',
					versions: [version({ index: 0, status: 'running', avgScore: null })],
					bestVersionIndex: null,
				},
			});

			expect(queryByTestId('compare-rerun')).toBeNull();
		});

		it('calls the store re-run action with the workflow + collection ids on click', async () => {
			const { getByTestId } = renderComponent({
				props: {
					collectionName: 'Exp',
					versions: [version({ index: 0 })],
					bestVersionIndex: 0,
				},
			});

			await fireEvent.click(getByTestId('compare-rerun'));

			expect(store.rerunCollection).toHaveBeenCalledWith('wf-1', 'col-1');
		});

		it('surfaces an error toast when the re-run fails', async () => {
			store.rerunCollection = vi.fn(async () => {
				throw new Error('already in progress');
			}) as unknown as typeof store.rerunCollection;

			const { getByTestId } = renderComponent({
				props: {
					collectionName: 'Exp',
					versions: [version({ index: 0 })],
					bestVersionIndex: 0,
				},
			});

			await fireEvent.click(getByTestId('compare-rerun'));

			await waitFor(() => expect(showError).toHaveBeenCalled());
		});
	});
});
