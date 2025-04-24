import { Column, Entity, PrimaryGeneratedColumn } from '@n8n/typeorm';

import { datetimeColumnType } from './abstract-entity';
import { RunningMode, SyncStatus, AuthProviderType } from '../types';

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
