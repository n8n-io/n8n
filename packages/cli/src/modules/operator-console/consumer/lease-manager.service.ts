import type { OperatorLogFilter } from '@n8n/api-types';
import { Logger } from '@n8n/backend-common';
import { ExecutionsConfig } from '@n8n/config';
import { OnShutdown } from '@n8n/decorators';
import { Service } from '@n8n/di';
import { InstanceSettings } from 'n8n-core';

import { Publisher } from '@/scaling/pubsub/publisher.service';

import { OperatorConsoleConfig } from '../operator-console.config';
import { OPERATOR_CONSOLE_SCOPE } from '../operator-console.constants';
import { unionFilters } from '../producer/log-filter';

/**
 * Holds the cross-host log tail open while at least one console is watching.
 *
 * Nothing crosses the network unless someone is looking: the first open session
 * arms the lease, a heartbeat at half the TTL keeps it armed, and the last close
 * simply stops the heartbeat — producers go quiet on their own when the TTL
 * elapses. That is deliberate, and it is why a main that crashes with a console
 * open does not leave a firehose running.
 *
 * Only meaningful on mains in queue mode. In single main the producer and the
 * consumer are the same process, so every method here is a no-op.
 */
@Service()
export class LeaseManagerService {
	/** Open consoles, by session. Each carries the filter it asked for. */
	private readonly sessions = new Map<string, OperatorLogFilter>();

	private heartbeat?: NodeJS.Timeout;

	private readonly enabled: boolean;

	constructor(
		private readonly logger: Logger,
		private readonly publisher: Publisher,
		private readonly config: OperatorConsoleConfig,
		instanceSettings: InstanceSettings,
		executionsConfig: ExecutionsConfig,
	) {
		this.logger = this.logger.scoped(OPERATOR_CONSOLE_SCOPE);
		this.enabled = executionsConfig.mode === 'queue' && instanceSettings.instanceType === 'main';
	}

	/**
	 * Register an open console. Re-arms immediately so the first lines arrive
	 * without waiting out a heartbeat interval, and so a changed filter takes
	 * effect on the next line rather than eventually.
	 */
	open(sessionId: string, filter: OperatorLogFilter) {
		if (!this.enabled) return;

		this.sessions.set(sessionId, filter);
		this.startHeartbeat();
		void this.publishLease();
	}

	close(sessionId: string) {
		if (!this.enabled) return;

		if (!this.sessions.delete(sessionId)) return;

		if (this.sessions.size === 0) {
			this.stopHeartbeat();
			return;
		}

		// Losing the broadest session may narrow the lease; tell producers now
		// rather than leaving them shipping lines nobody wants for up to a TTL.
		void this.publishLease();
	}

	/**
	 * The filter currently leased across the cluster: the union of every open
	 * session's filter, or `undefined` when nothing is open.
	 */
	activeFilter(): OperatorLogFilter | undefined {
		if (this.sessions.size === 0) return undefined;

		return [...this.sessions.values()].reduce(unionFilters);
	}

	@OnShutdown()
	shutdown() {
		this.sessions.clear();
		this.stopHeartbeat();
	}

	// #region Internals

	private startHeartbeat() {
		if (this.heartbeat) return;

		// Half the TTL, so a single dropped heartbeat does not lapse the lease.
		this.heartbeat = setInterval(() => {
			void this.publishLease();
		}, this.config.leaseTtlMs / 2);
		this.heartbeat.unref(); // a console must never hold the process open
	}

	private stopHeartbeat() {
		if (!this.heartbeat) return;

		clearInterval(this.heartbeat);
		this.heartbeat = undefined;
	}

	private async publishLease() {
		const filter = this.activeFilter();
		if (!filter) return;

		try {
			await this.publisher.publishCommand({
				command: 'log-tail-start',
				payload: { filter, ttlMs: this.config.leaseTtlMs },
			});
		} catch (error) {
			// A missed heartbeat costs at most one lapsed lease, which the next tick
			// re-arms. Not worth failing the caller's request over.
			this.logger.warn('Failed to publish operator console log tail lease', { error });
		}
	}

	// #endregion
}
