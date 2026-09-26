import { chatHubMessageWithButtonsSchema } from '../chat-hub';
import { chatHubMessageCardsSchema, resultCardSchema } from '../chat-hub-result-card';

/** Valid baseline; each negative records test below overrides exactly one field. */
const validRecordsCard = {
	type: 'records',
	title: 'Added 2 rows to Leads',
	target: 'Leads',
	operation: 'append',
	columns: ['a', 'b', 'c', 'd'],
	rows: [['1', '2', '3', '4']],
	total: 2,
};

describe('resultCardSchema', () => {
	it('accepts a valid email card', () => {
		const result = resultCardSchema.safeParse({
			type: 'email',
			title: 'Sent to Anna Kowalski',
			direction: 'sent',
			to: ['anna@example.com'],
			subject: 'Invoice #1042 approved',
		});
		expect(result.success).toBe(true);
	});

	it('rejects a non-https action href', () => {
		const result = resultCardSchema.safeParse({
			type: 'keyValue',
			title: 'x',
			pairs: [{ key: 'a', value: 'b' }],
			actions: [{ label: 'Open', href: 'http://example.com' }],
		});
		expect(result.success).toBe(false);
	});

	it('accepts a valid records card with 4 columns and 4-cell rows', () => {
		expect(resultCardSchema.safeParse(validRecordsCard).success).toBe(true);
	});

	it('rejects more than 4 record columns', () => {
		expect(
			resultCardSchema.safeParse({ ...validRecordsCard, columns: ['a', 'b', 'c', 'd', 'e'] })
				.success,
		).toBe(false);
	});

	it('rejects a record row with more than 4 cells', () => {
		expect(
			resultCardSchema.safeParse({ ...validRecordsCard, rows: [['1', '2', '3', '4', '5']] })
				.success,
		).toBe(false);
	});

	it('rejects titles over 80 chars', () => {
		expect(resultCardSchema.safeParse({ ...validRecordsCard, title: 'x'.repeat(81) }).success).toBe(
			false,
		);
	});

	it('accepts the whole-message cards envelope with up to 3 cards', () => {
		const card = { type: 'keyValue', title: 't', pairs: [{ key: 'k', value: 'v' }] };
		expect(chatHubMessageCardsSchema.safeParse({ type: 'cards', cards: [card] }).success).toBe(
			true,
		);
		expect(
			chatHubMessageCardsSchema.safeParse({ type: 'cards', cards: [card, card, card] }).success,
		).toBe(true);
		expect(
			chatHubMessageCardsSchema.safeParse({ type: 'cards', cards: [card, card, card, card] })
				.success,
		).toBe(false);
	});

	it('accepts tone, unsplash cover and nodeTypes, rejects other cover hosts', () => {
		const base = { type: 'keyValue', title: 't', pairs: [{ key: 'k', value: 'v' }] };
		expect(
			resultCardSchema.safeParse({ ...base, tone: 'forest', nodeTypes: ['n8n-nodes-base.gmail'] })
				.success,
		).toBe(true);
		expect(
			resultCardSchema.safeParse({
				...base,
				cover: { src: 'https://images.unsplash.com/photo-1?w=800', alt: 'court' },
			}).success,
		).toBe(true);
		expect(
			resultCardSchema.safeParse({ ...base, cover: { src: 'https://example.com/a.jpg' } }).success,
		).toBe(false);
		expect(resultCardSchema.safeParse({ ...base, tone: 'neon' }).success).toBe(false);
	});
});

describe('chatHubMessageWithButtonsSchema', () => {
	const buttons = {
		type: 'with-buttons',
		text: 'Approve?',
		blockUserInput: true,
		buttons: [{ text: 'Yes', link: 'https://example.com/yes', type: 'primary' }],
	};
	const card = { type: 'keyValue', title: 't', pairs: [{ key: 'k', value: 'v' }] };

	it('still accepts a buttons message without cards', () => {
		const result = chatHubMessageWithButtonsSchema.safeParse(buttons);
		expect(result.success).toBe(true);
		if (result.success) expect(result.data.cards).toBeUndefined();
	});

	it('accepts up to 3 result cards alongside the buttons', () => {
		const result = chatHubMessageWithButtonsSchema.safeParse({ ...buttons, cards: [card, card] });
		expect(result.success).toBe(true);
		if (result.success) expect(result.data.cards).toHaveLength(2);
		expect(
			chatHubMessageWithButtonsSchema.safeParse({ ...buttons, cards: [card, card, card, card] })
				.success,
		).toBe(false);
	});

	it('rejects cards that do not match the result card schema', () => {
		expect(
			chatHubMessageWithButtonsSchema.safeParse({ ...buttons, cards: [{ type: 'email' }] }).success,
		).toBe(false);
	});
});
