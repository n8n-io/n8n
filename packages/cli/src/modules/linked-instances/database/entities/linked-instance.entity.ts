import type { LinkedInstanceStatus } from '@n8n/api-types';
import { DateTimeColumn, WithTimestamps } from '@n8n/db';
import { Column, Entity, Index, PrimaryColumn } from '@n8n/typeorm';

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

	/** Project on the linked instance that gets new automations. Set with its name, or not at all. */
	@Column({ type: 'varchar', length: 36, nullable: true })
	defaultRemoteProjectId: string | null;

	/** Name of that project when it was last read from the linked instance. */
	@Column({ type: 'varchar', length: 255, nullable: true })
	defaultRemoteProjectName: string | null;
}
