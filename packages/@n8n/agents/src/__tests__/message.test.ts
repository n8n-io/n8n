import { getCreatedAt } from '../sdk/message';
import type { AgentMessage } from '../types/sdk/message';

function userMessage(partial: Partial<AgentMessage> & { createdAt?: unknown }): AgentMessage {
	return partial as AgentMessage;
}

describe('getCreatedAt', () => {
	it('returns the Date when createdAt is a valid Date', () => {
		const d = new Date('2020-06-15T12:00:00.000Z');
		expect(
			getCreatedAt(
				userMessage({
					role: 'user',
					content: [{ type: 'text', text: 'hi' }],
					createdAt: d,
				}),
			),
		).toBe(d);
	});

	it('parses a valid ISO string', () => {
		const iso = '2021-03-01T08:30:00.000Z';
		const got = getCreatedAt(
			userMessage({
				role: 'user',
				content: [{ type: 'text', text: 'hi' }],
				createdAt: iso,
			}),
		);
		expect(got).not.toBeNull();
		expect(got!.getTime()).toBe(new Date(iso).getTime());
	});

	it('parses a valid epoch ms number', () => {
		const ms = 1_700_000_000_000;
		const got = getCreatedAt(
			userMessage({
				role: 'user',
				content: [{ type: 'text', text: 'hi' }],
				createdAt: ms,
			}),
		);
		expect(got).not.toBeNull();
		expect(got!.getTime()).toBe(ms);
	});

	it('returns null for a string that does not parse to a date (avoids NaN times)', () => {
		expect(
			getCreatedAt(
				userMessage({
					role: 'user',
					content: [{ type: 'text', text: 'hi' }],
					createdAt: 'not-a-valid-date',
				}),
			),
		).toBeNull();
	});

	it('returns null for an empty date string (Invalid Date)', () => {
		expect(
			getCreatedAt(
				userMessage({
					role: 'user',
					content: [{ type: 'text', text: 'hi' }],
					createdAt: '',
				}),
			),
		).toBeNull();
	});

	it('returns null when createdAt is NaN as a number (avoids NaN times)', () => {
		expect(
			getCreatedAt(
				userMessage({
					role: 'user',
					content: [{ type: 'text', text: 'hi' }],
					createdAt: Number.NaN,
				}),
			),
		).toBeNull();
	});

	it('returns null when the message has no createdAt', () => {
		expect(
			getCreatedAt(
				userMessage({
					role: 'user',
					content: [{ type: 'text', text: 'hi' }],
				}),
			),
		).toBeNull();
	});
});
