import { CredentialsEntity, Actor, WithTimestamps } from '@n8n/db';
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
		name: 'credentialId',
	})
	credentialId: string;

	@PrimaryColumn({
		name: 'userId',
	})
	userId: string;

	@PrimaryColumn({
		name: 'resolverId',
	})
	resolverId: string;

	@Column('text')
	data: string;

	@ManyToOne(() => CredentialsEntity, { onDelete: 'CASCADE' })
	@JoinColumn({ name: 'credentialId' })
	credential: CredentialsEntity;

	@ManyToOne(() => Actor, { onDelete: 'CASCADE' })
	@JoinColumn({ name: 'userId' })
	user: Actor;

	@ManyToOne(() => DynamicCredentialResolver, { onDelete: 'CASCADE' })
	@JoinColumn({ name: 'resolverId' })
	resolver: DynamicCredentialResolver;
}
