/* eslint-disable import/no-cycle */
import {
	BeforeUpdate,
	Column,
	CreateDateColumn,
	Entity,
	OneToMany,
	PrimaryGeneratedColumn,
	Unique,
	UpdateDateColumn,
} from 'typeorm';
import { IsDate, IsOptional, IsString, Length } from 'class-validator';

import * as config from '../../../config';
import { DatabaseType } from '../../index';
import { User } from './User';
import { SharedWorkflow } from './SharedWorkflow';
import { SharedCredentials } from './SharedCredentials';

type RoleNames = 'owner' | 'member' | 'user' | 'editor';
type RoleScopes = 'global' | 'workflow' | 'credential';

// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
function getTimestampSyntax() {
	const dbType = config.getEnv('database.type');

	const map: { [key in DatabaseType]: string } = {
		sqlite: "STRFTIME('%Y-%m-%d %H:%M:%f', 'NOW')",
		postgresdb: 'CURRENT_TIMESTAMP(3)',
		mysqldb: 'CURRENT_TIMESTAMP(3)',
		mariadb: 'CURRENT_TIMESTAMP(3)',
	};

	return map[dbType];
}

@Entity()
@Unique(['scope', 'name'])
export class Role {
	@PrimaryGeneratedColumn()
	id: number;

	@Column({ length: 32 })
	@IsString({ message: 'Role name must be of type string.' })
	@Length(1, 32, { message: 'Role name must be 1 to 32 characters long.' })
	name: RoleNames;

	@Column()
	scope: RoleScopes;

	@OneToMany(() => User, (user) => user.globalRole)
	globalForUsers: User[];

	@CreateDateColumn({ precision: 3, default: () => getTimestampSyntax() })
	@IsOptional() // ignored by validation because set at DB level
	@IsDate()
	createdAt: Date;

	@UpdateDateColumn({
		precision: 3,
		default: () => getTimestampSyntax(),
		onUpdate: getTimestampSyntax(),
	})
	@IsOptional() // ignored by validation because set at DB level
	@IsDate()
	updatedAt: Date;

	@OneToMany(() => SharedWorkflow, (sharedWorkflow) => sharedWorkflow.role)
	sharedWorkflows: SharedWorkflow[];

	@OneToMany(() => SharedCredentials, (sharedCredentials) => sharedCredentials.role)
	sharedCredentials: SharedCredentials[];

	@BeforeUpdate()
	setUpdateDate(): void {
		this.updatedAt = new Date();
	}
}
