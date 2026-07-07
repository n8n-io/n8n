import type { Logger } from '@n8n/backend-common';
import type { InstanceAiEvent } from '@n8n/api-types';
import { mock } from 'vitest-mock-extended';

import type { EventService } from '@/events/event.service';

import { DurableEventLog, type DrainedEvent } from '../durable-event-log';
import { DurableLogMetrics } from '../durable-log-metrics';
import type { InstanceAiEventLogRepository } from '../../repositories/instance-ai-event-log.repository';

const THREAD = 'thread-1';
const RUN = 'run-1';
const AGENT = 'orchestrator:run-1';

/** In-memory stand-in for the repository, with a conflict-injection knob. */
class FakeRepo {
	rows: Array<{ seq: number; event: InstanceAiEvent }> = [];

	/** Simulate a sibling main winning seq ranges: fail the next N appends. */
	failNextAppends = 0;

	/** When an append fails, advance the store as if the sibling wrote rows. */
	siblingRowsPerConflict = 0;

	async maxSeq(_threadId: string): Promise<number> {
		return this.rows.length ? this.rows[this.rows.length - 1].seq : 0;
	}

	async appendBatch(_threadId: string, firstSeq: number, events: InstanceAiEvent[]) {
		const conflict =
			this.failNextAppends > 0 || this.rows.some((r) => r.seq >= firstSeq && r.seq < firstSeq + events.length);
		if (conflict) {
			if (this.failNextAppends > 0) {
				this.failNextAppends--;
				for (let i = 0; i < this.siblingRowsPerConflict; i++) {
					const seq = (await this.maxSeq(_threadId)) + 1;
					this.rows.push({
						seq,
						event: { type: 'status', runId: 'run-sibling', agentId: 'a', payload: { message: 'x' } },
					});
				}
			}
			throw new Error('UNIQUE constraint failed: (threadId, seq)');
		}
		let bytes = 0;
		events.forEach((event, i) => {
			bytes += Buffer.byteLength(JSON.stringify(event), 'utf8');
			this.rows.push({ seq: firstSeq + i, event });
		});
		return bytes;
	}

	async getAfter(_threadId: string, afterSeq: number) {
		return this.rows.filter((r) => r.seq > afterSeq).map((r) => ({ id: r.seq, event: r.event }));
	}

	async getForRuns(_threadId: string, runIds: string[]) {
		const set = new Set(runIds);
		return this.rows.filter((r) => set.has(r.event.runId)).map((r) => r.event);
	}
}

function buildLog(repo: FakeRepo) {
	const logger = mock<Logger>();
	logger.scoped.mockReturnValue(logger);
	const metrics = new DurableLogMetrics(mock<EventService>());
	const log = new DurableEventLog(logger, repo as unknown as InstanceAiEventLogRepository, metrics);
	return { log, metrics };
}

function textDelta(text: string, responseId = 'msg-1', agentId = AGENT): InstanceAiEvent {
	return { type: 'text-delta', runId: RUN, agentId, responseId, payload: { text } };
}

function reasoningDelta(text: string, responseId = 'msg-1', agentId = AGENT): InstanceAiEvent {
	return { type: 'reasoning-delta', runId: RUN, agentId, responseId, payload: { text } };
}

function toolCall(toolCallId: string, agentId = AGENT): InstanceAiEvent {
	return {
		type: 'tool-call',
		runId: RUN,
		agentId,
		payload: { toolCallId, toolName: 'search-workflows', args: {} },
	};
}

function runFinish(): InstanceAiEvent {
	return { type: 'run-finish', runId: RUN, agentId: AGENT, payload: { status: 'completed' } };
}

/** Publish events through the drain and await it, collecting emissions. */
async function publishAll(
	log: DurableEventLog,
	events: InstanceAiEvent[],
): Promise<DrainedEvent[]> {
	const emitted: DrainedEvent[] = [];
	for (const event of events) {
		log.publish(THREAD, event, (drained) => emitted.push(drained));
	}
	await log.flush(THREAD);
	return emitted;
}

describe('DurableEventLog', () => {
	it('coalesces a segment into one text-block flushed immediately before the next structural fact', async () => {
		const repo = new FakeRepo();
		const { log } = buildLog(repo);

		await publishAll(log, [textDelta('AAA'), textDelta('BBB'), toolCall('tc-1')]);

		const persisted = repo.rows.map((r) => r.event.type);
		expect(persisted).toEqual(['text-block', 'tool-call']);
		const block = repo.rows[0].event;
		expect(block.type === 'text-block' && block.payload.text).toBe('AAABBB');
		expect(block.responseId).toBe('msg-1');
	});

	it('flushes reasoning and text of one segment as separate blocks, reasoning first', async () => {
		const repo = new FakeRepo();
		const { log } = buildLog(repo);

		await publishAll(log, [
			reasoningDelta('think '),
			reasoningDelta('hard'),
			textDelta('answer'),
			toolCall('tc-1'),
		]);

		expect(repo.rows.map((r) => r.event.type)).toEqual([
			'reasoning-block',
			'text-block',
			'tool-call',
		]);
		expect(repo.rows[0].event.payload).toEqual({ text: 'think hard' });
		expect(repo.rows[1].event.payload).toEqual({ text: 'answer' });
	});

	it('rolls the open segment into a block when the responseId changes (blocks stay 1:1 with segments)', async () => {
		const repo = new FakeRepo();
		const { log } = buildLog(repo);

		await publishAll(log, [
			textDelta('first', 'msg-1'),
			textDelta(' segment', 'msg-1'),
			textDelta('second segment', 'msg-2'),
			runFinish(),
		]);

		const blocks = repo.rows.filter((r) => r.event.type === 'text-block');
		expect(blocks).toHaveLength(2);
		expect(blocks[0].event.payload).toEqual({ text: 'first segment' });
		expect(blocks[0].event.responseId).toBe('msg-1');
		expect(blocks[1].event.payload).toEqual({ text: 'second segment' });
		expect(blocks[1].event.responseId).toBe('msg-2');
	});

	it('run-finish flushes the open blocks of every agent in the run', async () => {
		const repo = new FakeRepo();
		const { log } = buildLog(repo);
		const subAgent = 'sub:run-1:builder';

		await publishAll(log, [
			textDelta('orchestrator text', 'msg-1', AGENT),
			textDelta('sub-agent text', 'msg-s', subAgent),
			runFinish(),
		]);

		const blocks = repo.rows.filter((r) => r.event.type === 'text-block');
		expect(blocks.map((b) => b.event.agentId).sort()).toEqual([AGENT, subAgent].sort());
		expect(repo.rows.at(-1)?.event.type).toBe('run-finish');
	});

	it('live-emits ephemeral events without ids and structural facts with contiguous seqs', async () => {
		const repo = new FakeRepo();
		const { log } = buildLog(repo);

		const emitted = await publishAll(log, [
			textDelta('AAA'),
			toolCall('tc-1'),
			{ type: 'status', runId: RUN, agentId: AGENT, payload: { message: 'working' } },
			runFinish(),
		]);

		// The live stream carries every published event, in order.
		const live = emitted.filter((e) => e.live);
		expect(live.map((e) => e.event.type)).toEqual([
			'text-delta',
			'tool-call',
			'status',
			'run-finish',
		]);
		// Deltas and status carry no id; structural facts carry the DB seq.
		expect(live[0].id).toBeUndefined();
		expect(live[2].id).toBeUndefined();
		expect(live[1].id).toBeDefined();
		expect(live[3].id).toBeDefined();
		// Persisted seqs are contiguous from 1.
		expect(repo.rows.map((r) => r.seq)).toEqual([1, 2, 3]);
	});

	it('continues the seq across a restart (fresh instance seeds from the DB)', async () => {
		const repo = new FakeRepo();
		const { log } = buildLog(repo);
		await publishAll(log, [toolCall('tc-1'), toolCall('tc-2')]);
		expect(repo.rows.map((r) => r.seq)).toEqual([1, 2]);

		// Restart: a new instance over the same repo.
		const { log: log2 } = buildLog(repo);
		expect(await log2.getNextEventId(THREAD)).toBe(3);
		await publishAll(log2, [toolCall('tc-3')]);
		expect(repo.rows.map((r) => r.seq)).toEqual([1, 2, 3]);
	});

	it('retries an append conflict with re-seeded seqs and counts it', async () => {
		const repo = new FakeRepo();
		repo.failNextAppends = 1;
		repo.siblingRowsPerConflict = 2; // the sibling that won wrote 2 rows
		const { log, metrics } = buildLog(repo);

		const emitted = await publishAll(log, [toolCall('tc-1')]);

		expect(metrics.drain.appendConflicts).toBe(1);
		expect(metrics.drain.appendFailures).toBe(0);
		// Our fact landed after the sibling's rows, with the re-seeded seq.
		const ours = repo.rows.find((r) => r.event.type === 'tool-call');
		expect(ours?.seq).toBe(3);
		expect(emitted.find((e) => e.live)?.id).toBe(3);
	});

	it('drops the batch after exhausting retries but still delivers live', async () => {
		const repo = new FakeRepo();
		repo.failNextAppends = 99; // never succeeds
		const { log, metrics } = buildLog(repo);

		const emitted = await publishAll(log, [toolCall('tc-1')]);

		expect(metrics.drain.appendFailures).toBe(1);
		expect(repo.rows.filter((r) => r.event.type === 'tool-call')).toHaveLength(0);
		const live = emitted.filter((e) => e.live);
		expect(live).toHaveLength(1);
		expect(live[0].id).toBeUndefined(); // nothing durable to point a cursor at
	});

	it('flush() persists still-open buffers as blocks (shutdown path)', async () => {
		const repo = new FakeRepo();
		const { log } = buildLog(repo);

		// Open segment with no structural fact after it: only flush() closes it.
		await publishAll(log, [textDelta('tail of a streamed answer')]);

		const blocks = repo.rows.filter((r) => r.event.type === 'text-block');
		expect(blocks).toHaveLength(1);
		expect(blocks[0].event.payload).toEqual({ text: 'tail of a streamed answer' });
	});
	it('clearThread drops the stale seq cache so a reused thread reseeds from the DB', async () => {
		const repo = new FakeRepo();
		const { log } = buildLog(repo);
		await publishAll(log, [toolCall('tc-1'), toolCall('tc-2')]);
		expect(repo.rows.map((r) => r.seq)).toEqual([1, 2]);

		// Thread deleted: rows cascade away, the log's per-thread state clears.
		repo.rows = [];
		log.clearThread(THREAD);

		// A later publish for the (re)created thread starts clean at seq 1,
		// with no conflict retries against the stale cached counter.
		await publishAll(log, [toolCall('tc-3')]);
		expect(repo.rows.map((r) => r.seq)).toEqual([1]);
	});
	it('idle flush persists trailing deltas that no structural fact ever follows', async () => {
		// e.g. a terminal-outcome line published after run-finish, or a liveness
		// timeout notice: without the idle flush these would never reach the log
		// and disappear on reload.
		const repo = new FakeRepo();
		const { log } = buildLog(repo);
		log.idleFlushMs = 25;

		const emitted = [];
		log.publish(THREAD, textDelta('The background workflow-builder task was cancelled.'), (d) =>
			emitted.push(d),
		);
		await new Promise((resolve) => setTimeout(resolve, 120));

		const blocks = repo.rows.filter((r) => r.event.type === 'text-block');
		expect(blocks).toHaveLength(1);
		expect(blocks[0].event.payload).toEqual({
			text: 'The background workflow-builder task was cancelled.',
		});
	});
});
