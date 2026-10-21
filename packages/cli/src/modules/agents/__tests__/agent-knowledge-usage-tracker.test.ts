import { AgentKnowledgeUsageTracker } from '../agent-knowledge-usage-tracker';

describe('AgentKnowledgeUsageTracker', () => {
	afterEach(() => {
		vi.useRealTimers();
	});

	it('counts each kind of knowledge call of a run', () => {
		const tracker = new AgentKnowledgeUsageTracker();

		tracker.recordToolCall('run-1', 'file_find');
		tracker.recordToolCall('run-1', 'file_search');
		tracker.recordToolCall('run-1', 'file_search');
		tracker.recordToolCall('run-1', 'file_read');
		tracker.recordToolCall('run-1', 'vector_store_search');

		expect(tracker.takeRunUsage('run-1')).toEqual({
			file_find_count: 1,
			file_search_count: 2,
			file_read_count: 1,
			vector_store_search_count: 1,
		});
	});

	it('keeps concurrent runs apart', () => {
		const tracker = new AgentKnowledgeUsageTracker();

		tracker.recordToolCall('run-1', 'file_search');
		tracker.recordToolCall('run-2', 'vector_store_search');

		expect(tracker.takeRunUsage('run-1')).toMatchObject({
			file_search_count: 1,
			vector_store_search_count: 0,
		});
		expect(tracker.takeRunUsage('run-2')).toMatchObject({
			file_search_count: 0,
			vector_store_search_count: 1,
		});
	});

	it('forgets a run after its usage is taken', () => {
		const tracker = new AgentKnowledgeUsageTracker();
		tracker.recordToolCall('run-1', 'file_read');

		tracker.takeRunUsage('run-1');

		expect(tracker.takeRunUsage('run-1')).toBeUndefined();
	});

	it('returns nothing for a run without knowledge calls', () => {
		const tracker = new AgentKnowledgeUsageTracker();

		expect(tracker.takeRunUsage('run-1')).toBeUndefined();
	});

	it('ignores a call without a run id', () => {
		const tracker = new AgentKnowledgeUsageTracker();

		tracker.recordToolCall(undefined, 'file_search');

		expect(tracker.takeRunUsage('undefined')).toBeUndefined();
	});

	it('drops a run without calls for more than an hour', () => {
		vi.useFakeTimers();
		const tracker = new AgentKnowledgeUsageTracker();
		tracker.recordToolCall('stale-run', 'file_search');

		vi.advanceTimersByTime(60 * 60 * 1000 + 1);
		tracker.recordToolCall('new-run', 'file_search');

		expect(tracker.takeRunUsage('stale-run')).toBeUndefined();
		expect(tracker.takeRunUsage('new-run')).toMatchObject({ file_search_count: 1 });
	});
});
