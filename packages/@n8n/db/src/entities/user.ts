import { ChildEntity, Column, Index, OneToMany } from '@n8n/typeorm';
import type { IUser, IUserSettings } from 'n8n-workflow';

import { JsonColumn } from './abstract-entity';
import { Actor } from './actor';
import type { ApiKey } from './api-key';
import type { AuthIdentity } from './auth-identity';
import type { ProjectRelation } from './project-relation';
import type { SharedCredentials } from './shared-credentials';
import type { SharedWorkflow } from './shared-workflow';
import type { IPersonalizationSurveyAnswers } from './types-db';
import { GLOBAL_OWNER_ROLE } from '../constants';
import { isValidEmail } from '../utils/is-valid-email';
import { lowerCaser, objectRetriever } from '../utils/transformers';

/** A human account. Lives in the `user` table with `kind = 'human'`. Shared columns are on `Actor`. */
@ChildEntity('human')
export class User extends Actor implements IUser {
	declare readonly kind: 'human';

	@Column({
		length: 254,
		nullable: true,
		transformer: lowerCaser,
	})
	@Index({ unique: true })
	email: string;

	@Column({ length: 32, nullable: true })
	firstName: string;

	@Column({ length: 32, nullable: true })
	lastName: string;

	@Column({ type: String, nullable: true })
	password: string | null;

	@JsonColumn({
		nullable: true,
		transformer: objectRetriever,
	})
	personalizationAnswers: IPersonalizationSurveyAnswers | null;

	@JsonColumn({ nullable: true })
	settings: IUserSettings | null;

	@OneToMany('AuthIdentity', 'user')
	authIdentities: AuthIdentity[];

	@OneToMany('ApiKey', 'user')
	apiKeys: ApiKey[];

	@OneToMany('SharedWorkflow', 'user')
	sharedWorkflows: SharedWorkflow[];

	@OneToMany('SharedCredentials', 'user')
	sharedCredentials: SharedCredentials[];

	@OneToMany('ProjectRelation', 'user')
	projectRelations: ProjectRelation[];

	override preUpsertHook(): void {
		this.email = this.email?.toLowerCase() ?? null;

		// Validate email if present (including empty strings)
		if (this.email !== null && this.email !== undefined) {
			const result = isValidEmail(this.email);
			if (!result) {
				throw new Error(`Cannot save user <${this.email}>: Provided email is invalid`);
			}
		}
	}

	@Column({ type: String, nullable: true })
	mfaSecret?: string | null;

	@Column({ type: 'date', nullable: true })
	lastActiveAt?: Date | null;

	/**
	 * Whether the user is pending setup completion.
	 */
	isPending: boolean;

	override postLoadHook(): void {
		this.computeIsPending();
	}

	computeIsPending(): void {
		const hasExternalAuthIdentity =
			this.authIdentities?.some((identity) => identity.providerType !== 'email') ?? false;
		this.isPending =
			this.password === null &&
			!hasExternalAuthIdentity &&
			this.role?.slug !== GLOBAL_OWNER_ROLE.slug;
	}

	override toJSON() {
		const { password, mfaSecret, mfaRecoveryCodes, ...rest } = this;
		return rest;
	}

	createPersonalProjectName() {
		if (this.firstName && this.lastName && this.email) {
			return `${this.firstName} ${this.lastName} <${this.email}>`;
		} else if (this.email) {
			return `<${this.email}>`;
		} else {
			return 'Unnamed Project';
		}
	}

	toIUser(): IUser {
		const { id, email, firstName, lastName } = this;
		return { id, email, firstName, lastName };
	}
}
