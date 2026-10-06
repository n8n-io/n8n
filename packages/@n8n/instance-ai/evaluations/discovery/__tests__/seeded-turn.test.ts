import { buildTurnMessage, createSeededMemory, STUB_PROJECT_ID } from '../seeded-turn';
import type { DiscoveryScenario } from '../types';

const seed = {
	mode: 'inline',
	messages: [
		{
			id: 'm1',
			role: 'user',
			type: 'llm',
			createdAt: '2026-10-01T10:00:00.000Z',
			content: [{ type: 'text', text: 'Build me a daily report.' }],
		},
	],
	workflows: [{ id: 'wf-report', name: 'Daily report', nodes: [], connections: {} }],
	dataTables: [],
	folders: [],
	agents: [{ id: 'agent-hr', config: { name: 'HR helper' } }],
	projects: [],
	priorRuns: [],
} as unknown as NonNullable<DiscoveryScenario['seed']>;

describe('buildTurnMessage', () => {
	it('returns the user message when nothing is open', () => {
		expect(buildTurnMessage({ userMessage: 'Hi', seed })).toBe('Hi');
	});

	it('puts the open workflow in a thread-context block before the user message', () => {
		const message = buildTurnMessage({
			userMessage: 'Why did it fail?',
			seed,
			attach: { workflow: 'wf-report' },
		});

		expect(message).toMatch(
			/^<thread-context>[\s\S]*wf-report[\s\S]*Daily report[\s\S]*<\/thread-context>\n\nWhy did it fail\?$/,
		);
	});

	it('names the open Agent and its project', () => {
		const message = buildTurnMessage({
			userMessage: 'Add a skill.',
			seed,
			attach: { agent: 'agent-hr' },
		});

		expect(message).toContain('agent-hr');
		expect(message).toContain('HR helper');
		expect(message).toContain(STUB_PROJECT_ID);
	});
});

describe('createSeededMemory', () => {
	it('returns no memory without earlier messages', async () => {
		expect(await createSeededMemory('thread-1', 'user-1', [])).toBeUndefined();
	});

	it('holds the earlier messages in the thread', async () => {
		const memory = await createSeededMemory('thread-1', 'user-1', seed.messages);

		const messages = await memory?.getMessages('thread-1');
		expect(messages).toHaveLength(1);
		expect(messages?.[0]).toMatchObject({
			id: 'm1',
			role: 'user',
			createdAt: new Date('2026-10-01T10:00:00.000Z'),
		});
	});
});
