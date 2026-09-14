import { JsonColumn, WithTimestampsAndStringId } from '@n8n/db';
import { Column, Entity } from '@n8n/typeorm';

import type { PolicyRule } from '../../policy-rule.types';

/**
 * A reusable rules document. It carries no scope and no default action, and may be
 * attached to any number of scopes via `policy_attachment`.
 *
 * `kind` partitions the table by policy feature (node types today) so a sibling kind
 * needs no migration. It has no CHECK constraint for that reason — callers validate it.
 */
@Entity('type_availability_policy')
export class TypeAvailabilityPolicy extends WithTimestampsAndStringId {
	@Column({ type: 'varchar', length: 64 })
	kind: string;

	@JsonColumn()
	rules: PolicyRule[];

	/**
	 * Incremented on every content change. Drives optimistic concurrency, cache keys
	 * and the audit trail — so an upsert with unchanged rules must not bump it.
	 */
	@Column({ type: 'int', default: 1 })
	version: number;

	/** A user id, or the literal `environment` for env-bootstrap writes. */
	@Column({ type: 'varchar', length: 36 })
	updatedBy: string;
}
