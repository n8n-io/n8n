import { BadRequestError } from '@n8n/errors';

import { toRestorableMessages } from '../restorable-messages';

describe('toRestorableMessages', () => {
	it('keeps the roles and content of the seed and converts `createdAt` to a date', () => {
		const messages = toRestorableMessages([
			{
				id: 'msg-1',
				createdAt: '2026-01-01T00:00:00.000Z',
				role: 'user',
				content: [{ type: 'text', text: 'Hi' }],
			},
			{ id: 'msg-2', createdAt: '2026-01-01T00:00:01.000Z', type: 'custom', data: {} },
		]);

		expect(messages).toEqual([
			{
				id: expect.any(String),
				createdAt: new Date('2026-01-01T00:00:00.000Z'),
				role: 'user',
				content: [{ type: 'text', text: 'Hi' }],
			},
			{
				id: expect.any(String),
				createdAt: new Date('2026-01-01T00:00:01.000Z'),
				type: 'custom',
				data: {},
			},
		]);
	});

	it('gives the messages new ids on each call, so one seed can restore into many threads', () => {
		const seed = [
			{ id: 'msg-1', createdAt: '2026-01-01T00:00:00.000Z', role: 'user', content: [] },
			{ id: 'msg-2', createdAt: '2026-01-01T00:00:01.000Z', role: 'assistant', content: [] },
		];

		const first = toRestorableMessages(seed).map(({ id }) => id);
		const second = toRestorableMessages(seed).map(({ id }) => id);

		expect(new Set([...first, ...second, 'msg-1', 'msg-2']).size).toBe(6);
		for (const id of [...first, ...second]) expect(id).toMatch(/^[0-9a-f-]{36}$/);
	});

	it.each([
		[{ createdAt: '2026-01-01T00:00:00.000Z', role: 'user', content: [] }],
		[{ id: 'msg-1', createdAt: 'not-a-date', role: 'user', content: [] }],
		[{ id: 'msg-1', createdAt: '2026-01-01T00:00:00.000Z', role: 'user' }],
		[{ id: 'msg-1', createdAt: '2026-01-01T00:00:00.000Z', type: 'custom' }],
	])('rejects a seed message that is not valid: %j', (bad) => {
		expect(() => toRestorableMessages([bad])).toThrow(BadRequestError);
	});

	it('names the index of the first message that is not valid', () => {
		const valid = {
			id: 'msg-1',
			createdAt: '2026-01-01T00:00:00.000Z',
			role: 'user',
			content: [],
		};

		expect(() => toRestorableMessages([valid, { id: 'msg-2' }])).toThrow(/index 1/);
	});
});
