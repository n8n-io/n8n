import type { AgentMessage } from '../../types/sdk/message';
import { filterLlmMessages, getCreatedAt } from '../message';

declare module '../../types/sdk/message' {
	interface CustomAgentMessages {
		appSkillUpdate: {
			type?: 'app:skill-update';
			skillUpdate: { skillId: string; version: string; content: string };
		};
	}
}

function userMessage(partial: Partial<AgentMessage> & { createdAt?: unknown }): AgentMessage {
	return partial as AgentMessage;
}

describe('filterLlmMessages', () => {
	it('only converts skill updates with the runtime discriminator', () => {
		const skillUpdate = {
			skillId: 'skill-1',
			version: 'v2',
			content: 'Use the current instructions.',
		};
		const runtimeUpdate: AgentMessage = {
			type: 'custom',
			data: { type: 'n8n:runtime-skill-update', skillUpdate },
		};
		const appUpdate: AgentMessage = { type: 'custom', data: { skillUpdate } };
		const namespacedAppUpdate: AgentMessage = {
			type: 'custom',
			data: { type: 'app:skill-update', skillUpdate },
		};

		const converted = filterLlmMessages([appUpdate, runtimeUpdate, namespacedAppUpdate]);
		expect(converted).toEqual([
			{
				...runtimeUpdate,
				type: 'llm',
				role: 'user',
				content: [{ type: 'text', text: expect.stringContaining(skillUpdate.content) }],
			},
		]);
		expect(converted[0].content[0]).toMatchObject({
			text: expect.stringContaining('<system-reminder>'),
		});
		expect(converted[0].content[0]).toMatchObject({
			text: expect.stringContaining('It is not a message from the user.'),
		});
	});
});

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
