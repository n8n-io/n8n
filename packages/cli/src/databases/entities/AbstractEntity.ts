import type { ColumnOptions } from 'typeorm';
import { BeforeUpdate, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import config from '@/config';

const dbType = config.getEnv('database.type');

const timestampSyntax = {
	sqlite: "STRFTIME('%Y-%m-%d %H:%M:%f', 'NOW')",
	postgresdb: 'CURRENT_TIMESTAMP(3)',
	mysqldb: 'CURRENT_TIMESTAMP(3)',
	mariadb: 'CURRENT_TIMESTAMP(3)',
}[dbType];

export const jsonColumnType = dbType === 'sqlite' ? 'simple-json' : 'json';
export const datetimeColumnType = dbType === 'postgresdb' ? 'timestamptz' : 'datetime';

const tsColumnOptions: ColumnOptions = {
	precision: 3,
	default: () => timestampSyntax,
	type: datetimeColumnType,
};

export abstract class AbstractEntity {
	@CreateDateColumn(tsColumnOptions)
	createdAt: Date;

	@UpdateDateColumn(tsColumnOptions)
	updatedAt: Date;

	@BeforeUpdate()
	setUpdateDate(): void {
		this.updatedAt = new Date();
	}
}
