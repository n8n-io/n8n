import { beforeEach, describe, it, expect, vi } from 'vitest';
import { flushPromises, mount } from '@vue/test-utils';
import { ref } from 'vue';
import type { AgentMemoryEntriesPageDto, AgentMemoryEntryDto } from '@n8n/api-types';

import { MODAL_CANCEL, MODAL_CONFIRM } from '@/app/constants';
import AgentMemoryEntriesPanel from '../components/AgentMemoryEntriesPanel.vue';
import AgentMemorySourceFilter from '../components/AgentMemorySourceFilter.vue';

const listAgentMemoryEntries = vi.fn();
const deleteAgentMemoryEntry = vi.fn();
const getAgentMemorySourceFacets = vi.fn();
vi.mock('../composables/useAgentApi', () => ({
	listAgentMemoryEntries: (...args: unknown[]) => listAgentMemoryEntries(...args),
	deleteAgentMemoryEntry: (...args: unknown[]) => deleteAgentMemoryEntry(...args),
	getAgentMemorySourceFacets: (...args: unknown[]) => getAgentMemorySourceFacets(...args),
}));
vi.mock('@n8n/composables/useDebounce', () => ({ getDebounceTime: () => 0 }));

const showError = vi.fn();
const showMessage = vi.fn();
vi.mock('@n8n/composables/useToast', () => ({ useToast: () => ({ showError, showMessage }) }));
vi.mock('@n8n/stores/useRootStore', () => ({ useRootStore: () => ({ restApiContext: {} }) }));

const openAgentConfirmationModal = vi.fn();
vi.mock('../composables/useAgentConfirmationModal', () => ({
	useAgentConfirmationModal: () => ({ openAgentConfirmationModal }),
}));
vi.mock('../composables/useAgentIntegrationsCatalog', () => ({
	useAgentIntegrationsCatalog: () => ({
		catalog: ref([{ type: 'slack', label: 'Slack', icon: 'zap' }]),
		ensureLoaded: vi.fn().mockResolvedValue([]),
	}),
}));

vi.mock('@n8n/i18n', () => ({
	useI18n: () => ({
		baseText: (key: string, options?: { interpolate?: Record<string, string> }) =>
			options?.interpolate ? `${key} ${Object.values(options.interpolate).join(',')}` : key,
	}),
}));

function makeEntry(id: string, overrides: Partial<AgentMemoryEntryDto> = {}): AgentMemoryEntryDto {
	return {
		id,
		content: `Fact ${id}`,
		createdAt: '2025-06-01T10:00:00.000Z',
		otherSourceCount: 0,
		source: { kind: 'slack', userName: 'Sin', place: '#finance-ops' },
		...overrides,
	};
}

function page(items: AgentMemoryEntryDto[], overrides: Partial<AgentMemoryEntriesPageDto> = {}) {
	return { items, total: items.length, nextCursor: null, ...overrides };
}

async function mountPanel(props: { disabled?: boolean } = {}) {
	const wrapper = mount(AgentMemoryEntriesPanel, {
		props: { projectId: 'project-1', agentId: 'agent-1', ...props },
	});
	await flushPromises();
	return wrapper;
}

describe('AgentMemoryEntriesPanel', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		listAgentMemoryEntries.mockResolvedValue(page([makeEntry('e1'), makeEntry('e2')]));
		deleteAgentMemoryEntry.mockResolvedValue(undefined);
		getAgentMemorySourceFacets.mockResolvedValue({ groups: [] });
	});

	it('loads the 10 newest entries with their source line', async () => {
		const wrapper = await mountPanel();

		expect(listAgentMemoryEntries).toHaveBeenCalledWith({}, 'project-1', 'agent-1', {
			limit: 10,
			cursor: undefined,
		});
		const rows = wrapper.findAll('[data-testid="agent-memory-entry"]');
		expect(rows).toHaveLength(2);
		expect(rows[0].find('[data-testid="agent-memory-entry-meta"]').text()).toContain(
			'Sin · #finance-ops',
		);
	});

	it('shows how many other sources an entry has', async () => {
		listAgentMemoryEntries.mockResolvedValue(page([makeEntry('e1', { otherSourceCount: 2 })]));

		const wrapper = await mountPanel();

		expect(wrapper.find('[data-testid="agent-memory-entry-meta"]').text()).toContain(
			'agents.builder.memory.entries.otherSources 2',
		);
	});

	it('shows the empty state without entries', async () => {
		listAgentMemoryEntries.mockResolvedValue(page([]));

		const wrapper = await mountPanel();

		expect(wrapper.find('[data-testid="agent-memory-entries-empty"]').exists()).toBe(true);
	});

	it('hides the empty state when loading fails', async () => {
		listAgentMemoryEntries.mockRejectedValue(new Error('nope'));

		const wrapper = await mountPanel();

		expect(wrapper.find('[data-testid="agent-memory-entries-empty"]').exists()).toBe(false);
		expect(showError).toHaveBeenCalled();
	});

	it('opens the full list and loads more pages', async () => {
		listAgentMemoryEntries
			.mockResolvedValueOnce(page([makeEntry('e1')], { total: 14 }))
			.mockResolvedValueOnce(page([makeEntry('e1')], { total: 14, nextCursor: 'cursor-1' }))
			.mockResolvedValueOnce(page([makeEntry('e2')], { total: 14 }));
		const wrapper = await mountPanel();

		await wrapper.find('[data-testid="agent-memory-entries-view-all"]').trigger('click');
		await flushPromises();
		expect(listAgentMemoryEntries).toHaveBeenLastCalledWith({}, 'project-1', 'agent-1', {
			limit: 25,
			cursor: undefined,
		});

		await wrapper.find('[data-testid="agent-memory-entries-load-more"]').trigger('click');
		await flushPromises();

		expect(listAgentMemoryEntries).toHaveBeenLastCalledWith({}, 'project-1', 'agent-1', {
			limit: 25,
			cursor: 'cursor-1',
		});
		expect(wrapper.findAll('[data-testid="agent-memory-entry"]')).toHaveLength(2);
		expect(wrapper.find('[data-testid="agent-memory-entries-load-more"]').exists()).toBe(false);
	});

	it('tells the parent when the full list opens and closes, and drops the inline header', async () => {
		listAgentMemoryEntries.mockResolvedValue(page([makeEntry('e1')], { total: 14 }));
		const wrapper = await mountPanel();

		await wrapper.find('[data-testid="agent-memory-entries-view-all"]').trigger('click');
		await flushPromises();

		expect(wrapper.emitted('update:showAll')?.[0]).toEqual([true]);
		expect(wrapper.find('[data-testid="agent-memory-entries-view-all"]').exists()).toBe(false);
		expect(wrapper.find('[data-testid="agent-memory-entries-back"]').exists()).toBe(true);

		await wrapper.find('[data-testid="agent-memory-entries-back"]').trigger('click');
		await flushPromises();

		expect(wrapper.emitted('update:showAll')?.[1]).toEqual([false]);
	});

	it('uses the page size of the requested mode when the parent model updates later', async () => {
		listAgentMemoryEntries.mockResolvedValue(page([makeEntry('e1')], { total: 14 }));
		const wrapper = mount(AgentMemoryEntriesPanel, {
			props: {
				projectId: 'project-1',
				agentId: 'agent-1',
				showAll: false,
				'onUpdate:showAll': vi.fn(),
			},
		});
		await flushPromises();

		await wrapper.find('[data-testid="agent-memory-entries-view-all"]').trigger('click');
		await flushPromises();
		expect(listAgentMemoryEntries).toHaveBeenLastCalledWith({}, 'project-1', 'agent-1', {
			limit: 25,
			cursor: undefined,
		});

		await wrapper.setProps({ showAll: true });
		await wrapper.find('[data-testid="agent-memory-entries-back"]').trigger('click');
		await flushPromises();
		expect(listAgentMemoryEntries).toHaveBeenLastCalledWith({}, 'project-1', 'agent-1', {
			limit: 10,
			cursor: undefined,
		});
	});

	it('ignores a slow Load more response after the user went back', async () => {
		let resolveLoadMore: (value: AgentMemoryEntriesPageDto) => void = () => {};
		const slowLoadMore = new Promise<AgentMemoryEntriesPageDto>((resolve) => {
			resolveLoadMore = resolve;
		});
		listAgentMemoryEntries
			.mockResolvedValueOnce(page([makeEntry('e1')], { total: 14 }))
			.mockResolvedValueOnce(page([makeEntry('e1')], { total: 14, nextCursor: 'cursor-1' }))
			.mockReturnValueOnce(slowLoadMore)
			.mockResolvedValueOnce(page([makeEntry('e1')], { total: 14 }));
		const wrapper = await mountPanel();
		await wrapper.find('[data-testid="agent-memory-entries-view-all"]').trigger('click');
		await flushPromises();

		await wrapper.find('[data-testid="agent-memory-entries-load-more"]').trigger('click');
		await wrapper.find('[data-testid="agent-memory-entries-back"]').trigger('click');
		await flushPromises();
		resolveLoadMore(page([makeEntry('e2'), makeEntry('e3')], { total: 14 }));
		await flushPromises();

		expect(wrapper.findAll('[data-testid="agent-memory-entry"]')).toHaveLength(1);
	});

	it('removes an entry after the delete is confirmed', async () => {
		openAgentConfirmationModal.mockResolvedValue(MODAL_CONFIRM);
		listAgentMemoryEntries
			.mockResolvedValueOnce(page([makeEntry('e1'), makeEntry('e2')]))
			.mockResolvedValueOnce(page([makeEntry('e2')]));
		const wrapper = await mountPanel();

		await wrapper.findAll('[data-testid="agent-memory-entry-delete"]')[0].trigger('click');
		await flushPromises();

		expect(deleteAgentMemoryEntry).toHaveBeenCalledWith({}, 'project-1', 'agent-1', 'e1');
		expect(wrapper.findAll('[data-testid="agent-memory-entry"]')).toHaveLength(1);
		expect(showMessage).toHaveBeenCalledWith(expect.objectContaining({ type: 'success' }));
	});

	it('refetches the inline page after a delete to backfill it', async () => {
		openAgentConfirmationModal.mockResolvedValue(MODAL_CONFIRM);
		const firstPage = Array.from({ length: 10 }, (_, i) => makeEntry(`e${i + 1}`));
		const nextPage = Array.from({ length: 10 }, (_, i) => makeEntry(`e${i + 2}`));
		listAgentMemoryEntries
			.mockResolvedValueOnce(page(firstPage, { total: 11 }))
			.mockResolvedValueOnce(page(nextPage, { total: 10 }));
		const wrapper = await mountPanel();

		await wrapper.findAll('[data-testid="agent-memory-entry-delete"]')[0].trigger('click');
		await flushPromises();

		expect(listAgentMemoryEntries).toHaveBeenCalledTimes(2);
		expect(listAgentMemoryEntries).toHaveBeenLastCalledWith({}, 'project-1', 'agent-1', {
			limit: 10,
			cursor: undefined,
		});
		const rows = wrapper.findAll('[data-testid="agent-memory-entry"]');
		expect(rows).toHaveLength(10);
		expect(rows[9].text()).toContain('Fact e11');
	});

	it('keeps the entry when the delete is cancelled', async () => {
		openAgentConfirmationModal.mockResolvedValue(MODAL_CANCEL);
		const wrapper = await mountPanel();

		await wrapper.findAll('[data-testid="agent-memory-entry-delete"]')[0].trigger('click');
		await flushPromises();

		expect(deleteAgentMemoryEntry).not.toHaveBeenCalled();
		expect(wrapper.findAll('[data-testid="agent-memory-entry"]')).toHaveLength(2);
	});

	it('keeps the entry and shows an error when the delete fails', async () => {
		openAgentConfirmationModal.mockResolvedValue(MODAL_CONFIRM);
		deleteAgentMemoryEntry.mockRejectedValue(new Error('nope'));
		const wrapper = await mountPanel();

		await wrapper.findAll('[data-testid="agent-memory-entry-delete"]')[0].trigger('click');
		await flushPromises();

		expect(wrapper.findAll('[data-testid="agent-memory-entry"]')).toHaveLength(2);
		expect(showError).toHaveBeenCalled();
	});

	it('hides delete for a read-only user', async () => {
		const wrapper = await mountPanel({ disabled: true });

		expect(wrapper.find('[data-testid="agent-memory-entry-delete"]').exists()).toBe(false);
	});

	describe('search and source filter', () => {
		async function openFullList() {
			listAgentMemoryEntries.mockResolvedValue(page([makeEntry('e1')], { total: 14 }));
			const wrapper = await mountPanel();
			await wrapper.find('[data-testid="agent-memory-entries-view-all"]').trigger('click');
			await flushPromises();
			return wrapper;
		}

		function selectSource(wrapper: Awaited<ReturnType<typeof openFullList>>, selection: object) {
			wrapper.findComponent(AgentMemorySourceFilter).vm.$emit('update:modelValue', selection);
		}

		it('shows the search and the filter only in the full list, and loads the filter options', async () => {
			listAgentMemoryEntries.mockResolvedValue(page([makeEntry('e1')], { total: 14 }));
			const wrapper = await mountPanel();
			expect(wrapper.find('[data-testid="agent-memory-entries-search"]').exists()).toBe(false);
			expect(wrapper.findComponent(AgentMemorySourceFilter).exists()).toBe(false);

			await wrapper.find('[data-testid="agent-memory-entries-view-all"]').trigger('click');
			await flushPromises();

			expect(wrapper.find('[data-testid="agent-memory-entries-search"]').exists()).toBe(true);
			expect(wrapper.findComponent(AgentMemorySourceFilter).exists()).toBe(true);
			expect(getAgentMemorySourceFacets).toHaveBeenCalledWith({}, 'project-1', 'agent-1');
		});

		it('reloads the full list with the search and the selected source', async () => {
			const wrapper = await openFullList();

			await wrapper.find('[data-testid="agent-memory-entries-search"]').setValue(' tea ');
			await flushPromises();
			expect(listAgentMemoryEntries).toHaveBeenLastCalledWith({}, 'project-1', 'agent-1', {
				limit: 25,
				cursor: undefined,
				search: 'tea',
			});

			selectSource(wrapper, { source: 'slack', sourceFacet: 'channel', sourceFacetId: 'C1' });
			await flushPromises();
			expect(listAgentMemoryEntries).toHaveBeenLastCalledWith({}, 'project-1', 'agent-1', {
				limit: 25,
				cursor: undefined,
				search: 'tea',
				source: 'slack',
				sourceFacet: 'channel',
				sourceFacetId: 'C1',
			});
		});

		it('shows a no-match message when the filter finds nothing', async () => {
			const wrapper = await openFullList();
			listAgentMemoryEntries.mockResolvedValue(page([]));

			selectSource(wrapper, { source: 'slack' });
			await flushPromises();

			expect(wrapper.find('[data-testid="agent-memory-entries-empty"]').text()).toBe(
				'agents.builder.memory.entries.noMatches',
			);
		});

		it('clears the search and the filter when the user goes back', async () => {
			const wrapper = await openFullList();
			await wrapper.find('[data-testid="agent-memory-entries-search"]').setValue('tea');
			selectSource(wrapper, { source: 'slack' });
			await flushPromises();

			await wrapper.find('[data-testid="agent-memory-entries-back"]').trigger('click');
			await flushPromises();
			await wrapper.find('[data-testid="agent-memory-entries-view-all"]').trigger('click');
			await flushPromises();

			const lastOptions = listAgentMemoryEntries.mock.lastCall?.[3];
			expect(lastOptions).toMatchObject({ limit: 25 });
			expect(lastOptions.search).toBeUndefined();
			expect(lastOptions.source).toBeUndefined();
		});

		it('drops the old list when a search fails, so Load more cannot extend it', async () => {
			listAgentMemoryEntries.mockResolvedValue(
				page([makeEntry('e1')], { total: 14, nextCursor: 'cursor-1' }),
			);
			const wrapper = await mountPanel();
			await wrapper.find('[data-testid="agent-memory-entries-view-all"]').trigger('click');
			await flushPromises();
			listAgentMemoryEntries.mockRejectedValue(new Error('nope'));

			await wrapper.find('[data-testid="agent-memory-entries-search"]').setValue('tea');
			await flushPromises();

			expect(wrapper.findAll('[data-testid="agent-memory-entry"]')).toHaveLength(0);
			expect(wrapper.find('[data-testid="agent-memory-entries-load-more"]').exists()).toBe(false);
			expect(showError).toHaveBeenCalled();
		});
	});
});
