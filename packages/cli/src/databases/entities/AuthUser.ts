import { Column, Entity, PrimaryColumn } from '@n8n/typeorm';

@Entity({ name: 'user' })
export class AuthUser {
	@PrimaryColumn({ type: 'uuid', update: false })
	id: string;

	@Column({ type: String, update: false })
	email: string;

	@Column({ type: Boolean, default: false })
	mfaEnabled: boolean;

	@Column({ type: String, nullable: true })
	mfaSecret?: string | null;

	@Column({ type: 'simple-array', default: '' })
	mfaRecoveryCodes: string[];
}
