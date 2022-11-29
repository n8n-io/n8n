import { Column, Entity, OneToMany, PrimaryGeneratedColumn, Unique } from 'typeorm';
import { IsString, Length } from 'class-validator';

import { User } from './User';
import { SharedWorkflow } from './SharedWorkflow';
import { SharedCredentials } from './SharedCredentials';
import { AbstractEntity } from './AbstractEntity';

export type RoleNames = 'owner' | 'member' | 'user' | 'editor';
export type RoleScopes = 'global' | 'workflow' | 'credential';

@Entity()
@Unique(['scope', 'name'])
export class Role extends AbstractEntity {
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

	@OneToMany(() => SharedWorkflow, (sharedWorkflow) => sharedWorkflow.role)
	sharedWorkflows: SharedWorkflow[];

	@OneToMany(() => SharedCredentials, (sharedCredentials) => sharedCredentials.role)
	sharedCredentials: SharedCredentials[];
}
