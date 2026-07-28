import { createTestingPinia } from '@pinia/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { createComponentRenderer } from '@/__tests__/render';

import type { EvalCollectionRunStatus } from '../../evalCollections.types';
import type {
	EvaluationCollectionDetail,
	EvaluationCollectionRecord,
} from '../../evalCollections.types';
import CollectionCard from './CollectionCard.vue';

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

const run = (status: EvalCollectionRunStatus, index: number) => ({
	testRunId: `run-${index}`,
	workflowVersionId: `v${index}`,
	status,
	runAt: '2026-05-12T10:00:00Z',
	completedAt: status === 'completed' ? '2026-05-12T10:05:00Z' : null,
	avgScore: status === 'completed' ? 0.8 : null,
	metrics: status === 'completed' ? { helpfulness: 0.8 } : null,
});

const detail = (statuses: EvalCollectionRunStatus[]): EvaluationCollectionDetail => ({
	...COLLECTION,
	runs: statuses.map((status, index) => run(status, index)),
});

const renderComponent = createComponentRenderer(CollectionCard, {
	global: {
		plugins: [createTestingPinia({ createSpy: vi.fn })],
	},
	props: { workflowId: 'wf-1' },
});

describe('CollectionCard', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('shows a distinct running indicator with progress while runs are in flight', () => {
		const { getByTestId, queryByTestId } = renderComponent({
			props: { collection: COLLECTION, detail: detail(['completed', 'running']) },
		});

		const indicator = getByTestId('eval-running-indicator');
		expect(indicator).toBeTruthy();
		// One of two versions has settled.
		expect(indicator.textContent).toContain('1/2');
		expect(indicator.querySelector('[data-icon="spinner"]')).toBeTruthy();
		// The running state must not read as a settled result.
		expect(queryByTestId('eval-running-indicator')?.textContent).not.toContain('Done');
	});

	it('shows the Done badge and no running indicator once every run has settled', () => {
		const { container, queryByTestId } = renderComponent({
			props: { collection: COLLECTION, detail: detail(['completed', 'completed']) },
		});

		expect(queryByTestId('eval-running-indicator')).toBeNull();
		expect(container.textContent).toContain('Done');
	});

	it('shows the Failed badge (not the running indicator) when every run errored', () => {
		const { container, queryByTestId } = renderComponent({
			props: { collection: COLLECTION, detail: detail(['error', 'cancelled']) },
		});

		expect(queryByTestId('eval-running-indicator')).toBeNull();
		expect(container.textContent).toContain('Failed');
	});

	it('shows neither indicator nor badge while detail is still loading', () => {
		const { container, queryByTestId } = renderComponent({
			props: { collection: COLLECTION, detail: null },
		});

		expect(queryByTestId('eval-running-indicator')).toBeNull();
		expect(container.textContent).not.toContain('Done');
		expect(container.textContent).not.toContain('Failed');
	});
});
