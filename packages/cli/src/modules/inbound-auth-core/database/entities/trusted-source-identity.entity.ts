import { DateTimeColumn, User, WithTimestamps } from '@n8n/db';
import { Column, Entity, Index, JoinColumn, ManyToOne, PrimaryColumn } from '@n8n/typeorm';

import { TrustedSourceEntity } from './trusted-source.entity';

export type TrustedSourceIdentityProvenance =
	| 'user-proven'
	| 'claim-match'
	| 'admin'
	| 'provisioning'
	| 'jit';
export type TrustedSourceIdentityStatus = 'active' | 'suspended' | 'revoked';

/**
 * Binds a subject at a trusted source to an n8n user.
 */
@Entity('trusted_source_identity')
export class TrustedSourceIdentityEntity extends WithTimestamps {
	@PrimaryColumn({ type: 'varchar', length: 36 })
	sourceId: string;

	@PrimaryColumn({ type: 'varchar' })
	subject: string;

	@ManyToOne(() => TrustedSourceEntity, { onDelete: 'CASCADE' })
	@JoinColumn({ name: 'sourceId' })
	source: TrustedSourceEntity;

	@Index()
	@Column({ type: String })
	userId: string;

	@ManyToOne(() => User, { onDelete: 'CASCADE' })
	@JoinColumn({ name: 'userId' })
	user: User;

	@Column({ type: 'varchar', length: 32 })
	provenance: TrustedSourceIdentityProvenance;

	@Column({ type: 'varchar', length: 16 })
	status: TrustedSourceIdentityStatus;

	@DateTimeColumn({ nullable: true })
	lastSeenAt: Date | null;
}
