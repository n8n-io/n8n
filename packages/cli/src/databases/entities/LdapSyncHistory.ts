import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';
import * as config from '@/config';
import { DatabaseType } from '@/Interfaces';

function resolveDataType(dataType: string) {
	const dbType = config.getEnv('database.type');

	const typeMap: { [key in DatabaseType]: { [key: string]: string } } = {
		sqlite: {
			json: 'simple-json',
		},
		postgresdb: {
			datetime: 'timestamptz',
		},
		mysqldb: {},
		mariadb: {},
	};

	return typeMap[dbType][dataType] ?? dataType;
}

@Entity({ name: 'ldap_sync_history' })
export class LdapSyncHistory {
	@PrimaryGeneratedColumn()
	id: number;

	@Column(resolveDataType('datetime'))
	startedAt: Date;

	@Column(resolveDataType('datetime'))
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
