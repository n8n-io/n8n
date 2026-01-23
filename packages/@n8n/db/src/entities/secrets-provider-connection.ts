import { Column, Entity, OneToMany, PrimaryColumn } from '@n8n/typeorm';

import { WithTimestamps } from './abstract-entity';
import type { SharedSecretsProviderConnection } from './shared-secrets-provider-connection';

@Entity()
export class SecretsProviderConnection extends WithTimestamps {
	/**
	 * Unique provider identifier of the secrets provider connection.
	 * This is the identifier used in the credential expressions e.g. {{ $secrets.<provider-key>.<secret-key>}
	 */
	@PrimaryColumn()
	providerKey: string;

	/**
	 * Optional display name of the secrets provider connection
	 */
	@Column({ type: 'varchar', nullable: true })
	displayName: string | null;

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
	 * Whether the secrets provider connection is available for use by all projects.
	 */
	@Column({ default: false })
	isGlobal: boolean;

	/**
	 * Shared secrets provider connections are used to share the secrets provider connection with other projects.
	 */
	@OneToMany('SharedSecretsProviderConnection', 'secretsProviderConnection')
	shared: SharedSecretsProviderConnection[];

	/**
	 * Encrypted JSON string containing the connection settings for the secrets provider.
	 */
	@Column()
	encryptedSettings: string;

	/**
	 * Whether the secrets provider connection is enabled.
	 * When enabled, a connection attempt will be made to the external secrets provider.
	 * If the connection is successful, secrets will be available to be used in credentials.
	 *
	 * When disabled, the secrets provider connection will not be used to connect to the external secrets provider.
	 *
	 * This describes an intent rather than a state.
	 */
	@Column({ default: false })
	isEnabled: boolean;
}
