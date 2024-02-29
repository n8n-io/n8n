import {
	AfterLoad,
	BeforeUpdate,
	Column,
	Entity,
	Index,
	PrimaryGeneratedColumn,
	BeforeInsert,
} from '@n8n/typeorm';
import { IsEmail, IsString, Length } from 'class-validator';
import type { IUser, IUserSettings } from 'n8n-workflow';
import { hasScope, type ScopeOptions, type Scope } from '@n8n/permissions';

import { NoXss } from '../utils/customValidators';
import { objectRetriever, lowerCaser } from '../utils/transformers';
import { WithTimestamps, jsonColumnType } from './AbstractEntity';
import type { IPersonalizationSurveyAnswers } from '@/Interfaces';
import { ownerPermissions, memberPermissions, adminPermissions } from '@/permissions/roles';

export type GlobalRole = 'global:owner' | 'global:admin' | 'global:member';
export type AssignableRole = Exclude<GlobalRole, 'global:owner'>;

const STATIC_SCOPE_MAP: Record<GlobalRole, Scope[]> = {
	'global:owner': ownerPermissions,
	'global:member': memberPermissions,
	'global:admin': adminPermissions,
};

export abstract class AbstractUser extends WithTimestamps {
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

	@Column({ type: Boolean, default: false })
	disabled: boolean;

	@BeforeInsert()
	@BeforeUpdate()
	preUpsertHook(): void {
		this.email = this.email?.toLowerCase() ?? null;
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
			scopeOptions,
		);
	}
}

@Entity()
export class User extends AbstractUser implements IUser {}
