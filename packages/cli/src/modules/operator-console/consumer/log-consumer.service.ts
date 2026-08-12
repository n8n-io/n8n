import type { OperatorLogBatch, OperatorLogFilter, OperatorLogRecord } from '@n8n/api-types';
import { Logger } from '@n8n/backend-common';
import { OnShutdown } from '@n8n/decorators';
import { Service } from '@n8n/di';

import { Push } from '@/push';

import { runWithCaptureSuppressed } from '../capture/log-capture.service';
import { OperatorConsoleConfig } from '../operator-console.config';
import { OPERATOR_CONSOLE_SCOPE } from '../operator-console.constants';
import { compileFilter, unionFilters } from '../producer/log-filter';
import { CompositeLogSource } from '../sources/composite-log.source';
import { LeaseManagerService } from './lease-manager.service';

/**
 * Delivers live log batches to the consoles watching this main.
 *
 * Complements {@link LeaseManagerService}, which only arms the *cross-host*
 * lease and is a no-op outside queue mode. This side runs in every mode: with a
 * single main the ring buffer is the source and there is no lease to arm, but
 * the browser still needs its lines.
 *
 * One subscription is held for the union of every open console's filter, and
 * each batch is then re-filtered per session. Subscribing once per session
 * would walk the ring buffer N times per line.
 */
@Service()
export class LogConsumerService {
	private readonly sessions = new Map<string, Session>();

	private unsubscribe?: () => void;

	constructor(
		private readonly logger: Logger,
		private readonly source: CompositeLogSource,
		private readonly leaseManager: LeaseManagerService,
		private readonly push: Push,
		private readonly config: OperatorConsoleConfig,
	) {
		this.logger = this.logger.scoped(OPERATOR_CONSOLE_SCOPE);
	}

	/** Open or re-filter a console. Called on every lease renewal from the client. */
	open(pushRef: string, filter: OperatorLogFilter) {
		const previous = this.sessions.get(pushRef);
		this.sessions.set(pushRef, { filter, renewedAt: Date.now() });

		this.leaseManager.open(pushRef, filter);

		// Renewals dominate: the client re-posts the same filter every few seconds
		// and tearing the subscription down and back up each time would drop lines
		// in the gap.
		if (!this.unsubscribe || !sameFilter(previous?.filter, filter)) this.resubscribe();
	}

	close(pushRef: string) {
		if (!this.sessions.delete(pushRef)) return;

		this.leaseManager.close(pushRef);
		this.resubscribe();
	}

	@OnShutdown()
	shutdown() {
		this.sessions.clear();
		this.stop();
	}

	// #region Internals

	private resubscribe() {
		this.stop();

		const union = this.activeFilter();
		if (!union) return;

		this.unsubscribe = this.source.subscribe(union, (batch) => this.deliver(batch));

		this.logger.debug('Operator console tail subscribed', { sessions: this.sessions.size });
	}

	private stop() {
		this.unsubscribe?.();
		this.unsubscribe = undefined;
	}

	private activeFilter(): OperatorLogFilter | undefined {
		if (this.sessions.size === 0) return undefined;

		return [...this.sessions.values()].map((session) => session.filter).reduce(unionFilters);
	}

	/**
	 * A closed tab does not always get to send `DELETE /tail` — a hard close, a
	 * crashed browser, a dropped network. Without this we would fan out to a dead
	 * ref forever and hold the subscription open. Same TTL model the producers
	 * use, so there is one expiry concept rather than two.
	 */
	private expireStaleSessions() {
		const deadline = Date.now() - this.config.leaseTtlMs;
		let expired = false;

		for (const [pushRef, session] of this.sessions) {
			if (session.renewedAt >= deadline) continue;

			this.sessions.delete(pushRef);
			this.leaseManager.close(pushRef);
			expired = true;
		}

		if (expired) this.resubscribe();
	}

	private deliver(batch: OperatorLogBatch) {
		this.expireStaleSessions();

		// Everything below logs — `Push` reports each send at debug — and those
		// lines would be captured, batched and delivered, forever. Suppress capture
		// for the duration of the fan-out.
		runWithCaptureSuppressed(() => {
			for (const [pushRef, session] of this.sessions) {
				const records = selectFor(batch.records, session.filter);

				// A drop still matters to a session even when the dropped lines would
				// not have matched its filter: the count is what the UI renders as its
				// loss marker, and silently swallowing it is the failure mode.
				if (records.length === 0 && batch.dropped === 0) continue;

				this.push.send({ type: 'operatorLogs', data: { ...batch, records } }, pushRef);
			}
		});
	}

	// #endregion
}

function selectFor(records: OperatorLogRecord[], filter: OperatorLogFilter): OperatorLogRecord[] {
	const matches = compileFilter(filter);

	return records.filter(matches);
}

type Session = { filter: OperatorLogFilter; renewedAt: number };

/** Cheap structural comparison — filters are small and flat. */
function sameFilter(a: OperatorLogFilter | undefined, b: OperatorLogFilter): boolean {
	return a !== undefined && JSON.stringify(a) === JSON.stringify(b);
}
