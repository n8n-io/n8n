import { fireEvent } from '@testing-library/vue';
import { describe, expect, it, vi } from 'vitest';

import { createComponentRenderer } from '@/__tests__/render';
import type { EvalVersionEntry } from '../../evalCollections.types';
import VersionsTable from './VersionsTable.vue';

// The "View" link resolves a route to an href via the router. Override only
// `useRouter` with a deterministic resolver; keep the rest of vue-router real
// so components like ConditionalRouterLink (which read RouterLink.props) work.
vi.mock('vue-router', async (importOriginal) => ({
	...(await importOriginal<typeof import('vue-router')>()),
	useRouter: () => ({
		resolve: (to: { name: string; params: Record<string, string> }) => ({
			href: `/${to.name}/${to.params.versionId ?? to.params.workflowId}`,
		}),
	}),
}));

const renderComponent = createComponentRenderer(VersionsTable);

// Use spread + explicit null-safe handling so `{ workflowVersionId: null }`
// and `{ lastRun: null }` overrides aren't swallowed by `??` fallbacks.
const baseVersion = (overrides: Partial<EvalVersionEntry> = {}): EvalVersionEntry => ({
	workflowVersionId: 'v1',
	label: 'baseline',
	sourceLabel: 'Published v1 · May 5',
	isCurrent: false,
	lastRun: {
		testRunId: 'run-1',
		runAt: '2026-05-12T10:00:00Z',
		status: 'completed',
		avgScore: 0.8,
		isBest: false,
		isCritical: false,
	},
	...overrides,
});

describe('VersionsTable', () => {
	it('renders a row per version with label + source', () => {
		const { container, getAllByTestId } = renderComponent({
			props: {
				versions: [
					baseVersion({ workflowVersionId: 'v1', label: 'baseline' }),
					baseVersion({ workflowVersionId: 'v2', label: 'tone-tuned' }),
				],
				selectedVersionIds: new Set<string>(),
				datasetLabel: 'Q&A v1',
				workflowId: 'wf-1',
			},
		});
		expect(getAllByTestId('versions-table-row')).toHaveLength(2);
		expect(container.textContent).toContain('baseline');
		expect(container.textContent).toContain('tone-tuned');
	});

	it('renders the best pill when isBest is true', () => {
		const { container } = renderComponent({
			props: {
				versions: [
					baseVersion({
						lastRun: {
							testRunId: 'run-1',
							runAt: '2026-05-12T10:00:00Z',
							status: 'completed',
							avgScore: 0.95,
							isBest: true,
							isCritical: false,
						},
					}),
				],
				selectedVersionIds: new Set<string>(),
				datasetLabel: 'Q&A v1',
				workflowId: 'wf-1',
			},
		});
		expect(container.querySelector('[data-test-id="versions-table-row-best"]')).not.toBeNull();
		expect(container.querySelector('[data-test-id="versions-table-row-low"]')).toBeNull();
	});

	it('renders the low pill when isCritical is true', () => {
		const { container } = renderComponent({
			props: {
				versions: [
					baseVersion({
						lastRun: {
							testRunId: 'run-1',
							runAt: '2026-05-12T10:00:00Z',
							status: 'completed',
							avgScore: 0.4,
							isBest: false,
							isCritical: true,
						},
					}),
				],
				selectedVersionIds: new Set<string>(),
				datasetLabel: 'Q&A v1',
				workflowId: 'wf-1',
			},
		});
		expect(container.querySelector('[data-test-id="versions-table-row-low"]')).not.toBeNull();
		expect(container.querySelector('[data-test-id="versions-table-row-best"]')).toBeNull();
	});

	it('renders "no run yet" badge for unevaluated rows', () => {
		const { container } = renderComponent({
			props: {
				versions: [baseVersion({ lastRun: null })],
				selectedVersionIds: new Set<string>(),
				datasetLabel: 'Q&A v1',
				workflowId: 'wf-1',
			},
		});
		expect(container.textContent).toMatch(/no run yet/i);
	});

	it('emits toggle-version when a row is clicked', async () => {
		const { container, emitted } = renderComponent({
			props: {
				versions: [baseVersion({ workflowVersionId: 'v1' })],
				selectedVersionIds: new Set<string>(),
				datasetLabel: 'Q&A v1',
				workflowId: 'wf-1',
			},
		});

		const row = container.querySelector('[data-test-id="versions-table-row"]');
		if (row) await fireEvent.click(row);

		expect(emitted()['toggle-version']).toBeTruthy();
		expect(emitted()['toggle-version']?.[0]).toEqual(['v1']);
	});

	it('View links to the version in a new tab without toggling the row', async () => {
		const { container, emitted } = renderComponent({
			props: {
				versions: [baseVersion({ workflowVersionId: 'v1' })],
				selectedVersionIds: new Set<string>(),
				datasetLabel: 'Q&A v1',
				workflowId: 'wf-1',
			},
		});

		const view = container.querySelector<HTMLAnchorElement>(
			'[data-test-id="versions-table-row-view"]',
		);
		expect(view?.tagName).toBe('A');
		expect(view?.getAttribute('target')).toBe('_blank');
		// Versioned row → workflow-history route for that snapshot.
		expect(view?.getAttribute('href')).toContain('v1');

		if (view) await fireEvent.click(view);
		// Row click should NOT have fired — `.stop` modifier on the View link.
		expect(emitted()['toggle-version']).toBeUndefined();
	});

	it('View for the "Current draft" row links to the workflow editor', () => {
		const { container } = renderComponent({
			props: {
				versions: [baseVersion({ workflowVersionId: null, label: 'Current draft' })],
				selectedVersionIds: new Set<string>(),
				datasetLabel: 'Q&A v1',
				workflowId: 'wf-1',
			},
		});

		const view = container.querySelector<HTMLAnchorElement>(
			'[data-test-id="versions-table-row-view"]',
		);
		// Draft row has no version id → falls back to the workflow route (wf-1).
		expect(view?.getAttribute('href')).toContain('wf-1');
	});

	it('marks the "Current draft" row with the __draft__ key', async () => {
		const { container, emitted } = renderComponent({
			props: {
				versions: [
					baseVersion({
						workflowVersionId: null,
						label: 'Current draft',
						isCurrent: true,
						lastRun: null,
					}),
				],
				selectedVersionIds: new Set<string>(),
				datasetLabel: 'Q&A v1',
				workflowId: 'wf-1',
			},
		});

		const row = container.querySelector('[data-test-id="versions-table-row"]');
		if (row) await fireEvent.click(row);

		expect(emitted()['toggle-version']?.[0]).toEqual(['__draft__']);
	});
});
