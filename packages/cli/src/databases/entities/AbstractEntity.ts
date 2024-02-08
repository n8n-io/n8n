import type { ColumnOptions } from '@n8n/typeorm';
import {
	BeforeInsert,
	BeforeUpdate,
	CreateDateColumn,
	PrimaryColumn,
	UpdateDateColumn,
} from '@n8n/typeorm';
import config from '@/config';
import type { Class } from 'n8n-core';
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

function mixinStringId<T extends Class<{}, any[]>>(base: T) {
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

function mixinTimestamps<T extends Class<{}, any[]>>(base: T) {
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

export const WithStringId = mixinStringId(BaseEntity);
export const WithTimestamps = mixinTimestamps(BaseEntity);
export const WithTimestampsAndStringId = mixinStringId(WithTimestamps);
