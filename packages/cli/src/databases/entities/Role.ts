import { Column, Entity, OneToMany, PrimaryColumn, Unique } from 'typeorm';
import { IsString, Length } from 'class-validator';

import type { SharedWorkflow } from './SharedWorkflow';
import type { SharedCredentials } from './SharedCredentials';
import { WithTimestamps } from './AbstractEntity';
import { idStringifier } from '../utils/transformers';

export type RoleName = 'owner' | 'member' | 'user' | 'editor' | 'admin';
export type RoleScope = 'global' | 'workflow' | 'credential'; // TODO: remove `global`

@Entity()
@Unique(['scope', 'name'])
export class Role extends WithTimestamps {
	@PrimaryColumn({ transformer: idStringifier })
	id: string;

	@Column({ length: 32 })
	@IsString({ message: 'Role name must be of type string.' })
	@Length(1, 32, { message: 'Role name must be 1 to 32 characters long.' })
	name: RoleName;

	@Column()
	scope: RoleScope;

	@OneToMany('SharedWorkflow', 'role')
	sharedWorkflows: SharedWorkflow[];

	@OneToMany('SharedCredentials', 'role')
	sharedCredentials: SharedCredentials[];

	get cacheKey() {
		return `role:${this.scope}:${this.name}`;
	}
}
