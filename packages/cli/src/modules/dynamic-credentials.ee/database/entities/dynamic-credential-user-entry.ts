import { CredentialsEntity, User, WithTimestamps } from '@n8n/db';
import { Column, Entity, JoinColumn, ManyToOne, PrimaryColumn } from '@n8n/typeorm';

import { DynamicCredentialResolver } from './credential-resolver';

/**
 * Stores user-specific dynamic credential data resolved by a credential resolver.
 */
@Entity({
	name: 'dynamic_credential_user_entry',
})
export class DynamicCredentialUserEntry extends WithTimestamps {
	constructor() {
		super();
	}

	@PrimaryColumn({
		name: 'credential_id',
	})
	credentialId: string;

	@PrimaryColumn({
		name: 'user_id',
	})
	userId: string;

	@PrimaryColumn({
		name: 'resolver_id',
	})
	resolverId: string;

	@Column('text')
	data: string;

	@ManyToOne(() => CredentialsEntity, { onDelete: 'CASCADE' })
	@JoinColumn({ name: 'credential_id' })
	credential: CredentialsEntity;

	@ManyToOne(() => User, { onDelete: 'CASCADE' })
	@JoinColumn({ name: 'user_id' })
	user: User;

	@ManyToOne(() => DynamicCredentialResolver, { onDelete: 'CASCADE' })
	@JoinColumn({ name: 'resolver_id' })
	resolver: DynamicCredentialResolver;
}
