import type { AgentMessage } from '@n8n/agents';

import { EvalAgentThreadStore, planThreadTurn } from '../agent-eval-threads';

const HOUR = 60 * 60 * 1000;
const MAX_ENTRIES = 500;

function thread(resourceId: string) {
	return { resourceId, agentId: 'agent-1', userId: 'user-1', messages: [], turns: 1 };
}

describe('EvalAgentThreadStore', () => {
	let now: number;
	let store: EvalAgentThreadStore<{ name: string }>;

	beforeEach(() => {
		now = 0;
		store = new EvalAgentThreadStore(() => now);
	});

	it('drops a thread and a world idle for more than two hours', () => {
		store.saveThread('t-1', thread('r-1'));
		store.saveWorld('r-1', { name: 'world' });

		now = 2 * HOUR + 1;

		expect(store.thread('t-1')).toBeUndefined();
		expect(store.world('r-1')).toBeUndefined();
	});

	it('keeps an entry that was used within the idle window', () => {
		store.saveThread('t-1', thread('r-1'));
		now = 1.5 * HOUR;
		expect(store.thread('t-1')).toBeDefined();

		now = 3 * HOUR;

		expect(store.thread('t-1')).toBeDefined();
	});

	it('evicts the least recently used entry when full, not the oldest inserted', () => {
		for (let index = 0; index < MAX_ENTRIES; index++) {
			store.saveThread(`t-${String(index)}`, thread('r'));
		}
		// Reading the first-inserted thread makes it the most recently used.
		store.thread('t-0');

		store.saveThread('t-new', thread('r'));

		expect(store.thread('t-0')).toBeDefined();
		expect(store.thread('t-1')).toBeUndefined();
		expect(store.thread('t-new')).toBeDefined();
	});

	it('drops a resource: its world and its threads, and nothing else', () => {
		store.saveWorld('r-1', { name: 'world 1' });
		store.saveWorld('r-2', { name: 'world 2' });
		store.saveThread('t-1', thread('r-1'));
		store.saveThread('t-2', thread('r-2'));

		store.dropResource('r-1');

		expect(store.world('r-1')).toBeUndefined();
		expect(store.thread('t-1')).toBeUndefined();
		expect(store.world('r-2')).toBeDefined();
		expect(store.thread('t-2')).toBeDefined();
	});
});

const ids = { threadId: 'thread-1', resourceId: 'eval-user-1' };
const earlier: AgentMessage[] = [
	{ role: 'user', content: [{ type: 'text', text: 'Hi' }] },
	{ role: 'assistant', content: [{ type: 'text', text: 'Hello' }] },
];
const next: AgentMessage = { role: 'user', content: [{ type: 'text', text: 'My order?' }] };

describe('planThreadTurn', () => {
	it('replays the stored messages before the new one when memory is off', () => {
		const plan = planThreadTurn({
			memoryOn: false,
			...ids,
			history: earlier,
			userMessage: 'My order?',
		});

		expect(plan.input).toEqual([...earlier, next]);
		expect(plan.persistence).toBeUndefined();
		expect(plan.keepsHistory).toBe(true);
	});

	it('sends only the new message with persistence when memory is on', () => {
		const plan = planThreadTurn({
			memoryOn: true,
			...ids,
			history: earlier,
			userMessage: 'My order?',
		});

		expect(plan.input).toEqual([next]);
		expect(plan.persistence).toEqual(ids);
		expect(plan.keepsHistory).toBe(false);
	});
});
