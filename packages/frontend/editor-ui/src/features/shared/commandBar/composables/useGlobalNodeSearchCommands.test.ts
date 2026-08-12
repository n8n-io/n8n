import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ref } from 'vue';
import { waitFor } from '@testing-library/vue';
import { createTestingPinia } from '@pinia/testing';
import { setActivePinia } from 'pinia';
import type { NodeSearchHit } from '@n8n/api-types';

import { useGlobalNodeSearchCommands } from './useGlobalNodeSearchCommands';
import { useWorkflowsStore } from '@/app/stores/workflows.store';
import { useNodeTypesStore } from '@/app/stores/nodeTypes.store';
import { usePostHog } from '@/app/stores/posthog.store';
import { useFoldersStore } from '@/features/core/folders/folders.store';
import * as workflowsApi from '@/app/api/workflows';

vi.mock('lodash/debounce', () => ({
	default: (fn: (...args: unknown[]) => unknown) => {
		const wrapped = (...args: unknown[]) => fn(...args);
		wrapped.cancel = vi.fn();
		return wrapped;
	},
}));

vi.mock('@n8n/i18n', async (importOriginal) => ({
	...(await importOriginal()),
	useI18n: () => ({
		baseText: (key: string) => key,
	}),
}));

const resolveMock = vi.fn(() => ({ fullPath: '/resolved/path' }));

vi.mock('vue-router', () => ({
	useRouter: () => ({ resolve: resolveMock }),
	useRoute: () => ({ params: {} }),
	RouterLink: vi.fn(),
}));

vi.mock('@/app/api/workflows', () => ({
	searchWorkflowNodes: vi.fn(),
}));

const makeHit = (overrides: Partial<NodeSearchHit> = {}): NodeSearchHit => ({
	workflowId: 'wf-other',
	workflowName: 'Billing sync',
	homeProject: { id: 'p1', name: 'Acme Corp', type: 'team', icon: null },
	parentFolder: null,
	nodeId: 'node-1',
	nodeName: 'Fetch orders',
	nodeType: 'n8n-nodes-base.httpRequest',
	disabled: false,
	isSticky: false,
	matchedField: 'name',
	snippet: 'Fetch orders',
	...overrides,
});

const searchWorkflowNodesMock = vi.mocked(workflowsApi.searchWorkflowNodes);

describe('useGlobalNodeSearchCommands', () => {
	let posthogStore: ReturnType<typeof usePostHog>;

	const setup = () => {
		const lastQuery = ref('');
		const activeNodeId = ref<string | null>(null);
		const group = useGlobalNodeSearchCommands({ lastQuery, activeNodeId });
		return { group, lastQuery, activeNodeId };
	};

	beforeEach(() => {
		vi.clearAllMocks();
		setActivePinia(createTestingPinia({ stubActions: false }));

		// Navigation is a full page load; jsdom cannot perform it, so capture the
		// assignment instead of letting it log "Not implemented: navigation".
		Object.defineProperty(window, 'location', {
			configurable: true,
			writable: true,
			value: { href: '' },
		});

		posthogStore = usePostHog();
		vi.spyOn(posthogStore, 'isVariantEnabled').mockReturnValue(true);

		// The document store falls back to the workflows store when nothing is provided.
		useWorkflowsStore().workflowId = 'wf-current';

		const nodeTypesStore = useNodeTypesStore();
		// `getNodeType` is a readonly store getter, so patch it on the instance.
		Object.defineProperty(nodeTypesStore, 'getNodeType', {
			configurable: true,
			value: vi.fn(() => null),
		});

		useFoldersStore().cacheFolders = vi.fn();

		searchWorkflowNodesMock.mockResolvedValue({ results: [], hasMore: false });
	});

	describe('feature flag', () => {
		it('does not search or render results when disabled', async () => {
			vi.spyOn(posthogStore, 'isVariantEnabled').mockReturnValue(false);
			const { group, lastQuery } = setup();

			lastQuery.value = 'orders';
			group.handlers?.onCommandBarChange?.('orders');

			expect(searchWorkflowNodesMock).not.toHaveBeenCalled();
			expect(group.commands.value).toEqual([]);
		});
	});

	describe('query gating', () => {
		it('does not search below the minimum query length', () => {
			const { group } = setup();

			group.handlers?.onCommandBarChange?.('or');

			expect(searchWorkflowNodesMock).not.toHaveBeenCalled();
		});

		it('searches once the query is long enough', async () => {
			const { group } = setup();

			group.handlers?.onCommandBarChange?.('orders');

			await waitFor(() =>
				expect(searchWorkflowNodesMock).toHaveBeenCalledWith(expect.anything(), 'orders'),
			);
		});

		it('renders no commands while the query is too short', async () => {
			searchWorkflowNodesMock.mockResolvedValue({ results: [makeHit()], hasMore: false });
			const { group, lastQuery } = setup();

			lastQuery.value = 'or';
			group.handlers?.onCommandBarChange?.('orders');

			await waitFor(() => expect(searchWorkflowNodesMock).toHaveBeenCalled());
			expect(group.commands.value).toEqual([]);
		});

		it('does not search while a node submenu is open', () => {
			const { group, activeNodeId } = setup();
			activeNodeId.value = 'node-1';

			group.handlers?.onCommandBarChange?.('orders');

			expect(searchWorkflowNodesMock).not.toHaveBeenCalled();
		});
	});

	describe('results', () => {
		it('maps hits to command items', async () => {
			searchWorkflowNodesMock.mockResolvedValue({ results: [makeHit()], hasMore: false });
			const { group, lastQuery } = setup();

			lastQuery.value = 'orders';
			group.handlers?.onCommandBarChange?.('orders');

			await waitFor(() => expect(group.commands.value).toHaveLength(1));
			expect(group.commands.value[0].id).toContain('wf-other');
			expect(group.commands.value[0].section).toBe('commandBar.globalNodeSearch.section');
		});

		it('includes the snippet as a keyword so parameter matches survive client filtering', async () => {
			searchWorkflowNodesMock.mockResolvedValue({
				results: [
					makeHit({ matchedField: 'parameters', snippet: 'https://api.acme.test/v2/orders' }),
				],
				hasMore: false,
			});
			const { group, lastQuery } = setup();

			lastQuery.value = 'acme.test';
			group.handlers?.onCommandBarChange?.('acme.test');

			await waitFor(() => expect(group.commands.value).toHaveLength(1));
			expect(group.commands.value[0].keywords).toContain('https://api.acme.test/v2/orders');
		});

		it('excludes hits from the current workflow', async () => {
			searchWorkflowNodesMock.mockResolvedValue({
				results: [makeHit({ workflowId: 'wf-current' }), makeHit({ workflowId: 'wf-other' })],
				hasMore: false,
			});
			const { group, lastQuery } = setup();

			lastQuery.value = 'orders';
			group.handlers?.onCommandBarChange?.('orders');

			await waitFor(() => expect(group.commands.value).toHaveLength(1));
		});

		it('appends a truncation notice when results were capped', async () => {
			searchWorkflowNodesMock.mockResolvedValue({ results: [makeHit()], hasMore: true });
			const { group, lastQuery } = setup();

			lastQuery.value = 'orders';
			group.handlers?.onCommandBarChange?.('orders');

			await waitFor(() => expect(group.commands.value).toHaveLength(2));
			const notice = group.commands.value[1];
			expect(notice.id).toContain('truncated');
			expect(notice.keywords).toEqual(['orders']);
			expect(notice.handler).toBeUndefined();
		});

		it('clears results when the API fails', async () => {
			searchWorkflowNodesMock.mockRejectedValue(new Error('boom'));
			const { group, lastQuery } = setup();

			lastQuery.value = 'orders';
			group.handlers?.onCommandBarChange?.('orders');

			await waitFor(() => expect(group.isLoading?.value).toBe(false));
			expect(group.commands.value).toEqual([]);
		});
	});

	describe('stale responses', () => {
		it('discards a response superseded by a newer query', async () => {
			let resolveFirst: (v: { results: NodeSearchHit[]; hasMore: boolean }) => void = () => {};
			searchWorkflowNodesMock.mockImplementationOnce(
				async () => await new Promise((resolve) => (resolveFirst = resolve)),
			);
			searchWorkflowNodesMock.mockResolvedValueOnce({
				results: [makeHit({ nodeName: 'newer' })],
				hasMore: false,
			});

			const { group, lastQuery } = setup();

			lastQuery.value = 'sla';
			group.handlers?.onCommandBarChange?.('sla');
			lastQuery.value = 'slack';
			group.handlers?.onCommandBarChange?.('slack');

			await waitFor(() => expect(group.commands.value).toHaveLength(1));

			// The slow first request lands last; it must not overwrite the newer results.
			resolveFirst({ results: [makeHit({ nodeName: 'stale' }), makeHit()], hasMore: false });

			await waitFor(() => expect(group.commands.value).toHaveLength(1));
		});
	});

	describe('navigation', () => {
		it('routes regular nodes via the nodeId param so the NDV opens', async () => {
			searchWorkflowNodesMock.mockResolvedValue({ results: [makeHit()], hasMore: false });
			const { group, lastQuery } = setup();

			lastQuery.value = 'orders';
			group.handlers?.onCommandBarChange?.('orders');
			await waitFor(() => expect(group.commands.value).toHaveLength(1));

			await group.commands.value[0].handler?.();

			expect(resolveMock).toHaveBeenCalledWith(
				expect.objectContaining({
					params: { workflowId: 'wf-other', nodeId: 'node-1' },
				}),
			);
		});

		it('routes sticky notes to canvas selection instead of the NDV', async () => {
			searchWorkflowNodesMock.mockResolvedValue({
				results: [
					makeHit({
						isSticky: true,
						nodeType: 'n8n-nodes-base.stickyNote',
						nodeId: 'sticky-1',
					}),
				],
				hasMore: false,
			});
			const { group, lastQuery } = setup();

			lastQuery.value = 'orders';
			group.handlers?.onCommandBarChange?.('orders');
			await waitFor(() => expect(group.commands.value).toHaveLength(1));

			await group.commands.value[0].handler?.();

			expect(resolveMock).toHaveBeenCalledWith(
				expect.objectContaining({
					params: { workflowId: 'wf-other' },
					query: { selectNode: 'sticky-1' },
				}),
			);
		});
	});

	describe('reset', () => {
		it('clears results when navigating into a submenu', async () => {
			searchWorkflowNodesMock.mockResolvedValue({ results: [makeHit()], hasMore: false });
			const { group, lastQuery } = setup();

			lastQuery.value = 'orders';
			group.handlers?.onCommandBarChange?.('orders');
			await waitFor(() => expect(group.commands.value).toHaveLength(1));

			group.handlers?.onCommandBarNavigateTo?.('some-parent');

			expect(group.commands.value).toEqual([]);
		});
	});
});
