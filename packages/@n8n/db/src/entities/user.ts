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
import { type IUser, type IUserSettings, UnexpectedError } from 'n8n-workflow';

import { JsonColumn, WithTimestamps } from './abstract-entity';
import type { ProjectRelation } from './project-relation';
import { Role } from './role';
import type { SharedCredentials } from './shared-credentials';
import type { SharedWorkflow } from './shared-workflow';

const SECRET_COLUMNS = new Set(['password', 'mfaSecret', 'mfaRecoveryCodes']);

/** The same values a `Principal` carries, so a `User` maps to a `Principal` without translation. */
export type UserKind = PrincipalType;

/**
 * An account: a person or a service account. Both live in the `user` table,
 * and the `kind` column tells them apart. TypeORM maps each row to its child
 * entity, `Person` or `ServiceAccount`.
 *
 * A query through `User` returns both kinds. Use `PersonRepository` when only
 * a person may appear. The person columns (email, name, password, …) live on
 * `Person`, so code must narrow with `isPerson` before it reads them.
 *
 * A `new User()` is a person: `kind` defaults to `'person'`, and TypeORM
 * saves a value under the child that its `kind` names. Create a service
 * account with `ServiceAccountRepository.create`, which also writes its details.
 */
@Entity()
@TableInheritance({ column: 'kind' })
export class User extends WithTimestamps implements AuthPrincipal {
	@PrimaryGeneratedColumn('uuid')
	id: string;

	/**
	 * TypeORM picks the child entity from this value on save, and sets it from
	 * the row on load. The initializer makes a bare `User` a person. The column
	 * default makes TypeORM read the value back after an insert. `update: false`
	 * keeps an update from moving an account to the other kind.
	 */
	@Column({ type: 'varchar', length: 16, default: 'person', update: false })
	readonly kind: UserKind = 'person';

	@ManyToOne(() => Role)
	@JoinColumn({ name: 'roleSlug', referencedColumnName: 'slug' })
	role: Role;

	@OneToMany('SharedWorkflow', 'user')
	sharedWorkflows: SharedWorkflow[];

	@OneToMany('SharedCredentials', 'user')
	sharedCredentials: SharedCredentials[];

	@OneToMany('ProjectRelation', 'user')
	projectRelations: ProjectRelation[];

	@Column({ type: Boolean, default: false })
	disabled: boolean;

	/** Both kinds of account have settings. */
	@JsonColumn({ nullable: true })
	settings: IUserSettings | null;

	/*
	 * These two are `NOT NULL`, so they stay here although only a person uses
	 * them. TypeORM marks every column of a child entity as nullable and, after a
	 * save, sets an unset nullable column to `null`. On a child, the next save of
	 * the same object would write `NULL` and fail.
	 */

	@Column({ type: Boolean, default: false })
	mfaEnabled: boolean;

	@Column({ type: 'simple-array', default: '' })
	mfaRecoveryCodes: string[];

	/*
	 * TypeORM runs the listeners of a child entity on every row of the table,
	 * so the listeners live here and each child overrides the method.
	 */

	@BeforeInsert()
	@BeforeUpdate()
	preUpsertHook(): void {}

	@AfterLoad()
	@AfterUpdate()
	computeIsPending(): void {}

	/**
	 * Leaves out the secret columns. They are dropped here, not in a child, so
	 * that an instance of any class never serializes them.
	 */
	toJSON(): Record<string, unknown> {
		return Object.fromEntries(
			Object.entries(this).filter(([column]) => !SECRET_COLUMNS.has(column)),
		);
	}

	/**
	 * The account as a workflow sees it. Each kind overrides this. A plain `User`
	 * comes from a query that did not select `kind`, which is a bug.
	 */
	toIUser(): IUser {
		throw new UnexpectedError('toIUser needs a Person or a ServiceAccount', {
			extra: { userId: this.id },
		});
	}
}
