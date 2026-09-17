import { readFileSync } from 'node:fs';
import userEvent from '@testing-library/user-event';
import { fireEvent } from '@testing-library/vue';
import type { ActionDropdownItem, DropdownMenuItemProps } from '@n8n/design-system';
import { mount } from '@vue/test-utils';
import { describe, expect, it, vi } from 'vitest';

import { createComponentRenderer } from '@/__tests__/render';

import ChatHistoryDropdown from './ChatHistoryDropdown.vue';

vi.mock('@n8n/i18n', async (importOriginal) => ({
	...(await importOriginal<typeof import('@n8n/i18n')>()),
	useI18n: () => ({ baseText: (key: string) => key }),
}));

interface TestItemData {
	updatedAt?: string;
	actions?: Array<ActionDropdownItem<string>>;
}

type TestItem = DropdownMenuItemProps<string, TestItemData>;

const deleteAction: ActionDropdownItem<string> = {
	id: 'delete',
	label: 'Delete',
	icon: 'trash-2',
	variant: 'destructive',
};

function updatedAt(daysAgo: number) {
	const date = new Date();
	date.setDate(date.getDate() - daysAgo);
	date.setHours(12, 0, 0, 0);
	return date.toISOString();
}

function item(id: string, daysAgo: number): TestItem {
	return {
		id,
		label: `${id} conversation`,
		testId: 'chat-history-item',
		data: { updatedAt: updatedAt(daysAgo), actions: [deleteAction] },
	};
}

const dropdownStub = {
	name: 'N8nDropdownMenu',
	template:
		'<div><slot name="trigger" /><div v-for="item in items" :key="item.id"><slot v-if="!item.header" name="item-label" :item="item" :ui="{ class: \'item-label\' }" /><slot v-if="!item.header" name="item-trailing" :item="item" :ui="{ class: \'item-trailing\' }" /></div></div>',
	props: {
		items: { type: Array, default: () => [] },
		modelValue: Boolean,
		dataTestId: String,
		contentTestId: String,
		maxHeight: [String, Number],
		loading: Boolean,
		emptyText: String,
		placement: String,
		searchable: Boolean,
		searchPlaceholder: String,
		width: String,
		extraPopperClass: String,
	},
	emits: ['update:modelValue', 'search', 'select'],
};

const textStub = {
	name: 'N8nText',
	template: '<span><slot /></span>',
	props: ['size', 'color'],
};

function mountHistory(items: TestItem[]) {
	return mount(ChatHistoryDropdown, {
		props: {
			items,
			searchPlaceholder: 'Search history',
			contentTestId: 'chat-history-list',
			actionButtonLabel: 'Conversation actions',
		},
		slots: { trigger: '<button>History</button>' },
		global: {
			stubs: {
				ActionDropdown: { template: '<div />' },
				DropdownMenu: dropdownStub,
				N8nActionDropdown: { template: '<div />' },
				N8nDropdownMenu: dropdownStub,
				N8nIconButton: { template: '<button />' },
				N8nText: textStub,
				Text: textStub,
			},
		},
	});
}

describe('ChatHistoryDropdown', () => {
	it('uses one width and label style for four ordered date groups', async () => {
		const week = item('week', 3);
		const wrapper = mountHistory([item('today', 0), item('yesterday', 1), week, item('older', 8)]);
		const dropdown = wrapper.getComponent({ name: 'N8nDropdownMenu' });

		expect(dropdown.props()).toMatchObject({
			placement: 'bottom-start',
			searchable: true,
			width: 'calc(var(--spacing--5xl) + var(--spacing--3xl) + var(--spacing--xl))',
		});
		expect(dropdown.props('extraPopperClass')).toMatch(/menuContent/);
		expect(
			readFileSync('src/features/ai/shared/components/ChatHistoryDropdown.vue', 'utf8'),
		).toMatch(/\.menuContent\s*\{[^}]*width:\s*var\(--n8n--dropdown-menu-width\)/s);
		expect(dropdown.props('items').map((menuItem: TestItem) => menuItem.id)).toEqual([
			'group-Today',
			'today',
			'group-Yesterday',
			'yesterday',
			'group-This week',
			'week',
			'group-Older',
			'older',
		]);
		expect(wrapper.findAllComponents({ name: 'N8nText' })).toHaveLength(4);
		expect(
			wrapper
				.findAllComponents({ name: 'N8nText' })
				.every((label) => label.props('size') === 'medium'),
		).toBe(true);

		dropdown.vm.$emit('search', 'week');
		await wrapper.setProps({ items: [week] });

		expect(wrapper.emitted('search')).toEqual([['week']]);
		expect(dropdown.props('items').map((menuItem: TestItem) => menuItem.id)).toEqual([
			'group-This week',
			'week',
		]);
	});

	it('keeps nested actions interactive by mouse and keyboard without selecting the row', async () => {
		const user = userEvent.setup();
		const renderHistory = createComponentRenderer(ChatHistoryDropdown);
		const result = renderHistory({
			props: {
				items: [item('today', 0)],
				searchPlaceholder: 'Search history',
				contentTestId: 'chat-history-list',
				actionButtonLabel: 'Conversation actions',
			},
			slots: { trigger: '<button data-test-id="history-trigger">History</button>' },
		});
		await fireEvent.click(result.getByTestId('history-trigger'));
		const row = result.getByTestId('chat-history-item');
		const rowPointerDown = vi.fn();
		row.addEventListener('pointerdown', rowPointerDown);

		await user.click(result.getByLabelText('Conversation actions'));

		expect(rowPointerDown).toHaveBeenCalledOnce();
		expect(await result.findByText('Delete')).toBeInTheDocument();
		expect(result.getByTestId('chat-history-list')).toBeInTheDocument();
		expect(result.emitted().select).toBeUndefined();

		await user.click(result.getByText('Delete'));
		expect(result.emitted().action).toEqual([['delete', 'today']]);

		const search = result.getByPlaceholderText('Search history');
		search.focus();
		await user.keyboard('{ArrowDown}');
		await user.tab();
		expect(result.getByLabelText('Conversation actions')).toHaveFocus();
		await user.keyboard('{Enter}');
		expect(await result.findByText('Delete')).toBeInTheDocument();
		expect(result.emitted().select).toBeUndefined();
	});

	it('uses the compact action margin on touch and hover layouts', () => {
		const source = readFileSync(
			'src/features/ai/shared/components/ChatHistoryDropdown.vue',
			'utf8',
		);

		expect(source).toMatch(
			/\.actionDropdown\s*\{[^}]*margin-block:\s*calc\(var\(--spacing--2xs\) \* -1\)/s,
		);
		expect(source.indexOf('.actionDropdown {')).toBeLessThan(
			source.indexOf('@media (hover: hover)'),
		);
	});
});
