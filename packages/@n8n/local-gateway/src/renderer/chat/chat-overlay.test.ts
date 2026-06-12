// Explicit vitest imports: the renderer tsconfig deliberately has `types: []`,
// so the vitest globals are not ambiently typed here.
import { beforeEach, describe, expect, it } from 'vitest';

import { chatOverlay, closeChat, openChat, setChatTitle } from './chat-overlay';

describe('chat-overlay', () => {
	beforeEach(() => closeChat());

	it('opens with thread id and an initial title', () => {
		openChat('t1', { title: 'Banana prices' });

		expect(chatOverlay).toMatchObject({
			isOpen: true,
			threadId: 't1',
			title: 'Banana prices',
		});
	});

	it('opens without options', () => {
		openChat('t1');

		expect(chatOverlay).toMatchObject({
			isOpen: true,
			threadId: 't1',
			title: null,
		});
	});

	it('close resets the state', () => {
		openChat('t1', { title: 'x' });

		closeChat();

		expect(chatOverlay).toMatchObject({
			isOpen: false,
			threadId: null,
			title: null,
		});
	});

	it('sets the title, but a fallback never overrides a known one', () => {
		openChat('t1');

		setChatTitle('first message…', { fallback: true });
		expect(chatOverlay.title).toBe('first message…');

		setChatTitle('Server title');
		expect(chatOverlay.title).toBe('Server title');

		setChatTitle('another fallback', { fallback: true });
		expect(chatOverlay.title).toBe('Server title');
	});
});
