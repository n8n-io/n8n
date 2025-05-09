import { Column, Entity, PrimaryGeneratedColumn } from '@n8n/typeorm';

import { DateTimeColumn } from './abstract-entity';
import { AuthProviderType, RunningMode, SyncStatus } from './types-db';

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
