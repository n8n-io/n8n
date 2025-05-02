import { DateTimeColumn, AuthProviderType } from '@n8n/db';
import { Column, Entity, PrimaryGeneratedColumn } from '@n8n/typeorm';

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

	@DateTimeColumn()
	startedAt: Date;

	@DateTimeColumn()
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
