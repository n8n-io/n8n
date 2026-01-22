import { Column, Entity, OneToMany } from '@n8n/typeorm';

import { DateTimeColumn, WithTimestampsAndStringId } from './abstract-entity';
import type { SharedSecretsProviderConnection } from './shared-secrets-provider-connection';

export type SecretsProviderConnectionState = 'connected' | 'tested' | 'initializing' | 'error';

@Entity()
export class SecretsProviderConnection extends WithTimestampsAndStringId {
	@Column({ unique: true })
	name: string;

	@Column({ nullable: true })
	displayName: string | null;

	@Column()
	type: string;

	/**
	 * Whether the secrets provider connection is available for use by all projects.
	 */
	@Column({ default: false })
	isGlobal: boolean;

	@OneToMany('SharedSecretsProviderConnection', 'secretsProviderConnection')
	shared: SharedSecretsProviderConnection[];

	@Column()
	settings: string;

	@Column({ default: false })
	connected: boolean;

	@DateTimeColumn({ nullable: true })
	connectedAt: Date | null;

	@Column({ default: 'initializing' })
	state: SecretsProviderConnectionState;
}
