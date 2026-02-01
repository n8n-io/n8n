import { WithTimestampsAndStringId } from '@n8n/db';
import type { CredentialResolverConfiguration } from '@n8n/decorators';
import { Column, Entity } from '@n8n/typeorm';

@Entity()
export class DynamicCredentialResolver extends WithTimestampsAndStringId {
	@Column({ type: 'varchar', length: 128 })
	name: string;

	@Column({ type: 'varchar', length: 128 })
	type: string;

	@Column({ type: 'text' })
	config: string;

	/** Decrypted config, not persisted to the database */
	decryptedConfig?: CredentialResolverConfiguration;
}
