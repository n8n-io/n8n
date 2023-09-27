import type { ColumnOptions } from 'typeorm';
import {
	BeforeInsert,
	BeforeUpdate,
	CreateDateColumn,
	PrimaryColumn,
	UpdateDateColumn,
} from 'typeorm';
import config from '@/config';
import { generateNanoId } from '../utils/generators';

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

type Constructor<T> = new (...args: any[]) => T;

function mixinStringId<T extends Constructor<{}>>(base: T) {
	class Derived extends base {
		@PrimaryColumn('varchar')
		id: string;

		@BeforeInsert()
		generateId() {
			if (!this.id) {
				this.id = generateNanoId();
			}
		}
	}
	return Derived;
}

function mixinTimestamps<T extends Constructor<{}>>(base: T) {
	class Derived extends base {
		@CreateDateColumn(tsColumnOptions)
		createdAt: Date;

		@UpdateDateColumn(tsColumnOptions)
		updatedAt: Date;

		@BeforeUpdate()
		setUpdateDate(): void {
			this.updatedAt = new Date();
		}
	}
	return Derived;
}

class BaseEntity {}
/* eslint-disable @typescript-eslint/naming-convention */
export const WithStringId = mixinStringId(BaseEntity);
export const WithTimestamps = mixinTimestamps(BaseEntity);
export const WithTimestampsAndStringId = mixinStringId(WithTimestamps);
