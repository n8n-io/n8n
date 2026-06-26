import { Logger } from '@n8n/backend-common';
import { SsrfProtectionService } from '@n8n/backend-network';
import {
	EgressBlockedDestinationRepository,
	type BlockedDestinationRecord,
	type EgressBlockedDestination,
} from '@n8n/db';
import { OnShutdown } from '@n8n/decorators';
import { Service } from '@n8n/di';

/** How often the in-memory block buffer is flushed to the DB. */
const FLUSH_INTERVAL_MS = 10 * 1000;

/** Safety cap so a burst of distinct destinations can't grow the buffer unbounded between flushes. */
const MAX_BUFFER_ENTRIES = 1000;

// Joins (hostname, ip, feature, decision) into a buffer key. A pipe is safe: DNS
// hostnames ([A-Za-z0-9.-]), IPv4/IPv6 literals, the feature value and the
// decision enum never contain it.
const KEY_SEPARATOR = '|';

type Decision = 'blocked' | 'would-block';

/**
 * Consumes `ssrf.blocked` events and aggregates them into the
 * egress_blocked_destination table, which powers the admin calibration view.
 *
 * Writes are kept off the request path: each event only bumps an in-memory
 * counter keyed by `(hostname, resolvedIp, feature)`, and the buffer is flushed
 * to the DB on an interval as a batch of upserts. A traffic spike therefore
 * cannot translate into a write spike, and a hot loop hitting one blocked host
 * is a single row.
 *
 * Only actionable policy blocks (reason `blocked_ip` or `blocked_hostname`) are
 * recorded — DNS errors and invalid URLs are not allowlist-actionable and would
 * only add noise.
 */
@Service()
export class EgressCalibrationService {
	private readonly logger: Logger;

	/** key -> count, awaiting the next flush. */
	private readonly buffer = new Map<string, number>();

	private flushTimer?: NodeJS.Timeout;

	private started = false;

	constructor(
		private readonly ssrfProtectionService: SsrfProtectionService,
		private readonly repository: EgressBlockedDestinationRepository,
		logger: Logger,
	) {
		this.logger = logger.scoped('egress-protection');
	}

	/** Begin recording block events. Idempotent. */
	start(): void {
		if (this.started) return;
		this.started = true;

		this.ssrfProtectionService.events.on('ssrf.blocked', ({ reason, hostname, ip, wouldBlock }) => {
			if (reason !== 'blocked_ip' && reason !== 'blocked_hostname') return;
			this.record(hostname ?? '', ip ?? '', wouldBlock ? 'would-block' : 'blocked');
		});

		this.flushTimer = setInterval(() => {
			void this.flush().catch((error) => {
				this.logger.warn('Failed to flush egress calibration buffer', {
					error: error instanceof Error ? error.message : String(error),
				});
			});
		}, FLUSH_INTERVAL_MS);
		this.flushTimer.unref?.();
	}

	@OnShutdown()
	async onShutdown(): Promise<void> {
		if (this.flushTimer) {
			clearInterval(this.flushTimer);
			this.flushTimer = undefined;
		}
		await this.flush();
	}

	/** The calibration worklist: distinct blocked destinations, most-recent first. */
	async listDestinations(limit?: number): Promise<EgressBlockedDestination[]> {
		// Flush first so the admin sees the freshest data when they open the view.
		await this.flush();
		return await this.repository.listDestinations(limit);
	}

	/** Clear all recorded destinations (e.g. when an admin resets calibration). */
	async clear(): Promise<void> {
		this.buffer.clear();
		await this.repository.clearAll();
	}

	private record(hostname: string, ip: string, decision: Decision): void {
		// Bare-IP targets carry no hostname; a DNS-failure block carries no ip.
		// Skip entries that are entirely empty — there is nothing to allowlist.
		if (!hostname && !ip) return;

		const feature = 'unknown'; // Per-feature attribution is a future enhancement.
		const key = [hostname, ip, feature, decision].join(KEY_SEPARATOR);
		this.buffer.set(key, (this.buffer.get(key) ?? 0) + 1);

		if (this.buffer.size >= MAX_BUFFER_ENTRIES) {
			void this.flush().catch((error) => {
				this.logger.warn('Failed to flush egress calibration buffer at capacity', {
					error: error instanceof Error ? error.message : String(error),
				});
			});
		}
	}

	private async flush(): Promise<void> {
		if (this.buffer.size === 0) return;

		// Snapshot and clear synchronously so concurrent events go into a fresh buffer.
		const snapshot = new Map(this.buffer);
		this.buffer.clear();

		const records: BlockedDestinationRecord[] = [];
		for (const [key, count] of snapshot) {
			const [hostname, resolvedIp, feature, decision] = key.split(KEY_SEPARATOR);
			records.push({ hostname, resolvedIp, feature, decision: decision as Decision, count });
		}

		try {
			await this.repository.recordBlocks(records);
		} catch (error) {
			// Re-buffer the snapshot so counts aren't lost on a transient DB error.
			for (const [key, count] of snapshot) {
				this.buffer.set(key, (this.buffer.get(key) ?? 0) + count);
			}
			throw error;
		}
	}
}
