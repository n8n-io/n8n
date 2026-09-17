import { beforeEach, describe, it, expect, vi } from 'vitest';
import { fireEvent, render, waitFor } from '@testing-library/vue';
import { createComponentRenderer } from '../../../__tests__/render';
import { createTestingPinia } from '@pinia/testing';

const scrollToKeyMock = vi.hoisted(() => vi.fn());
const scrollToKeyIfNeededMock = vi.hoisted(() => vi.fn());
const scrollToMock = vi.hoisted(() => vi.fn());
// Lets a test hand the modal a non-zero offset to read off the scroller stub.
const scrollTopValue = vi.hoisted(() => ({ current: 0 }));

/** Replace teleported dialog content with inline content. */
vi.mock('../../N8nDialog', () => ({
	N8nDialog: {
		name: 'N8nDialog',
		props: ['open', 'size', 'header'],
		emits: ['update:open'],
		template: `
			<div v-if="open" role="dialog">
				<h2>{{ header }}</h2>
				<slot />
			</div>
		`,
	},
	N8nDialogHeader: {
		name: 'N8nDialogHeader',
		template: '<header><slot /></header>',
	},
}));

/** Render all virtual rows so tests can inspect them in jsdom. */
vi.mock('../../N8nRecycleScroller', () => ({
	default: {
		name: 'N8nRecycleScroller',
		props: ['items', 'itemSize', 'itemKey'],
		created() {
			Object.defineProperty(this, 'scrollTop', {
				get: () => scrollTopValue.current,
			});
		},
		methods: {
			scrollToKey: scrollToKeyMock,
			scrollToKeyIfNeeded: scrollToKeyIfNeededMock,
			scrollTo: scrollToMock,
		},
		template: `
			<div class="recycle-scroller-wrapper">
				<div v-for="item in items" :key="item[itemKey]">
					<slot :item="item" :update-item-size="() => {}" />
				</div>
			</div>
		`,
	},
}));

/** Use clickable tab buttons without the design-system wrapper. */
vi.mock('../../N8nTabs', () => ({
	default: {
		name: 'N8nTabs',
		props: ['modelValue', 'options', 'size', 'variant'],
		emits: ['update:modelValue'],
		template: `
			<div>
				<button
					v-for="option in options"
					:key="option.value"
					role="tab"
					:data-test-id="'tab-' + option.value"
					:aria-selected="modelValue === option.value"
					@click="$emit('update:modelValue', option.value)"
				>{{ option.label }}</button>
			</div>
		`,
	},
}));

import ToolsConnectionModal from '../ToolsConnectionModal.vue';
import McpToolSettingsContent from '../McpToolSettingsContent.vue';
import { connectedMcpFixture, makeLargeMcpList, realisticItems } from '../fixtures';
import type { ToolCategoryKey, ToolConnectionItem } from '../types';

const renderModal = createComponentRenderer(ToolsConnectionModal);

const ALL_CATEGORIES: ToolCategoryKey[] = ['connected', 'mcp', 'ai', 'app-action', 'workflows'];

beforeEach(() => {
	scrollToKeyMock.mockClear();
	scrollToKeyIfNeededMock.mockClear();
	scrollToMock.mockClear();
	scrollTopValue.current = 0;
});

function renderWith(
	props: Partial<{
		items: ToolConnectionItem[];
		categories: ToolCategoryKey[];
		detailItem: ToolConnectionItem | null;
		detailMode: 'detail' | 'settings';
		allowWorkflowCreation: boolean;
	}>,
) {
	return renderModal({
		props: {
			open: true,
			items: props.items ?? realisticItems,
			categories: props.categories ?? ALL_CATEGORIES,
			detailItem: props.detailItem ?? null,
			detailMode: props.detailMode,
			allowWorkflowCreation: props.allowWorkflowCreation,
		},
		slots: {
			'suggestion-footer': '<div data-test-id="suggest-tool-footer">Suggest a tool</div>',
		},
		pinia: createTestingPinia(),
	});
}

function renderWithMcpSettingsSlot(detailItem: ToolConnectionItem) {
	const Host = {
		components: { ToolsConnectionModal, McpToolSettingsContent },
		props: ['detailItem'],
		template: `
			<ToolsConnectionModal
				:open="true"
				:items="[]"
				:categories="[]"
				:detail-item="detailItem"
				detail-mode="settings"
			>
				<template #settings-body="{ item, onSave, onDisconnect }">
					<McpToolSettingsContent
						v-if="item.kind === 'mcp-server'"
						:item="item"
						@save="onSave"
						@disconnect="onDisconnect"
					/>
				</template>
			</ToolsConnectionModal>
		`,
	};
	return render(Host, {
		props: { detailItem },
		pinia: createTestingPinia(),
	});
}

describe('ToolsConnectionModal', () => {
	it('shows only the first category on open, not every item', () => {
		const { queryByText } = renderWith({ categories: ALL_CATEGORIES });

		// 'connected' is first, so the connected MCP servers show and the
		// available ones from other categories stay hidden until their tab is picked.
		expect(queryByText('Notion')).toBeTruthy();
		expect(queryByText('Slack')).toBeTruthy();
		expect(queryByText('GitHub')).toBeNull();
		expect(queryByText('OpenAI')).toBeNull();
		expect(queryByText('Notion onboarding flow')).toBeNull();
	});

	it('treats every status except none as having a connection', () => {
		const items: ToolConnectionItem[] = [
			{ ...connectedMcpFixture, id: 'connected', title: 'Operational', status: 'connected' },
			{ ...connectedMcpFixture, id: 'connecting', title: 'In progress', status: 'connecting' },
			{ ...connectedMcpFixture, id: 'disconnected', title: 'Unavailable', status: 'disconnected' },
			{ ...connectedMcpFixture, id: 'none', title: 'Never added', status: 'none' },
		];
		const { getByTestId, queryByText } = renderWith({
			items,
			categories: ['connected', 'mcp'],
		});

		expect(getByTestId('tab-connected')).toHaveTextContent('(3)');
		expect(queryByText('Operational')).toBeTruthy();
		expect(queryByText('In progress')).toBeTruthy();
		expect(queryByText('Unavailable')).toBeTruthy();
		expect(queryByText('Never added')).toBeNull();
	});

	it('gathers every item under the all tab, connected ones included', () => {
		const { getByTestId, queryByText } = renderWith({
			categories: ['all', ...ALL_CATEGORIES],
		});

		expect(getByTestId('tab-all').textContent).toContain(`(${realisticItems.length})`);
		expect(queryByText('Notion')).toBeTruthy();
		expect(queryByText('GitHub')).toBeTruthy();
		expect(queryByText('OpenAI')).toBeTruthy();
		expect(queryByText('Notion onboarding flow')).toBeTruthy();
	});

	it('labels and populates the n8n-connect tab and finds its items in search', async () => {
		const gatewayItem: ToolConnectionItem = {
			id: 'n8n-connect:slack',
			kind: 'node',
			title: 'Slack',
			description: 'Send messages',
			status: 'none',
			category: 'n8n-connect',
			freeCredits: true,
			nodeTypeName: 'n8n-nodes-base.slackTool',
		};
		const { getByTestId, getByPlaceholderText, queryByText } = renderWith({
			items: [gatewayItem, ...realisticItems],
			categories: ['n8n-connect', 'all', ...ALL_CATEGORIES],
		});

		const tab = getByTestId('tab-n8n-connect');
		expect(tab.textContent).toContain('Gateway credits');
		expect(tab.textContent).toContain('(1)');
		// First tab is active, so the gateway item is visible immediately.
		expect(queryByText('Slack')).toBeTruthy();

		const inputEl = getByPlaceholderText('Search all tools...') as HTMLInputElement;
		// A non-matching query empties the tab, proving the debounced filter runs.
		await fireEvent.update(inputEl, 'zzzznomatch');
		await waitFor(() => expect(getByTestId('tab-n8n-connect').textContent).toContain('(0)'));
		// Searching the item's description text brings it back.
		await fireEvent.update(inputEl, 'send messages');
		await waitFor(() => expect(getByTestId('tab-n8n-connect').textContent).toContain('(1)'));
	});

	it('keeps connected items in their own category when the connected tab is omitted', () => {
		const { queryByText, queryAllByText } = renderWith({
			categories: ['mcp'],
		});

		expect(queryByText('Notion')).toBeTruthy();
		expect(queryByText('Slack')).toBeTruthy();
		expect(queryByText('GitHub')).toBeTruthy();
		expect(queryAllByText('Connected').length).toBeGreaterThan(0);
	});

	it('shows the empty state when items is empty', () => {
		const { getByTestId } = renderWith({ items: [], categories: ['mcp'] });
		expect(getByTestId('tools-connection-empty')).toBeTruthy();
		expect(getByTestId('suggest-tool-footer')).toBeTruthy();
	});

	it('renders the suggestion footer after the tool rows inside the scroller', () => {
		const { getByTestId, getAllByTestId, container } = renderWith({
			items: makeLargeMcpList(20),
			categories: ['mcp'],
		});
		const scroller = container.querySelector('.recycle-scroller-wrapper');
		const footer = getByTestId('suggest-tool-footer');
		const rows = getAllByTestId('tools-connection-row');

		expect(scroller).toContainElement(footer);
		expect(rows.at(-1)?.compareDocumentPosition(footer)).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
	});

	it('does not render the suggestion footer outside the MCP category', async () => {
		const { getByTestId, queryByTestId } = renderWith({
			categories: ['mcp', 'ai'],
		});

		expect(queryByTestId('suggest-tool-footer')).toBeTruthy();
		await fireEvent.click(getByTestId('tab-ai'));
		expect(queryByTestId('suggest-tool-footer')).toBeNull();
	});

	it('offers workflow creation when the workflows category is empty', async () => {
		const { emitted, getByTestId, queryByTestId } = renderWith({
			items: [],
			categories: ['mcp', 'workflows'],
			allowWorkflowCreation: true,
		});

		expect(queryByTestId('tools-connection-create-workflow')).toBeNull();

		await fireEvent.click(getByTestId('tab-workflows'));
		expect(getByTestId('tools-connection-empty')).toBeTruthy();

		await fireEvent.click(getByTestId('tools-connection-create-workflow'));
		expect(emitted()['create-workflow']).toEqual([[]]);
	});

	it('renders the detail view when a detailItem is set', () => {
		const unconnectedMcp = {
			...connectedMcpFixture,
			status: 'none' as const,
			settings: undefined,
		};
		const { queryByTestId, queryByText, queryAllByTestId } = renderWith({
			detailItem: unconnectedMcp,
		});

		expect(queryByTestId('tools-connection-detail')).toBeTruthy();
		const chips = queryAllByTestId('tools-connection-detail-tool');
		expect(chips.length).toBeGreaterThan(0);
		expect(queryByText('search')).toBeTruthy();
		expect(queryByText('create-pages')).toBeTruthy();
		expect(queryByTestId('tools-connection-search')).toBeNull();
	});

	it('routes detailItem to the settings view when detailMode is settings', () => {
		const { queryByTestId } = renderWith({
			detailItem: connectedMcpFixture,
			detailMode: 'settings',
		});
		expect(queryByTestId('tools-connection-settings')).toBeTruthy();
		expect(queryByTestId('tools-connection-detail')).toBeNull();
	});

	it('renders the slotted settings body when a consumer supplies #settings-body', () => {
		const { queryByTestId } = renderWithMcpSettingsSlot(connectedMcpFixture);
		expect(queryByTestId('tools-connection-settings')).toBeTruthy();
		expect(queryByTestId('tools-connection-settings-inclusion')).toBeTruthy();
		expect(queryByTestId('tools-connection-settings-save')).toBeTruthy();
		expect(queryByTestId('tools-connection-settings-remove')).toBeTruthy();
	});

	it('renders an empty settings body when no #settings-body slot is supplied', () => {
		const { queryByTestId } = renderWith({
			detailItem: connectedMcpFixture,
			detailMode: 'settings',
		});
		expect(queryByTestId('tools-connection-settings')).toBeTruthy();
		expect(queryByTestId('tools-connection-settings-inclusion')).toBeNull();
		expect(queryByTestId('tools-connection-settings-save')).toBeNull();
	});

	it('hides the tab strip when only one category is declared', () => {
		const { queryByTestId } = renderWith({ categories: ['mcp'] });

		expect(queryByTestId('tools-connection-tabs')).toBeNull();
	});

	it('renders a tab for every declared category, including empty ones', () => {
		const { getByTestId } = renderWith({
			items: [],
			categories: ['mcp', 'workflows'],
		});

		expect(getByTestId('tools-connection-tabs')).toBeTruthy();
		expect(getByTestId('tab-mcp')).toBeTruthy();
		expect(getByTestId('tab-workflows')).toBeTruthy();
	});

	it('only offers the community tab once there is something in it', () => {
		const withoutCommunity = realisticItems.filter((item) => item.category !== 'community');
		const categories: ToolCategoryKey[] = ['mcp', 'community', 'workflows'];

		const bare = renderWith({ items: withoutCommunity, categories });
		expect(bare.queryByTestId('tab-community')).toBeNull();
		// Other declared categories still show while empty.
		expect(bare.queryByTestId('tab-workflows')).toBeTruthy();

		bare.unmount();

		const populated = renderWith({ categories });
		expect(populated.queryByTestId('tab-community')).toBeTruthy();
	});

	it('states a count on every tab, zero included', () => {
		const items = realisticItems.filter((item) => item.status !== 'connected');
		const { getByTestId } = renderWith({ items, categories: ALL_CATEGORIES });

		expect(getByTestId('tab-ai').textContent).toContain('(2)');
		expect(getByTestId('tab-workflows').textContent).toContain('(2)');
		// A zero is stated rather than dropped, so an empty tab is not mistaken
		// for one that has not loaded yet.
		expect(getByTestId('tab-connected').textContent).toContain('(0)');
	});

	it('caps large counts at 99+', () => {
		const items = [...makeLargeMcpList(150), ...realisticItems];
		const { getByTestId } = renderWith({ items, categories: ALL_CATEGORIES });

		expect(getByTestId('tab-mcp').textContent).toContain('(99+)');
		expect(getByTestId('tab-ai').textContent).toContain('(2)');
	});

	it('narrows the counts to the search without removing any tab', async () => {
		const { getByTestId, getByPlaceholderText } = renderWith({ categories: ALL_CATEGORIES });

		const inputEl = getByPlaceholderText('Search all tools...') as HTMLInputElement;
		await fireEvent.update(inputEl, 'openai');

		await waitFor(() => {
			expect(getByTestId('tab-ai').textContent).toContain('(1)');
		});
		// Categories with no hits stay in the strip, reading zero.
		expect(getByTestId('tab-workflows').textContent).toContain('(0)');
		expect(getByTestId('tab-connected').textContent).toContain('(0)');
	});

	it('filters the list down to the clicked category', async () => {
		const { queryByText, getByTestId } = renderWith({ categories: ALL_CATEGORIES });

		await fireEvent.click(getByTestId('tab-workflows'));
		expect(queryByText('Notion onboarding flow')).toBeTruthy();
		expect(queryByText('OpenAI')).toBeNull();

		await fireEvent.click(getByTestId('tab-ai'));
		expect(queryByText('OpenAI')).toBeTruthy();
		expect(queryByText('Notion onboarding flow')).toBeNull();
	});

	it('stays on the active tab when a search only matches elsewhere', async () => {
		const { getByTestId, getByPlaceholderText, queryByText } = renderWith({
			categories: ALL_CATEGORIES,
		});

		await fireEvent.click(getByTestId('tab-ai'));
		const inputEl = getByPlaceholderText('Search all tools...') as HTMLInputElement;
		await fireEvent.update(inputEl, 'onboarding');

		await waitFor(() => {
			expect(getByTestId('tab-workflows').textContent).toContain('(1)');
		});

		// AI keeps its tab and stays selected; the counts point at the hit.
		expect(getByTestId('tab-ai').textContent).toContain('(0)');
		expect(queryByText('Notion onboarding flow')).toBeNull();
		expect(getByTestId('tools-connection-empty')).toBeTruthy();
	});

	it('keeps the tab strip when a search matches nothing at all', async () => {
		const { getByPlaceholderText, getByTestId } = renderWith({
			categories: ALL_CATEGORIES,
		});

		const inputEl = getByPlaceholderText('Search all tools...') as HTMLInputElement;
		await fireEvent.update(inputEl, 'zzzznomatch');

		await waitFor(() => {
			expect(getByTestId('tools-connection-empty')).toBeTruthy();
		});
		expect(getByTestId('tools-connection-tabs')).toBeTruthy();
		expect(getByTestId('tab-ai').textContent).toContain('(0)');
	});

	it('focuses the search input when the modal opens', async () => {
		const { getByPlaceholderText } = renderWith({ categories: ['mcp'] });

		const inputEl = getByPlaceholderText('Search all tools...') as HTMLInputElement;
		await waitFor(() => {
			expect(document.activeElement).toBe(inputEl);
		});
	});

	it('moves the active row with arrow keys, scrolls to it, and announces it', async () => {
		const { getAllByTestId, getByPlaceholderText, getByRole } = renderWith({
			items: makeLargeMcpList(3),
			categories: ['mcp'],
		});
		const input = getByPlaceholderText('Search all tools...');
		const rows = getAllByTestId('tools-connection-row');
		const status = getByRole('status');

		expect(rows[0]).toHaveAttribute('data-active', 'true');
		expect(input).toHaveAccessibleDescription('tools.connection.search.keyboardInstructions');
		expect(status).toHaveAttribute('aria-live', 'polite');
		expect(status).toHaveTextContent('tools.connection.search.activeItem');

		await fireEvent.keyDown(input, { key: 'ArrowDown' });
		expect(rows[0]).toHaveAttribute('data-active', 'false');
		expect(rows[1]).toHaveAttribute('data-active', 'true');
		expect(scrollToKeyIfNeededMock).toHaveBeenLastCalledWith('item:mcp-generated-1');

		await fireEvent.keyDown(input, { key: 'ArrowUp' });
		expect(rows[0]).toHaveAttribute('data-active', 'true');
		expect(scrollToKeyIfNeededMock).toHaveBeenLastCalledWith('item:mcp-generated-0');
	});

	it('does not intercept arrow keys from an interactive row control', async () => {
		const { getAllByTestId } = renderWith({
			items: makeLargeMcpList(3),
			categories: ['mcp'],
		});
		const rows = getAllByTestId('tools-connection-row');
		const connectButton = getAllByTestId('tools-connection-row-connect')[0];

		connectButton.focus();
		await fireEvent.keyDown(connectButton, { key: 'ArrowDown' });

		expect(rows[0]).toHaveAttribute('data-active', 'true');
		expect(rows[1]).toHaveAttribute('data-active', 'false');
		expect(scrollToKeyIfNeededMock).not.toHaveBeenCalled();
	});

	it('moves to the last and first rows with Meta and arrow keys', async () => {
		const items = makeLargeMcpList(3);
		const { getAllByTestId, getByPlaceholderText } = renderWith({ items, categories: ['mcp'] });
		const input = getByPlaceholderText('Search all tools...');
		const rows = getAllByTestId('tools-connection-row');

		await fireEvent.keyDown(input, { key: 'ArrowDown', metaKey: true });
		expect(rows[2]).toHaveAttribute('data-active', 'true');

		await fireEvent.keyDown(input, { key: 'ArrowUp', metaKey: true });
		expect(rows[0]).toHaveAttribute('data-active', 'true');
	});

	it('keeps arrow navigation inside the list bounds', async () => {
		const items = makeLargeMcpList(3);
		const { getAllByTestId, getByPlaceholderText } = renderWith({ items, categories: ['mcp'] });
		const input = getByPlaceholderText('Search all tools...');
		const rows = getAllByTestId('tools-connection-row');

		await fireEvent.keyDown(input, { key: 'ArrowUp' });
		expect(rows[0]).toHaveAttribute('data-active', 'true');

		for (let index = 0; index < items.length + 1; index++) {
			await fireEvent.keyDown(input, { key: 'ArrowDown' });
		}
		expect(rows[2]).toHaveAttribute('data-active', 'true');
	});

	it('opens the active row when Enter is pressed in the search input', async () => {
		const items = makeLargeMcpList(3);
		const { emitted, getByPlaceholderText } = renderWith({ items, categories: ['mcp'] });
		const input = getByPlaceholderText('Search all tools...');

		await fireEvent.keyDown(input, { key: 'ArrowDown' });
		await fireEvent.keyDown(input, { key: 'Enter' });

		expect(emitted()['open-detail']?.[0]).toEqual([items[1]]);
		expect(emitted()['update:detailItem']?.[0]).toEqual([items[1]]);
	});

	it('returns from detail on Backspace and restores focus to search', async () => {
		const Host = {
			components: { ToolsConnectionModal },
			data() {
				return { detailItem: realisticItems[2] };
			},
			template: `
				<ToolsConnectionModal
					:open="true"
					:items="realisticItems"
					:categories="['mcp']"
					:detail-item="detailItem"
					@update:detail-item="detailItem = $event"
				/>
			`,
			setup() {
				return { realisticItems };
			},
		};
		const { getByPlaceholderText, getByRole } = render(Host, {
			pinia: createTestingPinia(),
		});

		await fireEvent.keyDown(getByRole('dialog'), { key: 'Backspace' });
		const input = getByPlaceholderText('Search all tools...');
		await waitFor(() => expect(document.activeElement).toBe(input));
	});

	it('resets and scrolls to the active row when the category changes', async () => {
		const mcpItems = makeLargeMcpList(2);
		const aiItem: ToolConnectionItem = {
			...mcpItems[0],
			id: 'ai-1',
			category: 'ai',
		};
		const { getAllByTestId, getByPlaceholderText, getByTestId } = renderWith({
			items: [...mcpItems, aiItem],
			categories: ['mcp', 'ai'],
		});
		const input = getByPlaceholderText('Search all tools...');

		await fireEvent.keyDown(input, { key: 'ArrowDown' });
		expect(getAllByTestId('tools-connection-row')[1]).toHaveAttribute('data-active', 'true');

		await fireEvent.click(getByTestId('tab-ai'));
		await waitFor(() =>
			expect(getAllByTestId('tools-connection-row')[0]).toHaveAttribute('data-active', 'true'),
		);
		expect(scrollToKeyIfNeededMock).toHaveBeenLastCalledWith('item:ai-1');
	});

	it('selects a row only after the pointer position changes', async () => {
		const { getAllByTestId, getByPlaceholderText, getByRole } = renderWith({
			categories: ['mcp'],
		});
		const input = getByPlaceholderText('Search all tools...');
		const rows = getAllByTestId('tools-connection-row');

		await fireEvent.keyDown(input, { key: 'ArrowDown' });
		await fireEvent.pointerMove(getByRole('dialog'), { clientX: 0, clientY: 0 });
		await fireEvent.pointerMove(rows[2], { clientX: 0, clientY: 0 });
		expect(rows[1]).toHaveAttribute('data-active', 'true');

		await fireEvent.pointerMove(rows[2], { clientX: 1, clientY: 1 });
		expect(rows[2]).toHaveAttribute('data-active', 'true');
	});

	it('resets the active row when the search changes', async () => {
		const items = makeLargeMcpList(12);
		const { getAllByTestId, getByPlaceholderText } = renderWith({ items, categories: ['mcp'] });
		const input = getByPlaceholderText('Search all tools...') as HTMLInputElement;

		for (let index = 0; index < 5; index++) {
			await fireEvent.keyDown(input, { key: 'ArrowDown' });
		}
		await fireEvent.update(input, '#1');

		await waitFor(() => {
			const remainingRows = getAllByTestId('tools-connection-row');
			expect(remainingRows).toHaveLength(4);
			expect(remainingRows[0]).toHaveAttribute('data-active', 'true');
			expect(remainingRows[3]).toHaveAttribute('data-active', 'false');
		});
	});

	it('shows the empty state when search has no results', async () => {
		const { getByPlaceholderText, getByTestId } = renderWith({ categories: ['mcp'] });
		const input = getByPlaceholderText('Search all tools...') as HTMLInputElement;

		await fireEvent.update(input, 'zzzznomatch');
		await waitFor(() => expect(getByTestId('tools-connection-empty')).toBeTruthy());
	});

	it('restores the tab, search text and scroll offset after stepping aside for another dialog', async () => {
		const { getByTestId, getByPlaceholderText, rerender } = renderWith({
			categories: ALL_CATEGORIES,
		});

		await fireEvent.click(getByTestId('tab-ai'));
		await fireEvent.update(getByPlaceholderText('Search all tools...'), 'openai');
		await waitFor(() => {
			expect(getByTestId('tab-ai').textContent).toContain('(1)');
		});

		scrollTopValue.current = 240;
		await rerender({ open: false });
		await rerender({ open: true });

		const inputEl = getByPlaceholderText('Search all tools...') as HTMLInputElement;
		expect(inputEl.value).toBe('openai');
		expect(getByTestId('tab-ai').getAttribute('aria-selected')).toBe('true');
		await waitFor(() => {
			expect(scrollToMock).toHaveBeenCalledWith(240);
		});
	});

	it('emits update:detailItem(null) when the back button is clicked', async () => {
		const unconnectedMcp = {
			...connectedMcpFixture,
			status: 'none' as const,
			settings: undefined,
		};
		const { getByTestId, emitted } = renderWith({ detailItem: unconnectedMcp });

		await fireEvent.click(getByTestId('tools-connection-detail-back'));
		expect(emitted()['update:detailItem']).toBeTruthy();
		expect(emitted()['update:detailItem']?.[0]).toEqual([null]);
	});

	it('emits open-detail when a row is clicked', async () => {
		const { getAllByTestId, emitted } = renderWith({ categories: ['mcp'] });

		const rows = getAllByTestId('tools-connection-row-main');
		await fireEvent.click(rows[0]);

		expect(emitted()['open-detail']).toBeTruthy();
		expect(emitted()['update:detailItem']).toBeTruthy();
	});

	it('forwards connect when a row connect button is clicked', async () => {
		const { getAllByTestId, emitted } = renderWith({ categories: ['mcp'] });

		await fireEvent.click(getAllByTestId('tools-connection-row-connect')[0]);

		expect(emitted().connect).toBeTruthy();
		expect(emitted()['open-detail']).toBeUndefined();
		expect(emitted()['update:detailItem']).toBeUndefined();
	});

	it('debounces the search query before filtering rows', async () => {
		const { getByPlaceholderText, queryByText } = renderWith({ categories: ['mcp'] });

		const inputEl = getByPlaceholderText('Search all tools...') as HTMLInputElement;
		await fireEvent.update(inputEl, 'gmail');

		await waitFor(() => {
			expect(queryByText('Gmail')).toBeTruthy();
			expect(queryByText('GitHub')).toBeNull();
		});
	});

	it('feeds every flattened row through to the scroller', async () => {
		const items = makeLargeMcpList(300);
		const { getAllByTestId } = renderWith({ items, categories: ['mcp'] });

		await waitFor(() => {
			const rendered = getAllByTestId('tools-connection-row');
			expect(rendered.length).toBe(300);
		});
	});
});
