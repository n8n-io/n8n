import type { Logger } from '@n8n/backend-common';
import type { InstanceAiEvent } from '@n8n/api-types';
import { QueryFailedError } from '@n8n/typeorm';
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

	/** Fail the next N appends with a NON-constraint error (e.g. connectivity). */
	failNextAppendsTransient = 0;

	/** Commit the rows, then fail the response (a lost ack after COMMIT). */
	commitThenFailNextAppends = 0;

	/** Fail the next N maxSeq reads (seq seeding hits a transient DB error). */
	failNextMaxSeq = 0;

	/** Hold the next append until released — models an in-flight DB round trip. */
	gateNextAppend: Promise<void> | undefined;

	async maxSeq(_threadId: string): Promise<number> {
		if (this.failNextMaxSeq > 0) {
			this.failNextMaxSeq--;
			throw new Error('connect ETIMEDOUT');
		}
		return this.rows.length ? this.rows[this.rows.length - 1].seq : 0;
	}

	async payloadAt(_threadId: string, seq: number): Promise<string | null> {
		const row = this.rows.find((r) => r.seq === seq);
		return row ? JSON.stringify(row.event) : null;
	}

	async appendBatch(_threadId: string, firstSeq: number, events: InstanceAiEvent[]) {
		if (this.gateNextAppend) {
			const gate = this.gateNextAppend;
			this.gateNextAppend = undefined;
			await gate;
		}
		if (this.failNextAppendsTransient > 0) {
			this.failNextAppendsTransient--;
			throw new Error('connect ETIMEDOUT');
		}
		if (this.commitThenFailNextAppends > 0) {
			this.commitThenFailNextAppends--;
			events.forEach((event, i) => this.rows.push({ seq: firstSeq + i, event }));
			throw new Error('read ECONNRESET');
		}
		const conflict =
			this.failNextAppends > 0 ||
			this.rows.some((r) => r.seq >= firstSeq && r.seq < firstSeq + events.length);
		if (conflict) {
			if (this.failNextAppends > 0) {
				this.failNextAppends--;
				for (let i = 0; i < this.siblingRowsPerConflict; i++) {
					const seq = (await this.maxSeq(_threadId)) + 1;
					this.rows.push({
						seq,
						event: {
							type: 'status',
							runId: 'run-sibling',
							agentId: 'a',
							payload: { message: 'x' },
						},
					});
				}
			}
			// Same shape a real (threadId, seq) PK collision produces, so the
			// writer's isUniqueConstraintError classification is exercised.
			throw new QueryFailedError(
				'INSERT INTO instance_ai_events',
				[],
				Object.assign(new Error('SQLITE_CONSTRAINT: UNIQUE constraint failed: (threadId, seq)'), {
					code: 'SQLITE_CONSTRAINT',
				}),
			);
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

	it('retries a transient append failure without counting it as a conflict', async () => {
		const repo = new FakeRepo();
		repo.failNextAppendsTransient = 1; // e.g. a connectivity blip, not a PK collision
		const { log, metrics } = buildLog(repo);

		const emitted = await publishAll(log, [toolCall('tc-1')]);

		expect(metrics.drain.appendConflicts).toBe(0);
		expect(metrics.drain.appendFailures).toBe(0);
		expect(repo.rows.find((r) => r.event.type === 'tool-call')?.seq).toBe(1);
		expect(emitted.find((e) => e.live)?.id).toBe(1);
	});

	it('does not duplicate a batch whose append committed but lost its response', async () => {
		const repo = new FakeRepo();
		repo.commitThenFailNextAppends = 1; // COMMIT succeeded, the ack was lost
		const { log, metrics } = buildLog(repo);

		const emitted = await publishAll(log, [toolCall('tc-1')]);

		// Exactly one row: the retry detected the committed batch instead of
		// re-appending it under fresh seqs.
		expect(repo.rows.map((r) => [r.seq, r.event.type])).toEqual([[1, 'tool-call']]);
		expect(metrics.drain.appendConflicts).toBe(0);
		expect(metrics.drain.appendFailures).toBe(0);
		expect(metrics.drain.rowsWritten).toBe(1);
		expect(emitted.find((e) => e.live)?.id).toBe(1);
	});

	it('retries when seeding the sequence fails instead of rejecting the drain', async () => {
		const repo = new FakeRepo();
		repo.failNextMaxSeq = 1; // the currentSeq() seed read hits a transient error
		const { log, metrics } = buildLog(repo);

		const emitted = await publishAll(log, [toolCall('tc-1')]);

		expect(metrics.drain.appendConflicts).toBe(0);
		expect(repo.rows.map((r) => r.seq)).toEqual([1]);
		expect(emitted.find((e) => e.live)?.id).toBe(1);
	});

	it('serializes flush() through the drain so a concurrent fact cannot outrun its block', async () => {
		const repo = new FakeRepo();
		const { log } = buildLog(repo);
		const emitted: DrainedEvent[] = [];
		const collect = (drained: DrainedEvent) => emitted.push(drained);

		log.publish(THREAD, textDelta('streamed tail'), collect);
		// A flush (idle timer / shutdown) and a structural fact race: the flush
		// marker was queued first, so the block must persist before the fact.
		const flushed = log.flush(THREAD);
		log.publish(THREAD, toolCall('tc-1'), collect);
		await flushed;
		await log.flush(THREAD);

		expect(repo.rows.map((r) => [r.seq, r.event.type])).toEqual([
			[1, 'text-block'],
			[2, 'tool-call'],
		]);
	});

	it('clearThread during an in-flight append aborts the batch instead of retrying it', async () => {
		const repo = new FakeRepo();
		let releaseAppend!: () => void;
		repo.gateNextAppend = new Promise((resolve) => (releaseAppend = resolve));
		repo.failNextAppendsTransient = 1; // the gated attempt fails once released
		const { log, metrics } = buildLog(repo);
		const emitted: DrainedEvent[] = [];

		log.publish(THREAD, toolCall('tc-old'), (drained) => emitted.push(drained));
		// The drain is now awaiting the DB. The thread gets cleared meanwhile
		// (deletion / E2E reset); the resumed attempt must stop, not retry into
		// the id's next lifecycle.
		log.clearThread(THREAD);
		releaseAppend();
		await log.flush(THREAD);

		expect(repo.rows).toEqual([]);
		expect(emitted).toEqual([]);
		expect(metrics.drain.appendConflicts).toBe(0);
		// Not a durability incident: the batch was dropped because its thread is gone.
		expect(metrics.drain.appendFailures).toBe(0);
	});

	it('a recreated thread id does not receive rows from the previous lifecycle', async () => {
		const repo = new FakeRepo();
		let releaseAppend!: () => void;
		repo.gateNextAppend = new Promise((resolve) => (releaseAppend = resolve));
		repo.failNextAppendsTransient = 1;
		const { log } = buildLog(repo);
		const emitted: DrainedEvent[] = [];
		const collect = (drained: DrainedEvent) => emitted.push(drained);

		log.publish(THREAD, toolCall('tc-old'), collect);
		// Same id, new lifecycle, while the old append is still in flight.
		log.clearThread(THREAD);
		log.publish(THREAD, toolCall('tc-new'), collect);
		releaseAppend();
		await log.flush(THREAD);

		// Only the new lifecycle's fact exists, from seq 1.
		const persisted = repo.rows.map((r) => [
			r.seq,
			r.event.type === 'tool-call' ? r.event.payload.toolCallId : r.event.type,
		]);
		expect(persisted).toEqual([[1, 'tc-new']]);
		expect(emitted.filter((e) => e.live).map((e) => e.id)).toEqual([1]);
	});

	it('getNextEventId reflects rows appended by another writer', async () => {
		const repo = new FakeRepo();
		const { log } = buildLog(repo);
		await publishAll(log, [toolCall('tc-1'), toolCall('tc-2')]);

		// A sibling main appends directly to the shared table.
		repo.rows.push({
			seq: 3,
			event: { type: 'status', runId: 'run-sibling', agentId: 'a', payload: { message: 'x' } },
		});

		// The cursor authority is the DB, not this main's last-append cache.
		expect(await log.getNextEventId(THREAD)).toBe(4);
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
