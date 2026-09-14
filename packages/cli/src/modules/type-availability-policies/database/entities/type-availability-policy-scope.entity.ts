import { WithTimestampsAndStringId } from '@n8n/db';
import { Column, Entity } from '@n8n/typeorm';

import type { PolicyAction } from '../../policy-rule.types';

/**
 * What one scope owns: its default action, plus the attachments that point at it.
 *
 * Whether a row is the instance scope is derived — `projectId IS NULL` — rather than stored,
 * so there is no instance-vs-project flag that could disagree with `projectId`. Two partial
 * unique indexes (declared in the migration) enforce at most one row per kind per project,
 * and at most one instance row per kind.
 *
 * The FK to `project` is declared in the migration rather than as a `@ManyToOne`, to keep
 * the module entity decoupled from the core `Project` entity.
 */
@Entity('type_availability_policy_scope')
export class TypeAvailabilityPolicyScope extends WithTimestampsAndStringId {
	@Column({ type: 'varchar', length: 64 })
	kind: string;

	@Column({ type: 'varchar', length: 36, nullable: true })
	projectId: string | null;

	@Column({ type: 'varchar', length: 16 })
	defaultAction: PolicyAction;

	/**
	 * Freshness signal for the scope's *effective* policy, so it is bumped when an
	 * attachment is added, removed or reordered — not only on `defaultAction` edits.
	 */
	@Column({ type: 'int', default: 1 })
	version: number;

	/** A user id, or the literal `environment` for env-bootstrap writes. */
	@Column({ type: 'varchar', length: 36 })
	updatedBy: string;
}
