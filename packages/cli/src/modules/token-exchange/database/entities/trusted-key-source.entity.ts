import { DateTimeColumn, WithTimestamps } from '@n8n/db';
import { Column, Entity, PrimaryColumn } from '@n8n/typeorm';

import type {
	TrustedKeySourceManagedBy,
	TrustedKeySourceStatus,
	TrustedKeySourceType,
} from '../../token-exchange.schemas';

@Entity('trusted_key_source')
export class TrustedKeySourceEntity extends WithTimestamps {
	@PrimaryColumn('varchar', { length: 36 })
	id: string;

	@Column({ type: 'varchar', length: 32 })
	type: TrustedKeySourceType;

	/**
	 * Derived state: the discovery document for an SSO source, `N8N_TRUSTED_KEYS`
	 * for an env-config one. Rewritten wholesale on every refresh — never store
	 * anything an admin set here, it will not survive a restart. See `policy`.
	 */
	@Column('text')
	config: string;

	/**
	 * Administered state: a JSON `TrustedKeySourcePolicy` of overrides applied
	 * on top of `config` when keys are resolved. Only the API writes this, which
	 * is what makes the config refresh non-destructive.
	 */
	@Column({ type: 'text', nullable: true })
	policy: string | null;

	@Column({ type: 'varchar', length: 32, default: 'pending' })
	status: TrustedKeySourceStatus;

	@Column({ type: 'text', nullable: true })
	lastError: string | null;

	@DateTimeColumn({ nullable: true })
	lastRefreshedAt: Date | null;

	@Column({ type: 'varchar', length: 32, default: 'env-config' })
	managedBy: TrustedKeySourceManagedBy;

	@Column({ type: 'varchar', length: 255, nullable: true })
	issuer: string | null;
}
