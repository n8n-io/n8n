import { ChildEntity, Column, Index, OneToMany } from '@n8n/typeorm';
import type { IUser } from 'n8n-workflow';

import { JsonColumn } from './abstract-entity';
import type { ApiKey } from './api-key';
import type { AuthIdentity } from './auth-identity';
import type { IPersonalizationSurveyAnswers } from './types-db';
import { User } from './user';
import { GLOBAL_OWNER_ROLE } from '../constants';
import { isValidEmail } from '../utils/is-valid-email';
import { lowerCaser, objectRetriever } from '../utils/transformers';

/**
 * The account of a person. Lives in the `user` table with `kind = 'person'`.
 *
 * The columns below exist in the table for every row, but only a person sets
 * them. Declaring them here makes the compiler reject a read on a `User`.
 */
@ChildEntity('person')
export class Person extends User implements IUser {
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

	@Column({ type: String, nullable: true })
	mfaSecret?: string | null;

	@Column({ type: 'date', nullable: true })
	lastActiveAt?: Date | null;

	@OneToMany('AuthIdentity', 'user')
	authIdentities: AuthIdentity[];

	@OneToMany('ApiKey', 'user')
	apiKeys: ApiKey[];

	/** Whether the person has not completed the setup of the account yet. */
	isPending: boolean;

	// No decorators: the listeners are declared on `User` (see there).
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

	override computeIsPending(): void {
		const hasExternalAuthIdentity =
			this.authIdentities?.some((identity) => identity.providerType !== 'email') ?? false;
		this.isPending =
			this.password === null &&
			!hasExternalAuthIdentity &&
			this.role?.slug !== GLOBAL_OWNER_ROLE.slug;
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

	override toIUser(): IUser {
		const { id, email, firstName, lastName } = this;
		return { id, email, firstName, lastName };
	}
}
