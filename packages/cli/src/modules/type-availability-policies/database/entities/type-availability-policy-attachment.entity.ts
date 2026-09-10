import { WithTimestamps } from '@n8n/db';
import { Column, Entity, Index, PrimaryColumn } from '@n8n/typeorm';

/**
 * Attaches one policy to one scope, at a position in that scope's evaluation order.
 *
 * `(scopeId, policyId)` is the primary key — a policy attaches to a scope at most once,
 * and the pair is the table's only candidate key. A second unique index (declared in the
 * migration) rejects two attachments sharing a priority within the same partition.
 *
 * Both FKs are declared in the migration rather than as relations, to keep the entity
 * decoupled; note they differ in delete behaviour (scope cascades, policy restricts).
 */
@Entity('type_availability_policy_attachment')
export class TypeAvailabilityPolicyAttachment extends WithTimestamps {
	@PrimaryColumn({ type: 'varchar', length: 36 })
	scopeId: string;

	@Index()
	@PrimaryColumn({ type: 'varchar', length: 36 })
	policyId: string;

	/** Ascending order within the partition `isFloor` selects. */
	@Column({ type: 'int' })
	priority: number;

	/** Floor attachments evaluate before all normal ones, so they cannot be shadowed. */
	@Column({ type: 'boolean', default: false })
	isFloor: boolean;
}
