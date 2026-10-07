import { DateTimeColumn, WithTimestamps } from '@n8n/db';
import { Column, Entity, Index, PrimaryColumn } from '@n8n/typeorm';

import type { LinkedInstanceStatus } from '../../linked-instances.types';

/** Another n8n instance that one user linked. The user's deletion removes the row. */
@Entity('linked_instance')
@Index(['userId', 'baseUrl'], { unique: true })
export class LinkedInstance extends WithTimestamps {
	@PrimaryColumn('uuid')
	id: string;

	@Index()
	@Column({ type: 'uuid' })
	userId: string;

	@Column({ type: 'varchar', length: 64 })
	name: string;

	/** Normalised origin, for example `https://acme.app.n8n.cloud`. */
	@Column({ type: 'varchar', length: 2048 })
	baseUrl: string;

	/** Cipher.encryptV2(token). Only the store decrypts it, and only for use. */
	@Column({ type: 'text' })
	tokenEncrypted: string;

	@Column({ type: 'varchar', length: 16, default: 'unknown' })
	status: LinkedInstanceStatus;

	@DateTimeColumn({ nullable: true })
	lastVerifiedAt: Date | null;
}
