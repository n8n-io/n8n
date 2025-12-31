import type { AuthPrincipal, GlobalRole } from '@n8n/permissions';
import {
	AfterLoad,
	AfterUpdate,
	BeforeUpdate,
	Column,
	Entity,
	Index,
	OneToMany,
	PrimaryGeneratedColumn,
	BeforeInsert,
} from '@n8n/typeorm';
import { IsEmail, IsString, Length } from 'class-validator';
import type { IUser, IUserSettings } from 'n8n-workflow';

import { JsonColumn, WithTimestamps } from './abstract-entity';
import type { ApiKey } from './api-key';
import type { AuthIdentity } from './auth-identity';
import type { ProjectRelation } from './project-relation';
import type { SharedCredentials } from './shared-credentials';
import type { SharedWorkflow } from './shared-workflow';
import type { IPersonalizationSurveyAnswers } from './types-db';
import { lowerCaser, objectRetriever } from '../utils/transformers';
import { NoUrl } from '../utils/validators/no-url.validator';
import { NoXss } from '../utils/validators/no-xss.validator';

@Entity()
export class User extends WithTimestamps implements IUser, AuthPrincipal {
	@PrimaryGeneratedColumn('uuid')
	id: string;

	@Column({
		length: 254,
		nullable: true,
		transformer: lowerCaser,
	})
	@Index({ unique: true })
	@IsEmail()
	email: string;

	@Column({ length: 32, nullable: true })
	@NoXss()
	@NoUrl()
	@IsString({ message: 'First name must be of type string.' })
	@Length(1, 32, { message: 'First name must be $constraint1 to $constraint2 characters long.' })
	firstName: string;

	@Column({ length: 32, nullable: true })
	@NoXss()
	@NoUrl()
	@IsString({ message: 'Last name must be of type string.' })
	@Length(1, 32, { message: 'Last name must be $constraint1 to $constraint2 characters long.' })
	lastName: string;

	@Column({ type: String, nullable: true })
	@IsString({ message: 'Password must be of type string.' })
	password: string | null;

	@JsonColumn({
		nullable: true,
		transformer: objectRetriever,
	})
	personalizationAnswers: IPersonalizationSurveyAnswers | null;

	@JsonColumn({ nullable: true })
	settings: IUserSettings | null;

	@Column({ type: String })
	role: GlobalRole;

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

	@Column({ type: Boolean, default: false })
	disabled: boolean;

	@BeforeInsert()
	@BeforeUpdate()
	preUpsertHook(): void {
		this.email = this.email?.toLowerCase() ?? null;
	}

	@Column({ type: Boolean, default: false })
	mfaEnabled: boolean;

	@Column({ type: String, nullable: true })
	mfaSecret?: string | null;

	@Column({ type: 'simple-array', default: '' })
	mfaRecoveryCodes: string[];

	@Column({ type: 'date', nullable: true })
	lastActiveAt?: Date | null;

	/**
	 * Whether the user is pending setup completion.
	 */
	isPending: boolean;

	@AfterLoad()
	@AfterUpdate()
	computeIsPending(): void {
		this.isPending = this.password === null && this.role !== 'global:owner';
	}

	toJSON() {
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
