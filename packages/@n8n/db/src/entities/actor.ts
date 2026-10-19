import type { AuthPrincipal, PrincipalType } from '@n8n/permissions';
import {
	AfterLoad,
	AfterUpdate,
	BeforeInsert,
	BeforeUpdate,
	Column,
	Entity,
	JoinColumn,
	ManyToOne,
	OneToMany,
	PrimaryGeneratedColumn,
	TableInheritance,
} from '@n8n/typeorm';
import type { IUser } from 'n8n-workflow';

import { WithTimestamps } from './abstract-entity';
import type { ApiKey } from './api-key';
import type { AuthIdentity } from './auth-identity';
import type { ProjectRelation } from './project-relation';
import { Role } from './role';

/** The same value the `Principal` carries, so an `Actor` maps to a `Principal` with no translation. */
export type ActorType = PrincipalType;
export const ActorTypes = ['human', 'service'] as const satisfies readonly ActorType[];

/**
 * A caller that can hold a global role and join projects. Humans and service
 * accounts share the `user` table. The `type` column tells them apart and
 * TypeORM maps each row to the matching child entity (`User`, `ServiceAccount`).
 *
 * The 43 foreign keys that point at `user.id` accept both kinds. A query on a
 * child repository filters by `type` on its own. A many-to-one relation does
 * not: a relation that must accept a service account targets `Actor`.
 */
@Entity({ name: 'user' })
@TableInheritance({ column: { type: 'varchar', name: 'type', length: 32 } })
export abstract class Actor extends WithTimestamps implements AuthPrincipal {
	@PrimaryGeneratedColumn('uuid')
	id: string;

	/** Set by TypeORM from the child entity's discriminator value. Read-only in code. */
	@Column({ type: 'varchar', length: 32 })
	readonly type: ActorType;

	@ManyToOne(() => Role)
	@JoinColumn({ name: 'roleSlug', referencedColumnName: 'slug' })
	role: Role;

	@Column({ type: Boolean, default: false })
	disabled: boolean;

	@OneToMany('AuthIdentity', 'user')
	authIdentities: AuthIdentity[];

	@OneToMany('ApiKey', 'user')
	apiKeys: ApiKey[];

	@OneToMany('ProjectRelation', 'user')
	projectRelations: ProjectRelation[];

	/*
	 * Lifecycle hooks live here, not on the children. TypeORM attaches the hooks
	 * of every child to the base entity and runs them on each row the base loads,
	 * so a hook declared on `User` would run on a `ServiceAccount` and throw. A
	 * child overrides the method without a decorator.
	 */

	@BeforeInsert()
	@BeforeUpdate()
	preUpsertHook(): void {}

	@AfterLoad()
	@AfterUpdate()
	postLoadHook(): void {}

	/** The name of the personal project of this caller. */
	abstract createPersonalProjectName(): string;

	/** The fields the UI shows for a caller. */
	abstract toIUser(): IUser;
}
