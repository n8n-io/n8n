import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';
import { datetimeColumnType } from './AbstractEntity';
import { AuthProviderType } from './AuthIdentity';

export type RunningMode = AuthProviderSyncHistory['runMode'];
export type SyncStatus = AuthProviderSyncHistory['status'];

@Entity()
export class AuthProviderSyncHistory {
	@PrimaryGeneratedColumn()
	id: number;

	@Column('text')
	providerType: AuthProviderType;

	@Column('text')
	runMode: 'dry' | 'live';

	@Column('text')
	status: 'success' | 'error';

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
