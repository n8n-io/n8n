import { Column, Entity, Index, OneToMany, PrimaryGeneratedColumn } from '@n8n/typeorm';

import { WithTimestamps } from './abstract-entity';
import type { ProjectSecretsProviderAccess } from './project-secrets-provider-access';

@Entity()
export class SecretsProviderConnection extends WithTimestamps {
	@PrimaryGeneratedColumn()
	id: number;

	/**
	 * Unique provider identifier of the secrets provider connection.
	 * This is the identifier used in the credential expressions e.g. {{ $secrets.<provider-key>.<secret-key>}
	 */
	@Index({ unique: true })
	@Column()
	providerKey: string;

	/**
	 * Specifies the provider type, which determines the required settings for connecting to the external secrets provider.
	 * e.g:
	 * 'awsSecretsManager',
	 * 'gcpSecretsManager',
	 * 'hashicorpVault',
	 * 'azureKeyVault',
	 */
	@Column()
	type: string;

	/**
	 * Projects that have access to this secrets provider connection.
	 * If empty, the provider is global and accessible to all projects.
	 * If populated, the provider is project-scoped and only accessible to the specified projects.
	 */
	@OneToMany('ProjectSecretsProviderAccess', 'secretsProviderConnection', { eager: true })
	projectAccess: ProjectSecretsProviderAccess[];

	/**
	 * Encrypted JSON string containing the connection settings for the secrets provider.
	 */
	@Column()
	encryptedSettings: string;
}
