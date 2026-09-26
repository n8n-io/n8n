import { DateTimeColumn, WithTimestampsAndStringId } from '@n8n/db';
import { Column, Entity } from '@n8n/typeorm';

export type TrustedSourceType = 'oauth2';
export type TrustedSourceManagedBy = 'system' | 'admin';
export type TrustedSourceStatus = 'unchecked' | 'healthy' | 'error';

/**
 * A stored authentication authority that n8n trusts to identify users.
 */
@Entity('trusted_source')
export class TrustedSourceEntity extends WithTimestampsAndStringId {
	@Column({ type: 'varchar', length: 128, unique: true })
	name: string;

	@Column({ type: 'varchar', length: 32 })
	type: TrustedSourceType;

	@Column({ type: 'varchar', unique: true })
	issuer: string;

	@Column({ type: 'varchar', length: 16 })
	managedBy: TrustedSourceManagedBy;

	@Column({ type: 'varchar', length: 16 })
	status: TrustedSourceStatus;

	@Column({ type: 'text', nullable: true })
	lastError: string | null;

	@DateTimeColumn({ nullable: true })
	lastCheckedAt: Date | null;

	@Column({ type: 'integer' })
	configVersion: number;

	/** Cipher.encryptV2(JSON.stringify(config)); the store decrypts, never the entity. */
	@Column({ type: 'text' })
	config: string;
}
