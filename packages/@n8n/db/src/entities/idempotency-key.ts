import { Column, Entity, Index, JoinColumn, ManyToOne, Relation } from '@n8n/typeorm';

import { JsonColumn, WithTimestampsAndStringId } from './abstract-entity';
import type { User } from './user';

export const idempotencyKeyStatuses = ['processing', 'completed'] as const;

export type IdempotencyKeyStatus = (typeof idempotencyKeyStatuses)[number];

/**
 * One stored Public API write per user and Idempotency-Key.
 * A retry with the same pair returns this row. The handler does not run again.
 */
@Entity({ name: 'idempotency_key' })
@Index(['userId', 'idempotencyKey'], { unique: true })
@Index(['createdAt'])
export class IdempotencyKey extends WithTimestampsAndStringId {
	@Column({ type: 'uuid' })
	userId: string;

	@ManyToOne('User', { onDelete: 'CASCADE' })
	@JoinColumn({ name: 'userId' })
	user: Relation<User>;

	@Column({ type: 'varchar', length: 128 })
	idempotencyKey: string;

	@Column({ type: 'text' })
	fingerprint: string;

	@Column({ type: 'varchar', length: 16, default: 'processing' })
	status: IdempotencyKeyStatus;

	@Column({ type: 'smallint', nullable: true })
	responseStatus: number | null;

	@JsonColumn({ nullable: true })
	responseBody: unknown;
}
