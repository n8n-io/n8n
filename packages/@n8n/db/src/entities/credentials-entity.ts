import { CREDENTIAL_DESCRIPTION_MAX_LENGTH } from '@n8n/api-types';
import { Column, Entity, Index, OneToMany } from '@n8n/typeorm';
import { IsObject, IsOptional, IsString, Length, MaxLength } from 'class-validator';

import { DateTimeColumn, WithTimestampsAndStringId } from './abstract-entity';
import type { SharedCredentials } from './shared-credentials';
import type { ICredentialsDb } from './types-db';

export type CredentialUsageScope = 'project' | 'instance';

@Entity()
export class CredentialsEntity extends WithTimestampsAndStringId implements ICredentialsDb {
	@Column({ length: 128 })
	@IsString({ message: 'Credential `name` must be of type string.' })
	@Length(3, 128, {
		message: 'Credential name must be $constraint1 to $constraint2 characters long.',
	})
	name: string;

	/** User-supplied note on what the credential is for. Blank is stored as `null`. */
	@Column({ type: 'text', nullable: true })
	@IsOptional()
	@IsString({ message: 'Credential `description` must be of type string.' })
	@MaxLength(CREDENTIAL_DESCRIPTION_MAX_LENGTH, {
		message: 'Credential description must be at most $constraint1 characters long.',
	})
	description: string | null;

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

	@Column({ type: 'varchar', length: 16, default: 'project' })
	usageScope: CredentialUsageScope;

	/**
	 * Set on a credential created for an OAuth authorization the user has not
	 * completed. The row must exist so the callback has something to write to, but
	 * list queries skip it until a token clears this. Rows past the deadline are
	 * deleted by the pending-authorization cleanup task.
	 */
	@DateTimeColumn({ nullable: true })
	pendingAuthorizationExpiresAt: Date | null;

	toJSON() {
		const { shared, ...rest } = this;
		return rest;
	}
}
