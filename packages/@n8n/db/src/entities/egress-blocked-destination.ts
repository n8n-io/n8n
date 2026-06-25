import { Column, Entity, PrimaryColumn } from '@n8n/typeorm';

import { DateTimeColumn } from './abstract-entity';
import { bigintStringToNumber } from '../utils/transformers';

/**
 * A single aggregated entry in the egress calibration log, keyed by
 * `(hostname, resolvedIp, feature, decision)`. This powers the admin calibration
 * view: the worklist of destinations an admin may need to allowlist before
 * flipping the policy to enforce.
 *
 * It is intentionally an aggregate, not a per-event log: each block event is an
 * upsert that bumps `count` and `lastSeen`, so the table's size is bounded by
 * the number of distinct blocked destinations (the blocklist's reach), not by
 * request volume. A hot loop hitting one blocked host is one row, not a million.
 *
 * `decision` is part of the key so the view reflects what actually happened: a
 * destination hit in both modes over time appears as two rows (`blocked` and
 * `would-block`) rather than being relabelled by the current mode.
 *
 * Only blocked / would-block destinations are stored here. Allowed traffic is
 * counted in Prometheus, never persisted — that is what keeps this table small.
 */
@Entity()
export class EgressBlockedDestination {
	/** The hostname the request asked for (the thing an admin allowlists). Empty when the target was a bare IP. */
	@PrimaryColumn({ type: 'varchar', length: 253 })
	hostname: string;

	/** The resolved/target IP that triggered the block (often the reason). Empty when unknown (e.g. DNS failure). */
	@PrimaryColumn({ type: 'varchar', length: 45 })
	resolvedIp: string;

	/** The feature/source that initiated the request (node, webhook, oauth, import, ...). */
	@PrimaryColumn({ type: 'varchar', length: 64 })
	feature: string;

	/** What happened: 'blocked' (rejected in enforce) or 'would-block' (let through in log mode). */
	@PrimaryColumn({ type: 'varchar', length: 16 })
	decision: 'blocked' | 'would-block';

	/** How many times this destination has been blocked / would-blocked. */
	@Column({ type: 'bigint', transformer: bigintStringToNumber })
	count: number;

	/** When this destination was most recently blocked / would-blocked. */
	@DateTimeColumn()
	lastSeen: Date;
}
