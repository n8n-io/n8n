import { Column, Entity } from '@n8n/typeorm';
import { User } from './User';

@Entity({ name: 'user' })
export class AuthUser extends User {
	@Column({ type: String, nullable: true })
	mfaSecret?: string | null;

	@Column({ type: 'simple-array', default: '' })
	mfaRecoveryCodes: string[];
}
