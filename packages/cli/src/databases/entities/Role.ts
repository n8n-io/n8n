import { Column, Entity, OneToMany, PrimaryColumn, Relation, Unique } from 'typeorm';
import { IsString, Length } from 'class-validator';

import type { User } from './User';
import type { SharedWorkflow } from './SharedWorkflow';
import type { SharedCredentials } from './SharedCredentials';
import { AbstractEntity } from './AbstractEntity';
import { idStringifier } from '../utils/transformers';

export type RoleNames = Role['name'];
export type RoleScopes = Role['scope'];

@Entity()
@Unique(['scope', 'name'])
export class Role extends AbstractEntity {
	@PrimaryColumn({ transformer: idStringifier })
	id: string;

	@Column({ length: 32 })
	@IsString({ message: 'Role name must be of type string.' })
	@Length(1, 32, { message: 'Role name must be 1 to 32 characters long.' })
	name: 'owner' | 'member' | 'user' | 'editor';

	@Column()
	scope: 'global' | 'workflow' | 'credential';

	@OneToMany('User', 'globalRole')
	globalForUsers: Relation<User[]>;

	@OneToMany('SharedWorkflow', 'role')
	sharedWorkflows: Relation<SharedWorkflow[]>;

	@OneToMany('SharedCredentials', 'role')
	sharedCredentials: Relation<SharedCredentials[]>;
}
