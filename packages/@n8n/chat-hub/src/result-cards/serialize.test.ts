import type { ResultCard } from '@n8n/api-types';

import { appendCardsToMessage, normalizeDeclaredCards, toCardCommand } from './serialize';

const card: ResultCard = {
	type: 'keyValue',
	title: 'Weekly summary',
	pairs: [{ key: 'Total', value: '12 </command:card>' }],
};

describe('toCardCommand', () => {
	it('wraps JSON in the command tags and escapes < so values cannot close the tag', () => {
		const command = toCardCommand(card);
		expect(command.startsWith('<command:card>{')).toBe(true);
		expect(command.endsWith('}</command:card>')).toBe(true);
		expect(command.slice('<command:card>'.length, -'</command:card>'.length)).not.toContain(
			'</command:card>',
		);
		expect(JSON.parse(command.slice('<command:card>'.length, -'</command:card>'.length))).toEqual(
			card,
		);
	});
});

describe('appendCardsToMessage', () => {
	it('returns the message unchanged when there are no cards', () => {
		expect(appendCardsToMessage('Done.', [])).toBe('Done.');
		expect(appendCardsToMessage(undefined, [])).toBe('');
	});

	it('appends at most three commands after a blank line', () => {
		const out = appendCardsToMessage('Done.', [card, card, card, card]);
		expect(out.startsWith('Done.\n\n<command:card>')).toBe(true);
		expect(out.match(/<command:card>/g)).toHaveLength(3);
	});

	it('emits only commands when there is no text', () => {
		expect(appendCardsToMessage(undefined, [card])).toBe(toCardCommand(card));
	});
});

describe('normalizeDeclaredCards', () => {
	it('accepts a single card and stamps source declared', () => {
		expect(normalizeDeclaredCards(card)).toEqual({
			type: 'cards',
			text: undefined,
			cards: [{ ...card, source: 'declared' }],
		});
	});

	it('accepts a cards envelope and keeps an explicit source', () => {
		const out = normalizeDeclaredCards({
			type: 'cards',
			text: 'Hi',
			cards: [{ ...card, source: 'jev' }],
		});
		expect(out?.text).toBe('Hi');
		expect(out?.cards[0].source).toBe('jev');
	});

	it('returns null for anything else', () => {
		expect(normalizeDeclaredCards('text')).toBeNull();
		expect(normalizeDeclaredCards({ output: 'x' })).toBeNull();
		expect(normalizeDeclaredCards({ type: 'cards', cards: [] })).toBeNull();
	});
});
