import { TELEMETRY_EVENT } from '@n8n/telemetry';
import { mock } from 'vitest-mock-extended';

import type { Telemetry } from '@/telemetry';

import {
	AgentKnowledgeUsageTracker,
	type KnowledgeToolCallResult,
} from '../agent-knowledge-usage-tracker';

describe('AgentKnowledgeUsageTracker', () => {
	afterEach(() => {
		vi.useRealTimers();
	});

	it('counts each kind of knowledge call of a run', () => {
		const tracker = new AgentKnowledgeUsageTracker(mock<Telemetry>());

		tracker.startToolCall('run-1', 'file_find')({ failed: false, contentChars: 0 });
		tracker.startToolCall('run-1', 'file_search')({ failed: false, contentChars: 0 });
		tracker.startToolCall('run-1', 'file_search')({ failed: false, contentChars: 0 });
		tracker.startToolCall('run-1', 'file_read')({ failed: false, contentChars: 0 });
		tracker.startToolCall('run-1', 'vector_store_search')({ failed: false, contentChars: 0 });

		expect(tracker.takeRunUsage('run-1')).toEqual({
			file_find_count: 1,
			file_search_count: 2,
			file_read_count: 1,
			vector_store_search_count: 1,
			file_content_chars: 0,
			vector_store_content_chars: 0,
			file_failed_count: 0,
			vector_store_failed_count: 0,
		});
	});

	it('sums the content characters of a run by kind', () => {
		const tracker = new AgentKnowledgeUsageTracker(mock<Telemetry>());

		tracker.startToolCall('run-1', 'file_find')({ failed: false, contentChars: 100 });
		tracker.startToolCall('run-1', 'file_search')({ failed: false, contentChars: 250 });
		tracker.startToolCall('run-1', 'file_read')({ failed: false, contentChars: 4000 });
		tracker.startToolCall('run-1', 'vector_store_search')({ failed: false, contentChars: 1200 });
		tracker.startToolCall('run-1', 'vector_store_search')({ failed: false, contentChars: 800 });

		expect(tracker.takeRunUsage('run-1')).toMatchObject({
			file_content_chars: 4350,
			vector_store_content_chars: 2000,
		});
	});

	it('counts a failed call and adds no content characters', () => {
		const tracker = new AgentKnowledgeUsageTracker(mock<Telemetry>());

		tracker.startToolCall('run-1', 'file_read')({ failed: true });
		tracker.startToolCall('run-1', 'file_read')({ failed: false, contentChars: 500 });
		tracker.startToolCall('run-1', 'vector_store_search')({ failed: true });

		expect(tracker.takeRunUsage('run-1')).toMatchObject({
			file_read_count: 2,
			vector_store_search_count: 1,
			file_content_chars: 500,
			vector_store_content_chars: 0,
			file_failed_count: 1,
			vector_store_failed_count: 1,
		});
	});

	it('counts a call that has not finished when its run ends', () => {
		const tracker = new AgentKnowledgeUsageTracker(mock<Telemetry>());

		tracker.startToolCall('run-1', 'file_read');

		expect(tracker.takeRunUsage('run-1')).toMatchObject({
			file_read_count: 1,
			file_content_chars: 0,
			file_failed_count: 0,
		});
	});

	it('drops the result of a call that finishes after its run ended', () => {
		const tracker = new AgentKnowledgeUsageTracker(mock<Telemetry>());
		const finishToolCall = tracker.startToolCall('run-1', 'file_read');
		tracker.takeRunUsage('run-1');

		finishToolCall({ failed: false, contentChars: 500 });

		expect(tracker.takeRunUsage('run-1')).toBeUndefined();
	});

	it('keeps a late result out of the next part of a run with the same run id', () => {
		const tracker = new AgentKnowledgeUsageTracker(mock<Telemetry>());
		const finishFirstPart = tracker.startToolCall('run-1', 'file_read');
		tracker.takeRunUsage('run-1');
		tracker.startToolCall('run-1', 'file_search')({ failed: false, contentChars: 100 });

		finishFirstPart({ failed: false, contentChars: 500 });

		expect(tracker.takeRunUsage('run-1')).toMatchObject({
			file_read_count: 0,
			file_search_count: 1,
			file_content_chars: 100,
		});
	});

	it('keeps concurrent runs apart', () => {
		const tracker = new AgentKnowledgeUsageTracker(mock<Telemetry>());

		tracker.startToolCall('run-1', 'file_search')({ failed: false, contentChars: 300 });
		tracker.startToolCall('run-2', 'vector_store_search')({ failed: false, contentChars: 900 });

		expect(tracker.takeRunUsage('run-1')).toMatchObject({
			file_search_count: 1,
			vector_store_search_count: 0,
			file_content_chars: 300,
			vector_store_content_chars: 0,
		});
		expect(tracker.takeRunUsage('run-2')).toMatchObject({
			file_search_count: 0,
			vector_store_search_count: 1,
			file_content_chars: 0,
			vector_store_content_chars: 900,
		});
	});

	it('forgets a run after its usage is taken', () => {
		const tracker = new AgentKnowledgeUsageTracker(mock<Telemetry>());
		tracker.startToolCall('run-1', 'file_read')({ failed: false, contentChars: 0 });

		tracker.takeRunUsage('run-1');

		expect(tracker.takeRunUsage('run-1')).toBeUndefined();
	});

	it('returns nothing for a run without knowledge calls', () => {
		const tracker = new AgentKnowledgeUsageTracker(mock<Telemetry>());

		expect(tracker.takeRunUsage('run-1')).toBeUndefined();
	});

	it('ignores a call without a run id', () => {
		const tracker = new AgentKnowledgeUsageTracker(mock<Telemetry>());

		tracker.startToolCall(undefined, 'file_search')({ failed: false, contentChars: 0 });

		expect(tracker.takeRunUsage('undefined')).toBeUndefined();
	});

	it('keeps a run that makes no knowledge calls for several hours', () => {
		vi.useFakeTimers();
		const tracker = new AgentKnowledgeUsageTracker(mock<Telemetry>());
		tracker.startToolCall('long-run', 'file_search')({ failed: false, contentChars: 0 });

		vi.advanceTimersByTime(6 * 60 * 60 * 1000);
		tracker.startToolCall('new-run', 'file_search')({ failed: false, contentChars: 0 });

		expect(tracker.takeRunUsage('long-run')).toMatchObject({ file_search_count: 1 });
	});

	it('drops a run without calls for more than a day', () => {
		vi.useFakeTimers();
		const tracker = new AgentKnowledgeUsageTracker(mock<Telemetry>());
		tracker.startToolCall('stale-run', 'file_search')({ failed: false, contentChars: 0 });

		vi.advanceTimersByTime(24 * 60 * 60 * 1000 + 1);
		tracker.startToolCall('new-run', 'file_search')({ failed: false, contentChars: 0 });

		expect(tracker.takeRunUsage('stale-run')).toBeUndefined();
		expect(tracker.takeRunUsage('new-run')).toMatchObject({ file_search_count: 1 });
	});

	describe('sendRunUsage', () => {
		const day = 24 * 60 * 60 * 1000;
		const now = new Date('2026-10-26T12:00:00.000Z');

		function sendRun(telemetry: Telemetry, results: KnowledgeToolCallResult[]) {
			const tracker = new AgentKnowledgeUsageTracker(telemetry);
			for (const result of results) {
				tracker.startToolCall('run-1', 'file_read')(result);
			}

			tracker.sendRunUsage('run-1', { agentId: 'agent-1', runType: 'production' });
		}

		it('sends the ages in full days of the newest and the oldest file that the run read', () => {
			vi.useFakeTimers({ now });
			const telemetry = mock<Telemetry>();

			sendRun(telemetry, [
				{
					failed: false,
					contentChars: 10,
					fileUploadedAt: new Date(now.getTime() - 30 * day - 1).toISOString(),
				},
				{
					failed: false,
					contentChars: 10,
					fileUploadedAt: new Date(now.getTime() - 2.5 * day).toISOString(),
				},
			]);

			expect(telemetry.track).toHaveBeenCalledWith(
				TELEMETRY_EVENT.AGENTS.AGENT_RUN_USED_KNOWLEDGE,
				expect.objectContaining({ file_age_days_min: 2, file_age_days_max: 30 }),
			);
		});

		it('sends no ages when the run read no file', () => {
			const telemetry = mock<Telemetry>();

			sendRun(telemetry, [{ failed: false, contentChars: 10 }, { failed: true }]);

			const [, properties] = telemetry.track.mock.calls[0];
			expect(properties).not.toHaveProperty('file_age_days_min');
			expect(properties).not.toHaveProperty('file_age_days_max');
		});

		it('sends the counts of a run that used knowledge, then forgets the run', () => {
			const telemetry = mock<Telemetry>();
			const tracker = new AgentKnowledgeUsageTracker(telemetry);
			tracker.startToolCall('run-1', 'file_search')({ failed: false, contentChars: 300 });
			tracker.startToolCall('run-1', 'vector_store_search')({ failed: false, contentChars: 900 });

			tracker.sendRunUsage('run-1', {
				agentId: 'agent-1',
				runType: 'production',
				userId: 'user-1',
			});

			expect(telemetry.track).toHaveBeenCalledTimes(1);
			expect(telemetry.track).toHaveBeenCalledWith(
				TELEMETRY_EVENT.AGENTS.AGENT_RUN_USED_KNOWLEDGE,
				{
					agent_id: 'agent-1',
					run_id: 'run-1',
					run_type: 'production',
					user_id: 'user-1',
					file_find_count: 0,
					file_search_count: 1,
					file_read_count: 0,
					vector_store_search_count: 1,
					file_content_chars: 300,
					vector_store_content_chars: 900,
					file_failed_count: 0,
					vector_store_failed_count: 0,
				},
			);
			expect(tracker.takeRunUsage('run-1')).toBeUndefined();
		});

		it('leaves out user_id for a run without a user', () => {
			const telemetry = mock<Telemetry>();
			const tracker = new AgentKnowledgeUsageTracker(telemetry);
			tracker.startToolCall('run-1', 'file_read')({ failed: false, contentChars: 0 });

			tracker.sendRunUsage('run-1', { agentId: 'agent-1', runType: 'test' });

			expect(telemetry.track).toHaveBeenCalledWith(
				TELEMETRY_EVENT.AGENTS.AGENT_RUN_USED_KNOWLEDGE,
				expect.not.objectContaining({ user_id: expect.anything() }),
			);
		});

		it('sends nothing for a run without knowledge calls', () => {
			const telemetry = mock<Telemetry>();
			const tracker = new AgentKnowledgeUsageTracker(telemetry);

			tracker.sendRunUsage('run-1', { agentId: 'agent-1', runType: 'production' });

			expect(telemetry.track).not.toHaveBeenCalled();
		});
	});
});
