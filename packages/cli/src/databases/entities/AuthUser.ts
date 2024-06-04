import { Column, Entity, OneToMany } from '@n8n/typeorm';
import type { AuthIdentity } from './AuthIdentity';
import { User } from './User';

@Entity({ name: 'user' })
export class AuthUser extends User {
	@OneToMany('AuthIdentity', 'user')
	authIdentities: AuthIdentity[];

	@Column({ type: String, nullable: true })
	mfaSecret?: string | null;

	@Column({ type: 'simple-array', default: '' })
	mfaRecoveryCodes: string[];
}
