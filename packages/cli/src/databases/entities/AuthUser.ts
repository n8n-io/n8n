import { AfterLoad, AfterUpdate, Column, Entity, Index, OneToMany } from '@n8n/typeorm';
import { IsString } from 'class-validator';
import { AbstractUser } from './User';
import type { AuthIdentity } from './AuthIdentity';

@Entity({ name: 'user' })
export class AuthUser extends AbstractUser {
	@Column({ nullable: true })
	@IsString({ message: 'Password must be of type string.' })
	password: string;

	@Column({ type: String, nullable: true })
	@Index({ unique: true })
	apiKey?: string | null;

	@Column({ type: Boolean, default: false })
	mfaEnabled: boolean;

	@Column({ type: String, nullable: true, select: false })
	mfaSecret?: string | null;

	@Column({ type: 'simple-array', default: '', select: false })
	mfaRecoveryCodes: string[];

	@OneToMany('AuthIdentity', 'user')
	authIdentities: AuthIdentity[];

	/** Whether the user is instance owner */
	isOwner: boolean;

	@AfterLoad()
	computeIsOwner(): void {
		this.isOwner = this.role === 'global:owner';
	}

	/** Whether the user is pending setup completion */
	isPending: boolean;

	@AfterLoad()
	@AfterUpdate()
	computeIsPending(): void {
		this.isPending = this.password === null;
	}
}
