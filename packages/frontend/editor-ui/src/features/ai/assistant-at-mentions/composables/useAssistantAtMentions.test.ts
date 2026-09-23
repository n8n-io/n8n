import { nextTick, ref } from 'vue';
import { describe, expect, it } from 'vitest';

import { useAssistantAtMentions } from './useAssistantAtMentions';

function setup(initialText = '') {
	const text = ref(initialText);
	const enabled = ref(true);
	const input = document.createElement('textarea');
	input.value = initialText;
	document.body.appendChild(input);
	const mentions = useAssistantAtMentions({
		text,
		enabled,
		getInputElement: () => input,
	});
	return { text, enabled, input, mentions };
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

	it('does not open for an email-like value', async () => {
		const { input, mentions } = setup();
		input.value = 'user@';
		input.setSelectionRange(5, 5);
		await mentions.handleTextChange('user@');

		expect(mentions.menuOpen.value).toBe(false);
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
