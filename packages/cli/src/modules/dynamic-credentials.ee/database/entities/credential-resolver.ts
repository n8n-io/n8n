import { WithTimestampsAndStringId } from '@n8n/db';
import type { CredentialResolverConfiguration } from '@n8n/decorators';
import { Column, Entity, Index } from '@n8n/typeorm';

@Entity()
export class DynamicCredentialResolver extends WithTimestampsAndStringId {
	@Column({ type: 'varchar', length: 128 })
	name: string;

	@Column({ type: 'varchar', length: 128 })
	type: string;

	@Column({ type: 'text' })
	config: string;

	/**
	 * ID of the encryption key used to encrypt this resolver's config.
	 * NULL means the row was encrypted with the legacy key before key rotation was introduced.
	 */
	@Index()
	@Column({ type: 'varchar', length: 36, nullable: true })
	encryptionKeyId: string | null = null;

	/** Decrypted config, not persisted to the database */
	decryptedConfig?: CredentialResolverConfiguration;
}
