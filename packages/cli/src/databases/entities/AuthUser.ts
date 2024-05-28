import { Column, Entity, Index, OneToMany } from '@n8n/typeorm';
import type { AuthIdentity } from './AuthIdentity';
import { User } from './User';

@Entity({ name: 'user' })
export class AuthUser extends User {
	@Column({ type: String, nullable: true })
	@Index({ unique: true })
	apiKey?: string | null;

	@OneToMany('AuthIdentity', 'user')
	authIdentities: AuthIdentity[];
}
