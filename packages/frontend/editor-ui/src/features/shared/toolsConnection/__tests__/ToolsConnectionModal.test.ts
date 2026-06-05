import { beforeEach, describe, it, expect, vi } from 'vitest';
import { fireEvent, waitFor } from '@testing-library/vue';
import { createComponentRenderer, renderComponent } from '@/__tests__/render';
import { createTestingPinia } from '@pinia/testing';

const scrollToKeyMock = vi.hoisted(() => vi.fn());

// N8nDialog teleports out of the tree (Reka UI's DialogPortal) and
// N8nRecycleScroller virtualises by offsetHeight which is 0 in jsdom. Replace
// both with render-all pass-throughs so rows are inspectable inline.
vi.mock('@n8n/design-system', async () => {
	const actual = await vi.importActual<typeof import('@n8n/design-system')>('@n8n/design-system');
	const N8nDialog = {
		name: 'N8nDialog',
		props: ['open', 'size', 'header'],
		emits: ['update:open'],
		template: `
			<div v-if="open" role="dialog">
				<h2>{{ header }}</h2>
				<slot />
			</div>
		`,
	};
	const N8nRecycleScroller = {
		name: 'N8nRecycleScroller',
		props: ['items', 'itemSize', 'itemKey'],
		methods: {
			scrollToKey: scrollToKeyMock,
		},
		template: `
			<div>
				<div v-for="item in items" :key="item[itemKey]">
					<slot :item="item" :update-item-size="() => {}" />
				</div>
			</div>
		`,
	};
	return { ...actual, N8nDialog, N8nRecycleScroller };
});

import ToolsConnectionModal from '../ToolsConnectionModal.vue';
import McpToolSettingsContent from '../McpToolSettingsContent.vue';
import { connectedMcpFixture, makeLargeMcpList, realisticItems } from '../fixtures';
import type { SectionKey, ToolConnectionItem } from '../types';

const renderModal = createComponentRenderer(ToolsConnectionModal);

const ALL_SECTIONS: SectionKey[] = ['connected', 'nodes', 'workflows'];

beforeEach(() => {
	scrollToKeyMock.mockClear();
});

function renderWith(
	props: Partial<{
		items: ToolConnectionItem[];
		sections: SectionKey[];
		detailItem: ToolConnectionItem | null;
		detailMode: 'detail' | 'settings';
	}>,
) {
	return renderModal({
		props: {
			open: true,
			items: props.items ?? realisticItems,
			sections: props.sections ?? ALL_SECTIONS,
			detailItem: props.detailItem ?? null,
			detailMode: props.detailMode,
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
				:sections="[]"
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
	return renderComponent(Host, {
		props: { detailItem },
		pinia: createTestingPinia(),
	});
}

describe('ToolsConnectionModal', () => {
	it('renders only the sections passed via the sections prop', () => {
		const { queryAllByTestId, queryByText } = renderWith({
			sections: ['connected', 'nodes'],
		});

		expect(queryByText('Notion')).toBeTruthy();
		expect(queryByText('GitHub')).toBeTruthy();
		expect(queryByText('OpenAI')).toBeTruthy();
		expect(queryByText('Notion onboarding flow')).toBeNull();

		const headers = queryAllByTestId('tools-connection-section-header').map((el) => el.textContent);
		expect(headers.some((t) => t?.includes('Connect to a service'))).toBe(true);
		expect(headers.some((t) => t?.includes('Connected'))).toBe(false);
	});

	it('renders items from every configured section', () => {
		const { queryByText } = renderWith({ sections: ALL_SECTIONS });

		expect(queryByText('Notion')).toBeTruthy();
		expect(queryByText('GitHub')).toBeTruthy();
		expect(queryByText('OpenAI')).toBeTruthy();
		expect(queryByText('Notion onboarding flow')).toBeTruthy();
	});

	it('keeps connected items in the nodes section when the connected section is omitted', () => {
		const { queryByText, queryAllByText } = renderWith({
			sections: ['nodes'],
		});

		expect(queryByText('Notion')).toBeTruthy();
		expect(queryByText('Slack')).toBeTruthy();
		expect(queryByText('GitHub')).toBeTruthy();
		expect(queryAllByText('Connected').length).toBeGreaterThan(0);
	});

	it('shows the empty state when items is empty', () => {
		const { getByTestId } = renderWith({ items: [] });
		expect(getByTestId('tools-connection-empty')).toBeTruthy();
	});

	it('renders the detail view when a detailItem is set', () => {
		const unconnectedMcp = { ...connectedMcpFixture, isConnected: false, settings: undefined };
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
		expect(queryByTestId('tools-connection-settings-disconnect')).toBeTruthy();
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

	it('shows the tab strip when at least two sections have rows', () => {
		const { queryByTestId } = renderWith({
			sections: ['nodes', 'workflows'],
		});

		expect(queryByTestId('tools-connection-tabs')).toBeTruthy();
	});

	it('hides tabs when sections only span one tab category', async () => {
		const { queryByTestId, getByPlaceholderText } = renderWith({
			sections: ['nodes'],
		});

		expect(queryByTestId('tools-connection-tabs')).toBeNull();

		const inputEl = getByPlaceholderText('Search all tools...') as HTMLInputElement;
		await fireEvent.update(inputEl, 'notion');

		await waitFor(() => {
			expect(queryByTestId('tools-connection-tabs')).toBeNull();
		});
	});

	it('hides tabs when no configured section has rows', () => {
		const { queryByTestId } = renderWith({
			items: [],
			sections: ['nodes', 'workflows'],
		});

		expect(queryByTestId('tools-connection-tabs')).toBeNull();
	});

	it('keeps all matching sections visible after a tab click', async () => {
		const { queryByText, getByPlaceholderText, getByTestId } = renderWith({
			sections: ['nodes', 'workflows'],
		});

		const inputEl = getByPlaceholderText('Search all tools...') as HTMLInputElement;
		await fireEvent.update(inputEl, 'notion');

		const workflowsTab = await waitFor(() => getByTestId('tools-connection-tab-workflows'));
		const servicesTab = getByTestId('tools-connection-tab-services');

		expect(queryByText('Notion onboarding flow')).toBeTruthy();

		await fireEvent.click(workflowsTab);
		expect(queryByText('Notion onboarding flow')).toBeTruthy();
		expect(scrollToKeyMock).toHaveBeenLastCalledWith('header:workflows');

		await fireEvent.click(servicesTab);
		expect(queryByText('Notion onboarding flow')).toBeTruthy();
		expect(scrollToKeyMock).toHaveBeenLastCalledWith('header:nodes');
	});

	it('focuses the search input when the modal opens', async () => {
		const { getByPlaceholderText } = renderWith({ sections: ['nodes'] });

		const inputEl = getByPlaceholderText('Search all tools...') as HTMLInputElement;
		await waitFor(() => {
			expect(document.activeElement).toBe(inputEl);
		});
	});

	it('emits update:detailItem(null) when the back button is clicked', async () => {
		const unconnectedMcp = { ...connectedMcpFixture, isConnected: false, settings: undefined };
		const { getByTestId, emitted } = renderWith({ detailItem: unconnectedMcp });

		await fireEvent.click(getByTestId('tools-connection-detail-back'));
		expect(emitted()['update:detailItem']).toBeTruthy();
		expect(emitted()['update:detailItem']?.[0]).toEqual([null]);
	});

	it('emits open-detail when a row is clicked', async () => {
		const { getAllByTestId, emitted } = renderWith({ sections: ['nodes'] });

		const rows = getAllByTestId('tools-connection-row-main');
		await fireEvent.click(rows[0]);

		expect(emitted()['open-detail']).toBeTruthy();
		expect(emitted()['update:detailItem']).toBeTruthy();
	});

	it('forwards connect when a row connect button is clicked', async () => {
		const { getAllByTestId, emitted } = renderWith({ sections: ['nodes'] });

		await fireEvent.click(getAllByTestId('tools-connection-row-connect')[0]);

		expect(emitted().connect).toBeTruthy();
		expect(emitted()['open-detail']).toBeUndefined();
		expect(emitted()['update:detailItem']).toBeUndefined();
	});

	it('debounces the search query before filtering rows', async () => {
		const { getByPlaceholderText, queryByText } = renderWith({ sections: ['nodes'] });

		const inputEl = getByPlaceholderText('Search all tools...') as HTMLInputElement;
		await fireEvent.update(inputEl, 'gmail');

		await waitFor(() => {
			expect(queryByText('Gmail')).toBeTruthy();
			expect(queryByText('GitHub')).toBeNull();
		});
	});

	it('feeds every flattened row through to the scroller', async () => {
		const items = makeLargeMcpList(300);
		const { getAllByTestId } = renderWith({ items, sections: ['nodes'] });

		await waitFor(() => {
			const rendered = getAllByTestId('tools-connection-row');
			expect(rendered.length).toBe(300);
		});
	});
});
