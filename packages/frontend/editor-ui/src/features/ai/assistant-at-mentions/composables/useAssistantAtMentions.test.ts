import { nextTick, ref } from 'vue';
import { describe, expect, it, vi } from 'vitest';

import { useAssistantAtMentions } from './useAssistantAtMentions';

function setup(initialText = '') {
	const text = ref(initialText);
	const enabled = ref(true);
	const input = document.createElement('textarea');
	const onOpened = vi.fn();
	const onClosed = vi.fn();
	input.value = initialText;
	document.body.appendChild(input);
	const mentions = useAssistantAtMentions({
		text,
		enabled,
		getInputElement: () => input,
		onOpened,
		onClosed,
	});
	return { text, enabled, input, mentions, onOpened, onClosed };
}

describe('useAssistantAtMentions', () => {
	it('opens at the start and after whitespace', async () => {
		const { input, mentions } = setup();
		input.value = '@';
		input.setSelectionRange(1, 1);
		await mentions.handleTextChange('@');
		expect(mentions.menuOpen.value).toBe(true);

		mentions.close();
		input.value = 'Compare @';
		input.setSelectionRange(9, 9);
		await mentions.handleTextChange('Compare @');
		expect(mentions.menuOpen.value).toBe(true);
	});

	it('opens the picker for a fullwidth at sign', async () => {
		const { text, input, mentions } = setup();
		input.value = 'Compare ＠';
		input.setSelectionRange(9, 9);
		await mentions.handleTextChange('Compare ＠');
		expect(mentions.menuOpen.value).toBe(true);

		await mentions.replaceActiveRange('Orders');
		expect(text.value).toBe('Compare "Orders"');
	});

	it('reports typed and button opens once per open state', async () => {
		const { input, mentions, onOpened } = setup();
		input.value = '@';
		input.setSelectionRange(1, 1);
		await mentions.handleTextChange('@');
		await mentions.handleTextChange('@');
		expect(onOpened).toHaveBeenCalledExactlyOnceWith('typed');

		mentions.close();
		mentions.openFromButton();
		mentions.openFromButton();
		expect(onOpened).toHaveBeenNthCalledWith(2, 'button');
	});

	it('does not open for an email-like value', async () => {
		const { input, mentions } = setup();
		input.value = 'user@';
		input.setSelectionRange(5, 5);
		await mentions.handleTextChange('user@');

		expect(mentions.menuOpen.value).toBe(false);
	});

	it('opens when the trigger and query arrive in one input event', async () => {
		const { input, mentions } = setup();
		input.value = 'Compare @ord';
		input.setSelectionRange(input.value.length, input.value.length);

		await mentions.handleTextChange(input.value);

		expect(mentions.menuOpen.value).toBe(true);
		expect(mentions.query.value).toBe('ord');
	});

	it('does not reopen a dismissed trigger when its query changes', async () => {
		const { input, mentions } = setup();
		input.value = '@ord';
		input.setSelectionRange(input.value.length, input.value.length);
		await mentions.handleTextChange(input.value);
		mentions.handleMenuOpenChange(false);

		input.value = '@orde';
		input.setSelectionRange(input.value.length, input.value.length);
		await mentions.handleTextChange(input.value);

		expect(mentions.menuOpen.value).toBe(false);
		mentions.openFromButton();
		mentions.handleMenuOpenChange(false);
		input.value = '@order';
		input.setSelectionRange(input.value.length, input.value.length);
		await mentions.handleTextChange(input.value);
		expect(mentions.menuOpen.value).toBe(false);

		mentions.openFromButton();
		input.value = '@orders';
		input.setSelectionRange(input.value.length, input.value.length);
		await mentions.handleTextChange(input.value);
		expect(mentions.menuOpen.value).toBe(true);
		expect(mentions.query.value).toBe('orders');
		mentions.close();

		input.value = '';
		input.setSelectionRange(0, 0);
		await mentions.handleTextChange('');
		input.value = '@';
		input.setSelectionRange(1, 1);
		await mentions.handleTextChange('@');

		expect(mentions.menuOpen.value).toBe(true);
	});

	it('clears dismissal when the draft is replaced externally', async () => {
		const { text, input, mentions } = setup();
		input.value = '@old';
		input.setSelectionRange(input.value.length, input.value.length);
		await mentions.handleTextChange(input.value);
		mentions.handleMenuOpenChange(false);

		text.value = '@new';
		input.value = '@new';
		input.setSelectionRange(input.value.length, input.value.length);
		await mentions.handleTextChange(input.value);

		expect(mentions.menuOpen.value).toBe(true);
		expect(mentions.query.value).toBe('new');
	});

	it('starts a new range when another whitespace-delimited trigger is typed', async () => {
		const { text, input, mentions } = setup();
		input.value = '@';
		input.setSelectionRange(1, 1);
		await mentions.handleTextChange('@');
		input.value = '@foo @';
		input.setSelectionRange(6, 6);
		await mentions.handleTextChange('@foo @');
		await mentions.replaceActiveRange('Orders');

		expect(text.value).toBe('@foo "Orders"');
	});

	it('replaces only the active typed range and preserves trailing text', async () => {
		const { text, input, mentions } = setup('Compare @ with the current workflow');
		input.value = 'Compare @ with the current workflow';
		input.setSelectionRange(9, 9);
		await mentions.handleTextChange(input.value);

		const value = 'Compare @ord with the current workflow';
		input.value = value;
		input.setSelectionRange(12, 12);
		await mentions.handleTextChange(value);
		await mentions.replaceActiveRange('Orders');

		expect(text.value).toBe('Compare "Orders" with the current workflow');
		expect(input.selectionStart).toBe(16);
	});

	it('uses the saved selection for button insertion', async () => {
		const { text, input, mentions } = setup('Replace this');
		input.setSelectionRange(0, 7);
		mentions.openFromButton();
		await mentions.replaceActiveRange('Orders');

		expect(text.value).toBe('"Orders" this');
	});

	it('removes a typed @ when the menu is dismissed without a query', async () => {
		const { text, input, mentions } = setup('hello @');
		input.focus();
		input.setSelectionRange(7, 7);
		await mentions.handleTextChange('hello @');
		expect(mentions.menuOpen.value).toBe(true);

		mentions.handleMenuOpenChange(false);
		await nextTick();

		expect(mentions.menuOpen.value).toBe(false);
		expect(text.value).toBe('hello ');
		expect(input.selectionStart).toBe(6);
	});

	it('removes a typed @ and the whitespace after it when the menu is dismissed', async () => {
		const { text, input, mentions } = setup('hello @  world');
		input.focus();
		input.setSelectionRange(7, 7);
		await mentions.handleTextChange('hello @  world');
		input.setSelectionRange(9, 9);
		await mentions.handleTextChange('hello @  world');
		expect(mentions.menuOpen.value).toBe(true);
		expect(mentions.query.value).toBe('  ');

		mentions.handleMenuOpenChange(false);
		await nextTick();

		expect(text.value).toBe('hello world');
		expect(input.selectionStart).toBe(6);
	});

	it('keeps a typed @ with a query when the menu is dismissed', async () => {
		const { text, input, mentions } = setup('hello @or');
		input.setSelectionRange(9, 9);
		await mentions.handleTextChange('hello @or');

		mentions.handleMenuOpenChange(false);
		await nextTick();

		expect(text.value).toBe('hello @or');
		input.value = 'hello @ord';
		input.setSelectionRange(10, 10);
		await mentions.handleTextChange('hello @ord');
		expect(mentions.menuOpen.value).toBe(false);
	});

	it('does not touch the draft when a button-opened menu is dismissed', async () => {
		const { text, input, mentions } = setup('Replace this');
		input.setSelectionRange(0, 7);
		mentions.openFromButton();

		mentions.handleMenuOpenChange(false);
		await nextTick();

		expect(mentions.menuOpen.value).toBe(false);
		expect(text.value).toBe('Replace this');
	});

	it('reports why the picker closed', async () => {
		const { enabled, input, mentions, onClosed } = setup();
		async function openTyped(value: string): Promise<void> {
			input.value = value;
			input.setSelectionRange(value.length, value.length);
			await mentions.handleTextChange(value);
			expect(mentions.menuOpen.value).toBe(true);
		}

		await openTyped('@');
		// The host's v-model flips the flag before the menu's close notification arrives.
		mentions.menuOpen.value = false;
		mentions.handleMenuOpenChange(false);
		expect(onClosed).toHaveBeenLastCalledWith({ source: 'typed', reason: 'closed_menu' });

		await openTyped('@ord');
		input.value = 'ord';
		input.setSelectionRange(3, 3);
		await mentions.handleTextChange('ord');
		expect(onClosed).toHaveBeenLastCalledWith(
			expect.objectContaining({ source: 'typed', reason: 'deleted_trigger' }),
		);

		await openTyped('hello @');
		input.setSelectionRange(2, 2);
		await mentions.handleCaretMove();
		expect(onClosed).toHaveBeenLastCalledWith(
			expect.objectContaining({ source: 'typed', reason: 'moved_caret' }),
		);

		await openTyped('@');
		enabled.value = false;
		await nextTick();
		expect(onClosed).toHaveBeenLastCalledWith(
			expect.objectContaining({ source: 'typed', reason: 'unavailable' }),
		);
		enabled.value = true;
		await nextTick();

		mentions.openFromButton();
		await mentions.replaceActiveRange('Orders');
		expect(onClosed).toHaveBeenLastCalledWith(
			expect.objectContaining({ source: 'button', reason: 'selected' }),
		);
		expect(onClosed).toHaveBeenCalledTimes(5);
	});

	it('reports one close per open', async () => {
		const { input, mentions, onClosed } = setup();
		input.value = '@';
		input.setSelectionRange(1, 1);
		await mentions.handleTextChange('@');

		await mentions.replaceActiveRange('Orders');
		// The menu reports its own close after the selection landed.
		mentions.handleMenuOpenChange(false);
		mentions.close();

		expect(onClosed).toHaveBeenCalledExactlyOnceWith(
			expect.objectContaining({ reason: 'selected' }),
		);
	});

	it('closes when the trigger is deleted or mentions are disabled', async () => {
		const { enabled, input, mentions } = setup('@');
		input.setSelectionRange(1, 1);
		await mentions.handleTextChange('@');
		input.value = '';
		input.setSelectionRange(0, 0);
		await mentions.handleTextChange('');
		expect(mentions.menuOpen.value).toBe(false);

		input.value = '@';
		input.setSelectionRange(1, 1);
		await mentions.handleTextChange('@');
		enabled.value = false;
		await nextTick();
		expect(mentions.menuOpen.value).toBe(false);
	});
});
