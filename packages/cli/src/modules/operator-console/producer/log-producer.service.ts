import type { OperatorLogFilter, OperatorLogRecord } from '@n8n/api-types';
import { Logger } from '@n8n/backend-common';
import { ExecutionsConfig, GlobalConfig } from '@n8n/config';
import { OnPubSubEvent, OnShutdown } from '@n8n/decorators';
import { Service } from '@n8n/di';
import { InstanceSettings } from 'n8n-core';

import { Publisher } from '@/scaling/pubsub/publisher.service';

import type { LogFilterPredicate } from './log-filter';
import { compileFilter } from './log-filter';
import { buildLogStreamKey, encodeLogStreamEntry } from './log-stream-entry';
import { OperatorConsoleConfig } from '../operator-console.config';
import { OPERATOR_CONSOLE_SCOPE } from '../operator-console.constants';

/**
 * The slice of the local ring buffer the producer consumes.
 *
 * Declared here rather than imported so the producer does not depend on the
 * capture layer's concrete class — the ring buffer is the product, this is one
 * of several readers of it.
 */
export interface LogRecordPort {
	/**
	 * Called once per admitted record. Returns an unsubscribe function that must
	 * be safe to call more than once.
	 */
	onRecord(listener: (record: OperatorLogRecord) => void): () => void;

	/**
	 * Running total of lines the rate cap has discarded since process start.
	 *
	 * Deliberately the monotonic total rather than a read-and-reset delta: several
	 * readers observe the same buffer, and a destructive read would let whichever
	 * one polled first swallow the drop count for the others. The producer keeps
	 * its own high-water mark and ships the difference.
	 */
	readonly dropped: number;
}

type Lease = {
	predicate: LogFilterPredicate;
	expiresAt: number;
};

/**
 * Publishes this host's captured log lines into the cross-host Redis Stream,
 * but only while a console is watching and only for lines that console asked
 * for.
 *
 * Runs on every instance type. Three things keep it cheap when idle:
 * - no lease, no work at all — records are not even serialized;
 * - the filter is evaluated here, so unfiltered lines never cross the network;
 * - batches go to the stream, never to `n8n.commands`.
 */
@Service()
export class LogProducerService {
	private readonly streamKey: string;

	private readonly isQueueMode: boolean;

	private port?: LogRecordPort;

	private unsubscribeFromPort?: () => void;

	private lease?: Lease;

	private flushTimer?: NodeJS.Timeout;

	/** Serialized records awaiting a flush, plus their byte cost. */
	private pending: string[] = [];

	private pendingBytes = 0;

	/** The port's `dropped` total as of the last batch, so we ship a delta. */
	private lastDroppedTotal = 0;

	/** Drops observed but not yet delivered, e.g. because a flush failed. */
	private carriedDropped = 0;

	/** Newest record timestamp in `pending`, surfaced as the entry's `ts`. */
	private latestTs?: string;

	/** Chained so two flushes can never race into the stream out of order. */
	private flushQueue: Promise<void> = Promise.resolve();

	constructor(
		private readonly logger: Logger,
		private readonly instanceSettings: InstanceSettings,
		private readonly publisher: Publisher,
		private readonly config: OperatorConsoleConfig,
		executionsConfig: ExecutionsConfig,
		globalConfig: GlobalConfig,
	) {
		this.logger = this.logger.scoped(OPERATOR_CONSOLE_SCOPE);
		this.isQueueMode = executionsConfig.mode === 'queue';
		this.streamKey = buildLogStreamKey(globalConfig.redis.prefix);
	}

	/**
	 * Point the producer at this host's ring buffer. Called by the module once the
	 * capture layer is up; without it the producer stays inert even under a lease.
	 */
	attach(port: LogRecordPort) {
		if (!this.isQueueMode) return; // single main: the consumer reads the buffer directly

		this.detach();
		this.port = port;
		this.lastDroppedTotal = port.dropped;
		this.unsubscribeFromPort = port.onRecord((record) => this.admit(record));
	}

	detach() {
		this.unsubscribeFromPort?.();
		this.unsubscribeFromPort = undefined;
		this.port = undefined;
		this.clearLease();
	}

	@OnShutdown()
	shutdown() {
		this.detach();
	}

	/** Whether a console is currently watching this host. Exposed for tests. */
	hasActiveLease(now = Date.now()): boolean {
		return this.lease !== undefined && this.lease.expiresAt > now;
	}

	@OnPubSubEvent('log-tail-start')
	handleLogTailStart({ filter, ttlMs }: { filter: OperatorLogFilter; ttlMs: number }) {
		if (!this.isQueueMode) return;

		const wasActive = this.hasActiveLease();

		this.lease = {
			predicate: compileFilter(filter),
			expiresAt: Date.now() + ttlMs,
		};

		// Drops that happened while nobody was watching are not this tail's to
		// report, so the baseline resets when a lease is taken out fresh.
		if (!wasActive) {
			this.lastDroppedTotal = this.port?.dropped ?? 0;
			this.carriedDropped = 0;
		}

		this.startFlushTimer();
	}

	// #region Internals

	private admit(record: OperatorLogRecord) {
		if (!this.hasActiveLease()) return;
		if (!this.lease?.predicate(record)) return;

		const json = JSON.stringify(record);
		this.pending.push(json);
		this.pendingBytes += json.length;
		this.latestTs = record.ts;

		if (this.pendingBytes >= this.config.batchMaxBytes) this.flush();
	}

	private startFlushTimer() {
		if (this.flushTimer) return;

		this.flushTimer = setInterval(() => this.onTick(), this.config.batchIntervalMs);
		this.flushTimer.unref(); // a log tail must never hold the process open
	}

	private onTick() {
		// Flush first: lines admitted before the lease lapsed were legitimately
		// requested, so they should still reach the console.
		this.flush();

		if (!this.hasActiveLease()) this.clearLease();
	}

	private clearLease() {
		this.lease = undefined;
		this.pending = [];
		this.pendingBytes = 0;
		this.latestTs = undefined;

		if (this.flushTimer) {
			clearInterval(this.flushTimer);
			this.flushTimer = undefined;
		}
	}

	private flush() {
		const droppedTotal = this.port?.dropped ?? this.lastDroppedTotal;
		const dropped = this.carriedDropped + (droppedTotal - this.lastDroppedTotal);
		this.lastDroppedTotal = droppedTotal;
		this.carriedDropped = 0;

		const records = this.pending;
		const ts = this.latestTs ?? new Date().toISOString();

		this.pending = [];
		this.pendingBytes = 0;
		this.latestTs = undefined;

		// A drop-only batch still ships: the console renders the drop marker inline
		// at the point in the stream where the loss happened.
		if (records.length === 0 && dropped === 0) return;

		const recordsJson = `[${records.join(',')}]`;
		const fields = encodeLogStreamEntry(
			{
				hostId: this.instanceSettings.hostId,
				role: this.instanceSettings.instanceType,
				ts,
				dropped,
			},
			recordsJson,
		);

		this.flushQueue = this.flushQueue.then(
			async () => await this.write(fields, records.length, dropped),
		);
	}

	private async write(fields: string[], recordCount: number, dropped: number) {
		try {
			await this.publisher
				.getClient()
				.xadd(this.streamKey, 'MAXLEN', '~', this.config.streamMaxLen, '*', ...fields);
		} catch (error) {
			// Redis being unreachable must not take a worker down. The lines are lost,
			// so fold them into the drop count and let the console say so.
			this.carriedDropped += recordCount + dropped;
			this.logger.warn('Failed to publish log batch to the operator console stream', {
				error,
				recordCount,
			});
		}
	}

	// #endregion
}
