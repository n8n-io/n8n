import { mock } from 'jest-mock-extended';

import type { InstanceAiRunSnapshot } from '../../entities/instance-ai-run-snapshot.entity';
import type { InstanceAiRunSnapshotRepository } from '../../repositories/instance-ai-run-snapshot.repository';
import { DbSnapshotStorage } from '../db-snapshot-storage';

function makeRow(overrides: Partial<InstanceAiRunSnapshot> = {}): InstanceAiRunSnapshot {
	return {
		threadId: 'thread-1',
		runId: 'run-1',
		messageGroupId: null,
		runIds: null,
		tree: JSON.stringify({ agentId: 'agent-root' }),
		langsmithRunId: null,
		langsmithTraceId: null,
		createdAt: new Date(),
		updatedAt: new Date(),
		...overrides,
	} as InstanceAiRunSnapshot;
}

describe('DbSnapshotStorage', () => {
	const repo = mock<InstanceAiRunSnapshotRepository>();
	const storage = new DbSnapshotStorage(repo);

	beforeEach(() => {
		jest.clearAllMocks();
	});

	describe('findLangsmithAnchor', () => {
		it('returns anchor when messageGroupId matches a row with IDs', async () => {
			repo.findOne.mockResolvedValueOnce(
				makeRow({
					messageGroupId: 'mg-1',
					langsmithRunId: 'ls-run-1',
					langsmithTraceId: 'ls-trace-1',
				}),
			);

			const anchor = await storage.findLangsmithAnchor('thread-1', 'mg-1');

			expect(anchor).toEqual({ langsmithRunId: 'ls-run-1', langsmithTraceId: 'ls-trace-1' });
			expect(repo.findOne).toHaveBeenCalledWith({
				where: { threadId: 'thread-1', messageGroupId: 'mg-1' },
				order: { createdAt: 'ASC' },
			});
		});

		it('falls back to runId lookup when messageGroupId lookup misses', async () => {
			repo.findOne.mockResolvedValueOnce(null);
			repo.findOneBy.mockResolvedValueOnce(
				makeRow({
					runId: 'mg-1',
					langsmithRunId: 'ls-run-2',
					langsmithTraceId: 'ls-trace-2',
				}),
			);

			const anchor = await storage.findLangsmithAnchor('thread-1', 'mg-1');

			expect(anchor).toEqual({ langsmithRunId: 'ls-run-2', langsmithTraceId: 'ls-trace-2' });
			expect(repo.findOneBy).toHaveBeenCalledWith({ threadId: 'thread-1', runId: 'mg-1' });
		});

		it('returns undefined when row is found but langsmith IDs are null', async () => {
			repo.findOne.mockResolvedValueOnce(makeRow({ messageGroupId: 'mg-1' }));

			const anchor = await storage.findLangsmithAnchor('thread-1', 'mg-1');

			expect(anchor).toBeUndefined();
		});

		it('returns undefined when no row exists at all', async () => {
			repo.findOne.mockResolvedValueOnce(null);
			repo.findOneBy.mockResolvedValueOnce(null);

			const anchor = await storage.findLangsmithAnchor('thread-1', 'missing');

			expect(anchor).toBeUndefined();
		});
	});

	describe('save', () => {
		it('persists langsmith IDs via upsert', async () => {
			await storage.save('thread-1', { agentId: 'agent-root' } as never, 'run-1', {
				messageGroupId: 'mg-1',
				runIds: ['run-1'],
				langsmithRunId: 'ls-run-1',
				langsmithTraceId: 'ls-trace-1',
			});

			expect(repo.upsert).toHaveBeenCalledWith(
				expect.objectContaining({
					threadId: 'thread-1',
					runId: 'run-1',
					messageGroupId: 'mg-1',
					runIds: ['run-1'],
					langsmithRunId: 'ls-run-1',
					langsmithTraceId: 'ls-trace-1',
				}),
				['threadId', 'runId'],
			);
		});

		it('writes nulls when langsmith IDs are absent', async () => {
			await storage.save('thread-1', { agentId: 'agent-root' } as never, 'run-1');

			expect(repo.upsert).toHaveBeenCalledWith(
				expect.objectContaining({ langsmithRunId: null, langsmithTraceId: null }),
				expect.anything(),
			);
		});
	});

	describe('updateLast', () => {
		it('preserves existing langsmith IDs when the caller does not supply new ones', async () => {
			const existing = makeRow({
				messageGroupId: 'mg-1',
				langsmithRunId: 'ls-run-existing',
				langsmithTraceId: 'ls-trace-existing',
			});
			repo.findOne.mockResolvedValueOnce(existing);

			await storage.updateLast('thread-1', { agentId: 'updated' } as never, 'run-1', {
				messageGroupId: 'mg-1',
			});

			expect(repo.update).toHaveBeenCalledWith(
				{ threadId: 'thread-1', runId: 'run-1' },
				expect.objectContaining({
					langsmithRunId: 'ls-run-existing',
					langsmithTraceId: 'ls-trace-existing',
				}),
			);
		});
	});
});
