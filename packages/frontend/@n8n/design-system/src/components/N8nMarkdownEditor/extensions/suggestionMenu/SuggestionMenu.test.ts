import { mount } from '@vue/test-utils';
import type { SuggestionKeyDownProps } from '@tiptap/suggestion';
import { nextTick } from 'vue';

import SuggestionMenu from './SuggestionMenu.vue';
import type { SuggestionMenuItem } from './types';

const items: SuggestionMenuItem[] = [
	{ id: 'paragraph', label: 'Text', icon: 'type' },
	{ id: 'heading-1', label: 'Heading 1', icon: 'heading-1' },
	{ id: 'heading-2', label: 'Heading 2', icon: 'heading-2' },
];

const stubs = {
	N8nIcon: { template: '<span data-test-id="icon" />' },
	N8nPopover: {
		template: '<div><slot name="trigger" /><slot name="content" /></div>',
		props: ['open', 'reference', 'contentClass', 'contentRole'],
	},
};

const renderMenu = (props: Partial<InstanceType<typeof SuggestionMenu>['$props']> = {}) =>
	mount(SuggestionMenu, {
		props: {
			items,
			ariaLabel: 'Markdown commands',
			dataTestId: 'markdown-slash-command-menu',
			itemDataTestIdPrefix: 'markdown-slash-command',
			...props,
		},
		global: { stubs },
	});

const keydownProps = (key: string, metaKey = false): SuggestionKeyDownProps => ({
	event: new KeyboardEvent('keydown', { key, metaKey }),
	view: {} as SuggestionKeyDownProps['view'],
	range: { from: 0, to: 0 },
});

describe('SuggestionMenu', () => {
	beforeEach(() => {
		Element.prototype.scrollIntoView = vi.fn();
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	it('selects the first item by default', () => {
		const wrapper = renderMenu();
		const options = wrapper.findAll('[role="option"]');

		expect(options[0].attributes('aria-selected')).toBe('true');
		expect(options[1].attributes('aria-selected')).toBe('false');
	});

	it('moves selection down and up with arrow keys', async () => {
		const wrapper = renderMenu();

		expect(wrapper.vm.onKeyDown(keydownProps('ArrowDown'))).toBe(true);
		await nextTick();
		expect(wrapper.findAll('[role="option"]')[1].attributes('aria-selected')).toBe('true');

		expect(wrapper.vm.onKeyDown(keydownProps('ArrowDown'))).toBe(true);
		await nextTick();
		expect(wrapper.findAll('[role="option"]')[2].attributes('aria-selected')).toBe('true');

		expect(wrapper.vm.onKeyDown(keydownProps('ArrowDown'))).toBe(true);
		await nextTick();
		expect(wrapper.findAll('[role="option"]')[2].attributes('aria-selected')).toBe('true');

		expect(wrapper.vm.onKeyDown(keydownProps('ArrowUp'))).toBe(true);
		await nextTick();
		expect(wrapper.findAll('[role="option"]')[1].attributes('aria-selected')).toBe('true');
	});

	it('jumps to first and last item with meta arrow keys', async () => {
		const wrapper = renderMenu({ selectedIndex: 1 });

		expect(wrapper.vm.onKeyDown(keydownProps('ArrowDown', true))).toBe(true);
		await nextTick();
		expect(wrapper.findAll('[role="option"]')[2].attributes('aria-selected')).toBe('true');

		expect(wrapper.vm.onKeyDown(keydownProps('ArrowUp', true))).toBe(true);
		await nextTick();
		expect(wrapper.findAll('[role="option"]')[0].attributes('aria-selected')).toBe('true');
	});

	it('emits the active item on enter', async () => {
		const wrapper = renderMenu();

		wrapper.vm.onKeyDown(keydownProps('ArrowDown'));
		await nextTick();
		expect(wrapper.vm.onKeyDown(keydownProps('Enter'))).toBe(true);

		expect(wrapper.emitted('select')).toEqual([[items[1]]]);
	});

	it('does not handle unrelated keys', () => {
		const wrapper = renderMenu();

		expect(wrapper.vm.onKeyDown(keydownProps('Backspace'))).toBe(false);
		expect(wrapper.emitted('select')).toBeUndefined();
	});

	it('emits clicked item', async () => {
		const wrapper = renderMenu();

		await wrapper.find('[data-test-id="markdown-slash-command-heading-2"]').trigger('click');

		expect(wrapper.emitted('select')).toEqual([[items[2]]]);
	});

	it('scrolls the active item into view when selection changes', async () => {
		const wrapper = renderMenu();

		wrapper.vm.onKeyDown(keydownProps('ArrowDown'));
		await nextTick();
		await nextTick();

		expect(Element.prototype.scrollIntoView).toHaveBeenCalledWith({ block: 'nearest' });
	});
});
