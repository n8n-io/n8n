import { Column, Entity, OneToMany, PrimaryColumn } from '@n8n/typeorm';

import { DateTimeColumn, WithTimestampsAndStringId } from './abstract-entity';
import type { SharedSecretsProviderConnection } from './shared-secrets-provider-connection';

export type SecretsProviderConnectionState = 'connected' | 'tested' | 'initializing' | 'error';

@Entity()
export class SecretsProviderConnection extends WithTimestampsAndStringId {
	@PrimaryColumn()
	name: string;

	@Column({ nullable: true })
	displayName: string | null;

	@Column()
	type: string;

	@OneToMany('SharedSecretsProviderConnection', 'secretsProviderConnection')
	shared: SharedSecretsProviderConnection[];

	@Column('text')
	settings: string;

	@Column({ default: false })
	connected: boolean;

	@DateTimeColumn({ nullable: true })
	connectedAt: Date | null;

	@Column({ default: 'initializing' })
	state: SecretsProviderConnectionState;
}
