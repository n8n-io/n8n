import type { InstanceAiEventLogEntry } from '../../entities/instance-ai-event-log-entry.entity';
import { InstanceAiEventLogRepository } from '../instance-ai-event-log.repository';

describe('InstanceAiEventLogRepository', () => {
	it('defaults a missing publish ts to the row write time on read', async () => {
		const repo = Object.create(
			InstanceAiEventLogRepository.prototype,
		) as InstanceAiEventLogRepository;
		const writeTime = new Date('2026-07-01T10:00:00.000Z');
		const rows = [
			// Persisted before the `ts` envelope field (or backfilled): no ts in the
			// JSON. Without the default, every fold renders a fresh "now" for it.
			{
				seq: 1,
				runId: 'run-1',
				createdAt: writeTime,
				payload: JSON.stringify({
					type: 'tool-call',
					runId: 'run-1',
					agentId: 'a1',
					payload: { toolCallId: 'tc-1', toolName: 'search-workflows', args: {} },
				}),
			},
			// Stamped at publish: kept verbatim, never overwritten by write time.
			{
				seq: 2,
				runId: 'run-1',
				createdAt: new Date('2026-07-01T10:00:05.000Z'),
				payload: JSON.stringify({
					type: 'run-finish',
					runId: 'run-1',
					agentId: 'a1',
					ts: 1234,
					payload: { status: 'completed' },
				}),
			},
		] as InstanceAiEventLogEntry[];
		Object.defineProperty(repo, 'find', {
			value: vi.fn().mockResolvedValue(rows),
			configurable: true,
		});

		const stored = await repo.getAfter('thread-1', 0);
		expect(stored.map((s) => s.event.ts)).toEqual([writeTime.getTime(), 1234]);

		const withContext = await repo.getForThread('thread-1');
		expect(withContext.map((r) => r.event.ts)).toEqual([writeTime.getTime(), 1234]);
	});
});
