import { Column, Entity, PrimaryGeneratedColumn } from '@n8n/typeorm';

import { datetimeColumnType } from './abstract-entity';
import { AuthProviderType } from './auth-identity';

export type RunningMode = 'dry' | 'live';
export type SyncStatus = 'success' | 'error';

@Entity()
export class AuthProviderSyncHistory {
	@PrimaryGeneratedColumn()
	id: number;

	@Column('text')
	providerType: AuthProviderType;

	@Column('text')
	runMode: RunningMode;

	@Column('text')
	status: SyncStatus;

	@Column(datetimeColumnType)
	startedAt: Date;

	@Column(datetimeColumnType)
	endedAt: Date;

	@Column()
	scanned: number;

	@Column()
	created: number;

	@Column()
	updated: number;

	@Column()
	disabled: number;

	@Column()
	error: string;
}
