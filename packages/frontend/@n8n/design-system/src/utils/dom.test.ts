import { afterEach, describe, expect, it } from 'vitest';

import { isInteractiveElementInFocus } from './dom';

afterEach(() => {
	document.body.innerHTML = '';
});

describe('isInteractiveElementInFocus', () => {
	it('returns false when a non-interactive element is focused', () => {
		const element = document.createElement('div');
		element.tabIndex = -1;
		document.body.appendChild(element);
		element.focus();

		expect(isInteractiveElementInFocus()).toBe(false);
	});

	it('returns true when an interactive element is focused', () => {
		const input = document.createElement('input');
		document.body.appendChild(input);
		input.focus();

		expect(isInteractiveElementInFocus()).toBe(true);
	});
});
