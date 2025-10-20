import { Column, Entity, ManyToOne, PrimaryColumn } from '@n8n/typeorm';

import { CredentialsEntity } from './credentials-entity';

@Entity()
export class ResolverCredentialsEntity {
	@PrimaryColumn()
	key: string;

	@Column('text')
	data: string;

	@ManyToOne('CredentialsEntity', 'shared')
	credentials: CredentialsEntity;

	@PrimaryColumn()
	credentialsId: string;
}
