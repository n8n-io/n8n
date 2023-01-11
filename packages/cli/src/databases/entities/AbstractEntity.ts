import { BeforeUpdate, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { IsDate, IsOptional } from 'class-validator';
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

export abstract class AbstractEntity {
	@CreateDateColumn({
		precision: 3,
		default: () => timestampSyntax,
	})
	@IsOptional() // ignored by validation because set at DB level
	@IsDate()
	createdAt: Date;

	@UpdateDateColumn({
		precision: 3,
		default: () => timestampSyntax,
		onUpdate: timestampSyntax,
	})
	@IsOptional() // ignored by validation because set at DB level
	@IsDate()
	updatedAt: Date;

	@BeforeUpdate()
	setUpdateDate(): void {
		this.updatedAt = new Date();
	}
}
