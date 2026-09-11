import type {
	PromotionProviderAuthType,
	PromotionProviderConfig,
	PromotionProviderType,
} from '@n8n/api-types';
import { JsonColumn, WithTimestampsAndStringId } from '@n8n/db';
import { Column, Entity } from '@n8n/typeorm';

/**
 * Credentials for a remote, shared by any number of connections. The database
 * limits which {@link type} and {@link authType} values are allowed.
 */
@Entity('promotion_provider')
export class PromotionProvider extends WithTimestampsAndStringId {
	@Column({ type: 'varchar', length: 128 })
	name: string;

	@Column({ type: 'varchar', length: 32 })
	type: PromotionProviderType;

	/** `token` is an HTTP(S) username and password, not a Git host API token. */
	@Column({ type: 'varchar', length: 32 })
	authType: PromotionProviderAuthType;

	/**
	 * Non-secret settings, with their own `schemaVersion`. This type says what we
	 * write, not what an older row holds, so check a loaded row against the schema
	 * for {@link authType}. The same applies to the other JSON columns in this module.
	 */
	@JsonColumn()
	config: PromotionProviderConfig;

	/** Encrypted credentials. Never sent to a client. */
	@Column({ type: 'text' })
	auth: string;
}
