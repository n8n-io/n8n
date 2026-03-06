import { CredentialsEntity, WithTimestamps } from '@n8n/db';
import { Column, Entity, JoinColumn, ManyToOne, PrimaryColumn } from '@n8n/typeorm';

import { DynamicCredentialResolver } from './credential-resolver';

@Entity({
	name: 'dynamic_credential_entry',
})
export class DynamicCredentialEntry extends WithTimestamps {
	constructor() {
		super();
	}

	@PrimaryColumn({
		name: 'credential_id',
	})
	credentialId: string;

	@PrimaryColumn({
		name: 'subject_id',
	})
	subjectId: string;

	@PrimaryColumn({
		name: 'resolver_id',
	})
	resolverId: string;

	@Column('text')
	data: string;

	@ManyToOne(() => CredentialsEntity, { onDelete: 'CASCADE' })
	@JoinColumn({ name: 'credential_id' })
	credential: CredentialsEntity;

	@ManyToOne(() => DynamicCredentialResolver, { onDelete: 'CASCADE' })
	@JoinColumn({ name: 'resolver_id' })
	resolver: DynamicCredentialResolver;
}
