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
	});

	describe('getRunStarts', () => {
		it('maps each run to its message group, leaving ungrouped runs undefined', async () => {
			const repo = Object.create(
				InstanceAiEventLogRepository.prototype,
			) as InstanceAiEventLogRepository;
			const rows = [
				{
					seq: 1,
					runId: 'run-1',
					createdAt: new Date('2026-07-01T10:00:00.000Z'),
					payload: JSON.stringify({
						type: 'run-start',
						runId: 'run-1',
						agentId: 'a1',
						payload: { messageId: 'm-1', messageGroupId: 'mg-1' },
					}),
				},
				// A turn with no group of its own: the run id is the group key.
				{
					seq: 2,
					runId: 'run-2',
					createdAt: new Date('2026-07-01T10:00:01.000Z'),
					payload: JSON.stringify({
						type: 'run-start',
						runId: 'run-2',
						agentId: 'a1',
						payload: { messageId: 'm-2' },
					}),
				},
			] as InstanceAiEventLogEntry[];
			const find = vi.fn().mockResolvedValue(rows);
			Object.defineProperty(repo, 'find', { value: find, configurable: true });

			await expect(repo.getRunStarts('thread-1')).resolves.toEqual([
				{ runId: 'run-1', messageGroupId: 'mg-1' },
				{ runId: 'run-2', messageGroupId: undefined },
			]);
			// Only run-start rows are read — one row per run, not the whole log.
			expect(find).toHaveBeenCalledWith(
				expect.objectContaining({ where: { threadId: 'thread-1', type: 'run-start' } }),
			);
		});
	});

	describe('findLangsmithAnchor', () => {
		const runStartRow = (
			seq: number,
			runId: string,
			payload: Record<string, unknown>,
		): InstanceAiEventLogEntry =>
			({
				seq,
				runId,
				createdAt: new Date(`2026-07-01T10:00:0${seq}.000Z`),
				payload: JSON.stringify({ type: 'run-start', runId, agentId: 'a1', payload }),
			}) as InstanceAiEventLogEntry;

		const repoWithRunStarts = (rows: InstanceAiEventLogEntry[]) => {
			const repo = Object.create(
				InstanceAiEventLogRepository.prototype,
			) as InstanceAiEventLogRepository;
			const find = vi.fn().mockResolvedValue(rows);
			Object.defineProperty(repo, 'find', { value: find, configurable: true });
			return { repo, find };
		};

		it('resolves the group anchor from a later sibling when earlier ones carry no ids', async () => {
			const { repo, find } = repoWithRunStarts([
				// Anchored, but a different group: must never hijack another group's turn.
				runStartRow(1, 'run-0', {
					messageGroupId: 'mg-other',
					langsmithRunId: 'ls-other',
					langsmithTraceId: 'trace-other',
				}),
				// The group's first sibling, unanchored — what a segment without
				// tracing leaves behind.
				runStartRow(2, 'run-1', { messageGroupId: 'mg-1' }),
				runStartRow(3, 'run-2', {
					messageGroupId: 'mg-1',
					langsmithRunId: 'ls-run',
					langsmithTraceId: 'ls-trace',
				}),
			]);

			await expect(repo.findLangsmithAnchor('thread-1', 'mg-1')).resolves.toEqual({
				langsmithRunId: 'ls-run',
				langsmithTraceId: 'ls-trace',
			});
			// One row per run, not the whole log.
			expect(find).toHaveBeenCalledWith(
				expect.objectContaining({ where: { threadId: 'thread-1', type: 'run-start' } }),
			);
		});

		it('falls back to the runId for a turn with no message group', async () => {
			const { repo } = repoWithRunStarts([
				runStartRow(1, 'run-1', { langsmithRunId: 'ls-run', langsmithTraceId: 'ls-trace' }),
			]);

			await expect(repo.findLangsmithAnchor('thread-1', 'run-1')).resolves.toEqual({
				langsmithRunId: 'ls-run',
				langsmithTraceId: 'ls-trace',
			});
		});

		it('resolves undefined for a genuinely untraced turn', async () => {
			const { repo } = repoWithRunStarts([
				runStartRow(1, 'run-1', { messageGroupId: 'mg-1' }),
				runStartRow(2, 'run-2', { messageGroupId: 'mg-1' }),
			]);

			// No sibling in the group is anchored…
			await expect(repo.findLangsmithAnchor('thread-1', 'mg-1')).resolves.toBeUndefined();
			// …and the runId fallback must not fabricate an anchor from an id-less start.
			await expect(repo.findLangsmithAnchor('thread-1', 'run-2')).resolves.toBeUndefined();
		});
	});

	describe('findRunIdsInWindow', () => {
		it('bounds the window half-open so the next page owns its first fact', async () => {
			const repo = Object.create(
				InstanceAiEventLogRepository.prototype,
			) as InstanceAiEventLogRepository;
			const predicates: Array<[string, Record<string, unknown>]> = [];
			const qb = {
				select: vi.fn().mockReturnThis(),
				distinct: vi.fn().mockReturnThis(),
				where: vi.fn((sql: string, params: Record<string, unknown>) => {
					predicates.push([sql, params]);
					return qb;
				}),
				andWhere: vi.fn((sql: string, params: Record<string, unknown>) => {
					predicates.push([sql, params]);
					return qb;
				}),
				getRawMany: vi.fn().mockResolvedValue([{ runId: 'run-1' }]),
			};
			Object.defineProperty(repo, 'createQueryBuilder', {
				value: vi.fn().mockReturnValue(qb),
				configurable: true,
			});

			const since = new Date('2026-07-01T10:00:00.000Z');
			const before = new Date('2026-07-01T11:00:00.000Z');
			await expect(repo.findRunIdsInWindow('thread-1', { since, before })).resolves.toEqual([
				'run-1',
			]);

			expect(predicates).toEqual([
				['e.threadId = :threadId', { threadId: 'thread-1' }],
				['e.createdAt >= :since', { since }],
				['e.createdAt < :before', { before }],
			]);
		});
	});

	describe('getForThreadRuns', () => {
		it('skips the query for an empty run set', async () => {
			const repo = Object.create(
				InstanceAiEventLogRepository.prototype,
			) as InstanceAiEventLogRepository;
			const createQueryBuilder = vi.fn();
			Object.defineProperty(repo, 'createQueryBuilder', {
				value: createQueryBuilder,
				configurable: true,
			});

			await expect(repo.getForThreadRuns('thread-1', [])).resolves.toEqual([]);
			// `IN ()` is not valid SQL, so the short-circuit is load-bearing.
			expect(createQueryBuilder).not.toHaveBeenCalled();
		});
	});
});
