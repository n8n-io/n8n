import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';
import { datetimeColumnType } from './AbstractEntity';

@Entity({ name: 'ldap_sync_history' })
export class LdapSyncHistory {
	@PrimaryGeneratedColumn()
	id: number;

	@Column(datetimeColumnType)
	startedAt: Date;

	@Column(datetimeColumnType)
	endedAt: Date;

	@Column()
	created: number;

	@Column()
	updated: number;

	@Column()
	disabled: number;

	@Column()
	scanned: number;

	@Column()
	status: string;

	@Column()
	error: string;

	@Column()
	runMode: string;
}
