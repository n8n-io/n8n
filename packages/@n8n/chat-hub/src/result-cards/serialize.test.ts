import type { ResultCard } from '@n8n/api-types';

import { parseMessage } from '../parser';
import { appendCardsToMessage, normalizeDeclaredCards, toCardCommand } from './serialize';

const card: ResultCard = {
	type: 'keyValue',
	title: 'Weekly summary',
	pairs: [{ key: 'Total', value: '12 </command:card>' }],
};

const buttons = {
	type: 'with-buttons',
	text: 'Approve the refund?',
	blockUserInput: true,
	buttons: [
		{ text: 'Yes', link: 'https://example.com/yes', type: 'primary' },
		{ text: 'No', link: 'https://example.com/no', type: 'secondary' },
	],
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

	describe('whole-message JSON replies', () => {
		it('merges cards into a with-buttons message so the client still parses it', () => {
			const out = appendCardsToMessage(JSON.stringify(buttons), [card]);

			expect(out).not.toContain('<command:card>');
			expect(JSON.parse(out)).toEqual({ ...buttons, cards: [card] });
			expect(parseMessage({ type: 'ai', content: out })).toEqual([
				{
					type: 'with-buttons',
					content: buttons.text,
					buttons: buttons.buttons,
					blockUserInput: true,
				},
				{ type: 'card', content: JSON.stringify(card), card, isIncomplete: false },
			]);
		});

		it('appends to the cards a with-buttons message already carries, up to the cap', () => {
			const declared: ResultCard = { ...card, title: 'Declared', source: 'declared' };
			const out = appendCardsToMessage(
				JSON.stringify({ ...buttons, cards: [declared, declared, declared] }),
				[card],
			);
			const parsed = JSON.parse(out) as { cards: ResultCard[] };
			expect(parsed.cards).toEqual([declared, declared, declared]);
		});

		it('merges cards into a cards envelope and keeps the envelope text', () => {
			// Keys in schema order: the envelope is re-serialized after validation.
			const declared: ResultCard = {
				type: 'keyValue',
				title: 'Declared',
				source: 'declared',
				pairs: card.pairs,
			};
			const envelope = { type: 'cards', text: 'This week', cards: [declared] };
			const out = appendCardsToMessage(JSON.stringify(envelope), [card]);

			expect(out).not.toContain('<command:card>');
			expect(JSON.parse(out)).toEqual({ ...envelope, cards: [declared, card] });
			expect(parseMessage({ type: 'ai', content: out })).toEqual([
				{ type: 'text', content: 'This week' },
				{ type: 'card', content: JSON.stringify(declared), card: declared, isIncomplete: false },
				{ type: 'card', content: JSON.stringify(card), card, isIncomplete: false },
			]);
		});

		it('respects the per-message cap when merging into a cards envelope', () => {
			const declared: ResultCard = { ...card, title: 'Declared', source: 'declared' };
			const out = appendCardsToMessage(
				JSON.stringify({ type: 'cards', cards: [declared, declared, declared] }),
				[card],
			);
			const parsed = JSON.parse(out) as { cards: ResultCard[] };
			expect(parsed.cards).toHaveLength(3);
			expect(parsed.cards.every((c) => c.title === 'Declared')).toBe(true);
		});

		it('does not touch the cards themselves when merging', () => {
			const jev: ResultCard = { ...card, source: 'jev' };
			const out = appendCardsToMessage(JSON.stringify(buttons), [jev]);
			expect((JSON.parse(out) as { cards: ResultCard[] }).cards[0].source).toBe('jev');
		});

		it('keeps the text form for JSON that is not a whole-message reply', () => {
			const out = appendCardsToMessage('{"output":"Done."}', [card]);
			expect(out).toBe(`{"output":"Done."}\n\n${toCardCommand(card)}`);
			const broken = appendCardsToMessage('{not json', [card]);
			expect(broken).toBe(`{not json\n\n${toCardCommand(card)}`);
		});

		it('leaves a whole-message JSON reply unchanged when there are no cards', () => {
			const json = JSON.stringify(buttons);
			expect(appendCardsToMessage(json, [])).toBe(json);
		});
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
