import { Column, Entity, Index, OneToMany } from '@n8n/typeorm';
import { IsObject, IsString, Length } from 'class-validator';

import { WithTimestampsAndStringId } from './abstract-entity';
import type { SharedCredentials } from './shared-credentials';
import type { ICredentialsDb } from './types-db';

/**
 * Usage surface: where a credential may be consumed.
 * - `workflow`: a normal credential, usable in the workflow canvas.
 * - `instance`: usable only by instance-level features (e.g. the Instance AI
 *   model); never selectable or resolvable in the canvas. Managed by global
 *   owners/admins via the `credential:manageInstance` scope and owned by the
 *   instance itself (no `SharedCredentials` row).
 *
 * Kept as a varchar rather than a DB enum so future surfaces (e.g. sandbox-only
 * credentials) don't require a table rebuild. Who manages a credential and who
 * owns it depend on the specific value, not on the column: never treat
 * `availability !== 'workflow'` as shorthand for "system credential".
 */
export type CredentialAvailability = 'workflow' | 'instance';

@Entity()
export class CredentialsEntity extends WithTimestampsAndStringId implements ICredentialsDb {
	@Column({ length: 128 })
	@IsString({ message: 'Credential `name` must be of type string.' })
	@Length(3, 128, {
		message: 'Credential name must be $constraint1 to $constraint2 characters long.',
	})
	name: string;

	@Column('text')
	@IsObject()
	data: string;

	@Index()
	@IsString({ message: 'Credential `type` must be of type string.' })
	@Column({
		length: 128,
	})
	type: string;

	@OneToMany('SharedCredentials', 'credentials')
	shared: SharedCredentials[];

	/**
	 * Whether the credential is managed by n8n. We currently use this flag
	 * to provide OpenAI free credits on cloud. Managed credentials cannot be
	 * edited by the user.
	 */
	@Column({ default: false })
	isManaged: boolean;

	/**
	 * Whether the credential is available for use by all users.
	 */
	@Column({ default: false })
	isGlobal: boolean;

	/**
	 * Whether the credential can be dynamically resolved by a resolver.
	 */
	@Column({ default: false })
	isResolvable: boolean;

	/**
	 * Whether the credential resolver should allow falling back to static credentials
	 * if dynamic resolution fails.
	 */
	@Column({ default: false })
	resolvableAllowFallback: boolean;

	/**
	 * ID of the dynamic credential resolver associated with this credential.
	 */
	@Column({ type: 'varchar', nullable: true })
	resolverId: string | null;

	/**
	 * Usage surface: where this credential may be consumed. See {@link CredentialAvailability}.
	 */
	@Column({ type: 'varchar', length: 16, default: 'workflow' })
	availability: CredentialAvailability;

	toJSON() {
		const { shared, ...rest } = this;
		return rest;
	}
}
