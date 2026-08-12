import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ref } from 'vue';
import { waitFor } from '@testing-library/vue';
import { createTestingPinia } from '@pinia/testing';
import { setActivePinia } from 'pinia';
import type { NodeSearchHit } from '@n8n/api-types';

import { useGlobalNodeSearchCommands } from './useGlobalNodeSearchCommands';
import { useWorkflowsStore } from '@/app/stores/workflows.store';
import {
	createWorkflowDocumentId,
	useWorkflowDocumentStore,
} from '@/app/stores/workflowDocument.store';
import { useNodeTypesStore } from '@/app/stores/nodeTypes.store';
import { usePostHog } from '@/app/stores/posthog.store';
import { useFoldersStore } from '@/features/core/folders/folders.store';
import { canvasEventBus } from '@/features/workflows/canvas/canvas.eventBus';
import { createTestNode } from '@/__tests__/mocks';
import * as workflowsApi from '@/app/api/workflows';

vi.mock('lodash/debounce', () => ({
	default: (fn: (...args: unknown[]) => unknown) => {
		const wrapped = (...args: unknown[]) => fn(...args);
		wrapped.cancel = vi.fn();
		return wrapped;
	},
}));

const setNodeActiveMock = vi.fn();

vi.mock('@/app/composables/useCanvasOperations', () => ({
	useCanvasOperations: () => ({
		setNodeActive: setNodeActiveMock,
	}),
}));

vi.mock('@/features/workflows/canvas/canvas.eventBus', () => ({
	canvasEventBus: {
		emit: vi.fn(),
	},
}));

vi.mock('@n8n/i18n', async (importOriginal) => ({
	...(await importOriginal()),
	useI18n: () => ({
		baseText: (key: string, options?: { interpolate?: Record<string, string> }) => {
			if (key === 'generic.openResource' && options?.interpolate?.resource) {
				return `Open ${options.interpolate.resource}`;
			}
			if (key === 'commandBar.globalNodeSearch.truncated' && options?.interpolate?.count) {
				return `Showing the first ${options.interpolate.count} matches`;
			}
			return key;
		},
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

	const setup = (options: { isWorkflowScoped?: boolean; scopedProjectId?: string | null } = {}) => {
		const lastQuery = ref('');
		const activeNodeId = ref<string | null>(null);
		const isWorkflowScoped = ref(options.isWorkflowScoped ?? false);
		const scopedProjectId = ref<string | null>(options.scopedProjectId ?? null);
		const group = useGlobalNodeSearchCommands({
			lastQuery,
			activeNodeId,
			isWorkflowScoped,
			scopedProjectId,
		});
		return { group, lastQuery, activeNodeId, isWorkflowScoped, scopedProjectId };
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
		vi.spyOn(posthogStore, 'getVariant').mockReturnValue('variant');

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
		it('does not search or render results when assigned to control', async () => {
			vi.spyOn(posthogStore, 'getVariant').mockReturnValue('control');
			const { group, lastQuery } = setup();

			lastQuery.value = 'orders';
			group.handlers?.onCommandBarChange?.('orders');

			expect(searchWorkflowNodesMock).not.toHaveBeenCalled();
			expect(group.commands.value).toEqual([]);
		});

		it('searches when the flag is unset (local/dev default on)', async () => {
			vi.spyOn(posthogStore, 'getVariant').mockReturnValue(undefined);
			const { group } = setup();

			group.handlers?.onCommandBarChange?.('orders');

			await waitFor(() =>
				expect(searchWorkflowNodesMock).toHaveBeenCalledWith(expect.anything(), 'orders', {}),
			);
		});
	});

	describe('workflow context scoping', () => {
		it('does not search while the workflow context is active', () => {
			const { group } = setup({ isWorkflowScoped: true });

			group.handlers?.onCommandBarChange?.('orders');

			expect(searchWorkflowNodesMock).not.toHaveBeenCalled();
			expect(group.commands.value).toEqual([]);
		});

		it('starts a global search when the workflow context is cleared', async () => {
			const { group, lastQuery, isWorkflowScoped } = setup({ isWorkflowScoped: true });
			searchWorkflowNodesMock.mockResolvedValue({ results: [makeHit()], hasMore: false });

			lastQuery.value = 'orders';
			group.handlers?.onCommandBarChange?.('orders');
			expect(searchWorkflowNodesMock).not.toHaveBeenCalled();

			isWorkflowScoped.value = false;

			await waitFor(() =>
				expect(searchWorkflowNodesMock).toHaveBeenCalledWith(expect.anything(), 'orders', {}),
			);
			await waitFor(() => expect(group.commands.value).toHaveLength(1));
		});

		it('passes projectId when project context is active', async () => {
			const { group } = setup({ scopedProjectId: 'proj-1' });

			group.handlers?.onCommandBarChange?.('orders');

			await waitFor(() =>
				expect(searchWorkflowNodesMock).toHaveBeenCalledWith(expect.anything(), 'orders', {
					projectId: 'proj-1',
				}),
			);
		});

		it('drops hits from other projects even if the API returns them', async () => {
			searchWorkflowNodesMock.mockResolvedValue({
				results: [
					makeHit({
						nodeId: 'in-project',
						homeProject: { id: 'proj-1', name: 'Acme Corp', type: 'team', icon: null },
					}),
					makeHit({
						nodeId: 'other-project',
						homeProject: { id: 'proj-2', name: 'Other', type: 'team', icon: null },
					}),
				],
				hasMore: false,
			});
			const { group, lastQuery } = setup({ scopedProjectId: 'proj-1' });

			lastQuery.value = 'orders';
			group.handlers?.onCommandBarChange?.('orders');

			await waitFor(() => expect(group.commands.value).toHaveLength(1));
			expect(group.commands.value[0].id).toContain('in-project');
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
				expect(searchWorkflowNodesMock).toHaveBeenCalledWith(expect.anything(), 'orders', {}),
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
		it('maps hits under Nodes with project subsections and type/workflow suffix', async () => {
			searchWorkflowNodesMock.mockResolvedValue({ results: [makeHit()], hasMore: false });
			const { group, lastQuery } = setup();

			lastQuery.value = 'orders';
			group.handlers?.onCommandBarChange?.('orders');

			await waitFor(() => expect(group.commands.value).toHaveLength(1));
			expect(group.commands.value[0].id).toContain('wf-other');
			expect(group.commands.value[0].section).toBe('commandBar.sections.nodes');
			expect(group.commands.value[0].subsection).toBe('Acme Corp');
			expect(group.commands.value[0].subsectionIcon).toMatchObject({
				props: expect.objectContaining({
					icon: { type: 'icon', value: 'layers' },
					size: 'mini',
					borderLess: true,
				}),
			});
			expect(group.commands.value[0].title).toMatchObject({
				props: expect.objectContaining({
					title: expect.stringContaining('Fetch orders'),
					suffix: 'httpRequest · Billing sync',
				}),
			});
		});

		it('groups hits by project subsection under Nodes', async () => {
			searchWorkflowNodesMock.mockResolvedValue({
				results: [
					makeHit({
						nodeId: 'acme-type',
						matchedField: 'type',
						homeProject: { id: 'p1', name: 'Acme Corp', type: 'team', icon: null },
					}),
					makeHit({
						nodeId: 'personal-name',
						nodeName: 'Orders personal',
						matchedField: 'name',
						homeProject: { id: 'p2', name: 'Personal', type: 'personal', icon: null },
					}),
					makeHit({
						nodeId: 'acme-name',
						nodeName: 'Orders acme',
						matchedField: 'name',
						homeProject: { id: 'p1', name: 'Acme Corp', type: 'team', icon: null },
					}),
				],
				hasMore: false,
			});
			const { group, lastQuery } = setup();

			lastQuery.value = 'orders';
			group.handlers?.onCommandBarChange?.('orders');

			await waitFor(() => expect(group.commands.value).toHaveLength(3));
			// Project order follows the first high-rank hit; within a project, name > type.
			expect(group.commands.value.map((c) => c.id)).toEqual([
				expect.stringContaining('personal-name'),
				expect.stringContaining('acme-name'),
				expect.stringContaining('acme-type'),
			]);
			expect(group.commands.value.map((c) => c.section)).toEqual([
				'commandBar.sections.nodes',
				'commandBar.sections.nodes',
				'commandBar.sections.nodes',
			]);
			expect(group.commands.value.map((c) => c.subsection)).toEqual([
				'projects.menu.personal',
				'Acme Corp',
				'Acme Corp',
			]);
		});

		it('ranks name matches above type matches', async () => {
			searchWorkflowNodesMock.mockResolvedValue({
				results: [
					makeHit({
						nodeId: 'type-hit',
						nodeName: 'Notify sales',
						matchedField: 'type',
						snippet: 'slack',
					}),
					makeHit({
						nodeId: 'name-hit',
						nodeName: 'Slack alert',
						matchedField: 'name',
						snippet: 'Slack alert',
					}),
				],
				hasMore: false,
			});
			const { group, lastQuery } = setup();

			lastQuery.value = 'slack';
			group.handlers?.onCommandBarChange?.('slack');

			await waitFor(() => expect(group.commands.value).toHaveLength(2));
			expect(group.commands.value[0].id).toContain('name-hit');
			expect(group.commands.value[1].id).toContain('type-hit');
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

		it('excludes current-workflow hits when the canvas already has that node', async () => {
			const documentStore = useWorkflowDocumentStore(createWorkflowDocumentId('wf-current'));
			documentStore.setNodes([createTestNode({ id: 'node-1', name: 'Fetch orders' })]);

			searchWorkflowNodesMock.mockResolvedValue({
				results: [
					makeHit({ workflowId: 'wf-current', nodeId: 'node-1' }),
					makeHit({ workflowId: 'wf-other', nodeId: 'node-2' }),
				],
				hasMore: false,
			});
			const { group, lastQuery } = setup();

			lastQuery.value = 'orders';
			group.handlers?.onCommandBarChange?.('orders');

			await waitFor(() => expect(group.commands.value).toHaveLength(1));
			expect(group.commands.value[0].id).toContain('wf-other');
		});

		it('keeps current-workflow hits when local open-node commands are unavailable', async () => {
			searchWorkflowNodesMock.mockResolvedValue({
				results: [makeHit({ workflowId: 'wf-current', nodeName: 'Get an event' })],
				hasMore: false,
			});
			const { group, lastQuery } = setup();

			lastQuery.value = 'Get an event';
			group.handlers?.onCommandBarChange?.('Get an event');

			await waitFor(() => expect(group.commands.value).toHaveLength(1));
			expect(group.commands.value[0].id).toContain('wf-current');
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

		it('opens current-workflow nodes without a full page reload', async () => {
			searchWorkflowNodesMock.mockResolvedValue({
				results: [makeHit({ workflowId: 'wf-current', nodeId: 'local-1' })],
				hasMore: false,
			});
			const { group, lastQuery } = setup();

			lastQuery.value = 'orders';
			group.handlers?.onCommandBarChange?.('orders');
			await waitFor(() => expect(group.commands.value).toHaveLength(1));

			await group.commands.value[0].handler?.();

			expect(setNodeActiveMock).toHaveBeenCalledWith('local-1', 'command_bar');
			expect(resolveMock).not.toHaveBeenCalled();
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

		it('selects sticky notes on the current workflow via the canvas event bus', async () => {
			searchWorkflowNodesMock.mockResolvedValue({
				results: [
					makeHit({
						workflowId: 'wf-current',
						isSticky: true,
						nodeType: 'n8n-nodes-base.stickyNote',
						nodeId: 'sticky-local',
					}),
				],
				hasMore: false,
			});
			const { group, lastQuery } = setup();

			lastQuery.value = 'orders';
			group.handlers?.onCommandBarChange?.('orders');
			await waitFor(() => expect(group.commands.value).toHaveLength(1));

			await group.commands.value[0].handler?.();

			expect(canvasEventBus.emit).toHaveBeenCalledWith('nodes:select', {
				ids: ['sticky-local'],
				panIntoView: true,
			});
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
