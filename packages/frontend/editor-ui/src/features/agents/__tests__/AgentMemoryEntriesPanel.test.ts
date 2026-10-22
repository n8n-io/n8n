import { beforeEach, describe, it, expect, vi } from 'vitest';
import { flushPromises, mount } from '@vue/test-utils';
import { ref } from 'vue';
import type { AgentMemoryEntriesPageDto, AgentMemoryEntryDto } from '@n8n/api-types';

import { MODAL_CANCEL, MODAL_CONFIRM } from '@/app/constants';
import AgentMemoryEntriesPanel from '../components/AgentMemoryEntriesPanel.vue';

const listAgentMemoryEntries = vi.fn();
const deleteAgentMemoryEntry = vi.fn();
vi.mock('../composables/useAgentApi', () => ({
	listAgentMemoryEntries: (...args: unknown[]) => listAgentMemoryEntries(...args),
	deleteAgentMemoryEntry: (...args: unknown[]) => deleteAgentMemoryEntry(...args),
}));

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

	it('removes an entry after the delete is confirmed', async () => {
		openAgentConfirmationModal.mockResolvedValue(MODAL_CONFIRM);
		const wrapper = await mountPanel();

		await wrapper.findAll('[data-testid="agent-memory-entry-delete"]')[0].trigger('click');
		await flushPromises();

		expect(deleteAgentMemoryEntry).toHaveBeenCalledWith({}, 'project-1', 'agent-1', 'e1');
		expect(wrapper.findAll('[data-testid="agent-memory-entry"]')).toHaveLength(1);
		expect(showMessage).toHaveBeenCalledWith(expect.objectContaining({ type: 'success' }));
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
});
