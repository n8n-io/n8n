import { EvalAgentThreadStore } from '../agent-eval-threads';

const HOUR = 60 * 60 * 1000;
const MAX_ENTRIES = 500;

function thread(resourceId: string) {
	return { resourceId, messages: [], turns: 1 };
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
});
