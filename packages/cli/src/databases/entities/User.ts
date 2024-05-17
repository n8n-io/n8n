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
import type { SharedWorkflow } from './SharedWorkflow';
import type { SharedCredentials } from './SharedCredentials';
import { NoXss } from '../utils/customValidators';
import { objectRetriever, lowerCaser } from '../utils/transformers';
import { WithTimestamps, jsonColumnType } from './AbstractEntity';
import type { IPersonalizationSurveyAnswers } from '@/Interfaces';
import type { AuthIdentity } from './AuthIdentity';
import {
	GLOBAL_OWNER_SCOPES,
	GLOBAL_MEMBER_SCOPES,
	GLOBAL_ADMIN_SCOPES,
} from '@/permissions/global-roles';
import { hasScope, type ScopeOptions, type Scope } from '@n8n/permissions';
import type { ProjectRelation } from './ProjectRelation';

export type GlobalRole = 'global:owner' | 'global:admin' | 'global:member';
export type AssignableRole = Exclude<GlobalRole, 'global:owner'>;

const STATIC_SCOPE_MAP: Record<GlobalRole, Scope[]> = {
	'global:owner': GLOBAL_OWNER_SCOPES,
	'global:member': GLOBAL_MEMBER_SCOPES,
	'global:admin': GLOBAL_ADMIN_SCOPES,
};

@Entity()
export class User extends WithTimestamps implements IUser {
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
	@IsString({ message: 'First name must be of type string.' })
	@Length(1, 32, { message: 'First name must be $constraint1 to $constraint2 characters long.' })
	firstName: string;

	@Column({ length: 32, nullable: true })
	@NoXss()
	@IsString({ message: 'Last name must be of type string.' })
	@Length(1, 32, { message: 'Last name must be $constraint1 to $constraint2 characters long.' })
	lastName: string;

	@Column({ nullable: true })
	@IsString({ message: 'Password must be of type string.' })
	password: string;

	@Column({
		type: jsonColumnType,
		nullable: true,
		transformer: objectRetriever,
	})
	personalizationAnswers: IPersonalizationSurveyAnswers | null;

	@Column({
		type: jsonColumnType,
		nullable: true,
	})
	settings: IUserSettings | null;

	@Column()
	role: GlobalRole;

	@OneToMany('AuthIdentity', 'user')
	authIdentities: AuthIdentity[];

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

	@Column({ type: String, nullable: true })
	@Index({ unique: true })
	apiKey?: string | null;

	@Column({ type: Boolean, default: false })
	mfaEnabled: boolean;

	@Column({ type: String, nullable: true, select: false })
	mfaSecret?: string | null;

	@Column({ type: 'simple-array', default: '', select: false })
	mfaRecoveryCodes: string[];

	/**
	 * Whether the user is pending setup completion.
	 */
	isPending: boolean;

	@AfterLoad()
	@AfterUpdate()
	computeIsPending(): void {
		this.isPending = this.password === null && this.role !== 'global:owner';
	}

	/**
	 * Whether the user is instance owner
	 */
	isOwner: boolean;

	@AfterLoad()
	computeIsOwner(): void {
		this.isOwner = this.role === 'global:owner';
	}

	get globalScopes() {
		return STATIC_SCOPE_MAP[this.role] ?? [];
	}

	hasGlobalScope(scope: Scope | Scope[], scopeOptions?: ScopeOptions): boolean {
		return hasScope(
			scope,
			{
				global: this.globalScopes,
			},
			undefined,
			scopeOptions,
		);
	}

	toJSON() {
		const { password, apiKey, mfaSecret, mfaRecoveryCodes, ...rest } = this;
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
}
