import {
	AfterLoad,
	AfterUpdate,
	BeforeUpdate,
	Column,
	Entity,
	Index,
	OneToMany,
	ManyToOne,
	PrimaryGeneratedColumn,
	BeforeInsert,
} from 'typeorm';
import { IsEmail, IsString, Length } from 'class-validator';
import type { IUser } from 'n8n-workflow';
import { Role } from './Role';
import { SharedWorkflow } from './SharedWorkflow';
import { SharedCredentials } from './SharedCredentials';
import { NoXss } from '../utils/customValidators';
import { objectRetriever, lowerCaser } from '../utils/transformers';
import { AbstractEntity, jsonColumnType } from './AbstractEntity';
import type { IPersonalizationSurveyAnswers, IUserSettings } from '../../Interfaces';

export const MIN_PASSWORD_LENGTH = 8;

export const MAX_PASSWORD_LENGTH = 64;

@Entity()
export class User extends AbstractEntity implements IUser {
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

	@Column({ type: String, nullable: true })
	resetPasswordToken?: string | null;

	// Expiration timestamp saved in seconds
	@Column({ type: Number, nullable: true })
	resetPasswordTokenExpiration?: number | null;

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

	@ManyToOne(() => Role, (role) => role.globalForUsers, {
		cascade: true,
		nullable: false,
	})
	globalRole: Role;

	@OneToMany(() => SharedWorkflow, (sharedWorkflow) => sharedWorkflow.user)
	sharedWorkflows: SharedWorkflow[];

	@OneToMany(() => SharedCredentials, (sharedCredentials) => sharedCredentials.user)
	sharedCredentials: SharedCredentials[];

	@BeforeInsert()
	@BeforeUpdate()
	preUpsertHook(): void {
		this.email = this.email?.toLowerCase() ?? null;
	}

	@Column({ type: String, nullable: true })
	@Index({ unique: true })
	apiKey?: string | null;

	/**
	 * Whether the user is pending setup completion.
	 */
	isPending: boolean;

	@AfterLoad()
	@AfterUpdate()
	computeIsPending(): void {
		this.isPending = this.password === null;
	}
}
