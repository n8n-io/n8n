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
	PrimaryGeneratedColumn,
	TableInheritance,
} from '@n8n/typeorm';

import { WithTimestamps } from './abstract-entity';
import { Role } from './role';

const secretFields = new Set(['password', 'mfaSecret', 'mfaRecoveryCodes']);

/** The same values a `Principal` carries, so an `Actor` maps to a `Principal` without translation. */
export type ActorKind = PrincipalType;

/**
 * An account that holds a global role. Humans and service accounts share the
 * `user` table. The `kind` column tells them apart, and TypeORM maps each row
 * to its child entity (`User` or `ServiceAccount`).
 *
 * A find on a child repository filters by `kind`. A many-to-one join does not:
 * a relation that must accept a service account has to target `Actor`.
 */
@Entity({ name: 'user' })
@TableInheritance({ column: 'kind' })
export abstract class Actor extends WithTimestamps implements AuthPrincipal {
	@PrimaryGeneratedColumn('uuid')
	id: string;

	@Column({ type: 'varchar', length: 16, default: 'human', update: false })
	readonly kind: ActorKind;

	@ManyToOne(() => Role)
	@JoinColumn({ name: 'roleSlug', referencedColumnName: 'slug' })
	role: Role;

	@Column({ type: Boolean, default: false })
	disabled: boolean;

	@Column({ type: Boolean, default: false })
	mfaEnabled: boolean;

	@Column({ type: 'simple-array', default: '' })
	mfaRecoveryCodes: string[];

	/*
	 * TypeORM attaches the lifecycle hooks of every child to this base entity
	 * and runs them on each row it loads. A hook declared on `User` would then
	 * run on a `ServiceAccount`. So the hooks are declared here, and a child
	 * overrides the method without a decorator.
	 */

	@BeforeInsert()
	@BeforeUpdate()
	preUpsertHook(): void {}

	@AfterLoad()
	@AfterUpdate()
	postLoadHook(): void {}
	toJSON() {
		return Object.fromEntries(Object.entries(this).filter(([key]) => !secretFields.has(key)));
	}
}
