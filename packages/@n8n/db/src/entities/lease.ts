import { Column, Entity, Index, PrimaryColumn } from '@n8n/typeorm';

import { DateTimeColumn, WithTimestamps } from './abstract-entity';

@Entity({ name: 'lease' })
@Index(['kind', 'sessionId'])
@Index(['kind', 'group'])
export class Lease extends WithTimestamps {
	@PrimaryColumn({ type: 'varchar', length: 24 })
	kind: string;

	@PrimaryColumn({ type: 'varchar', length: 255 })
	key: string;

	@Column({ type: 'text' })
	data: string;

	@Column({ type: 'varchar', length: 64 })
	dataHash: string;

	@Column({ type: 'varchar', length: 255, nullable: true })
	group: string | null;

	@Column({ type: 'varchar', length: 36, nullable: true })
	sessionId: string | null;

	@Column({ type: 'bigint', default: 0 })
	fencingToken: string;

	@DateTimeColumn({ nullable: true })
	claimedAt: Date | null;

	@DateTimeColumn({ nullable: true })
	readyAt: Date | null;

	@Column({ type: 'boolean', default: false })
	revoked: boolean;

	@DateTimeColumn({ nullable: true })
	revokedAt: Date | null;

	@Column({ type: 'int', default: 0 })
	startAttempts: number;

	@DateTimeColumn({ nullable: true })
	nextAttemptAt: Date | null;

	@Column({ type: 'text', nullable: true })
	lastError: string | null;

	@DateTimeColumn({ nullable: true })
	lastErrorAt: Date | null;
}
