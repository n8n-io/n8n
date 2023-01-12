import { Column, Entity, OneToMany, PrimaryColumn, Unique } from 'typeorm';
import { IsString, Length } from 'class-validator';

import type { User } from './User';
import type { SharedWorkflow } from './SharedWorkflow';
import type { SharedCredentials } from './SharedCredentials';
import { AbstractEntity } from './AbstractEntity';
import { idStringifier } from '../utils/transformers';

export type RoleNames = 'owner' | 'member' | 'user' | 'editor';
export type RoleScopes = 'global' | 'workflow' | 'credential';

@Entity()
@Unique(['scope', 'name'])
export class Role extends AbstractEntity {
	@PrimaryColumn({ transformer: idStringifier })
	id: string;

	@Column({ length: 32 })
	@IsString({ message: 'Role name must be of type string.' })
	@Length(1, 32, { message: 'Role name must be 1 to 32 characters long.' })
	name: RoleNames;

	@Column()
	scope: RoleScopes;

	@OneToMany('User', 'globalRole')
	globalForUsers: User[];

	@OneToMany('SharedWorkflow', 'role')
	sharedWorkflows: SharedWorkflow[];

	@OneToMany('SharedCredentials', 'role')
	sharedCredentials: SharedCredentials[];
}
