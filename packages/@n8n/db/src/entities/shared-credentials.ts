import { CredentialSharingRole } from '@n8n/permissions';
import { Column, Entity, ManyToOne, PrimaryColumn } from '@n8n/typeorm';

import { WithTimestamps } from './abstract-entity';
import { CredentialsEntity } from './credentials-entity';
import { Project } from './project';

@Entity()
export class SharedCredentials extends WithTimestamps {
	@Column({ type: 'varchar' })
	role: CredentialSharingRole;

	@ManyToOne('CredentialsEntity', 'shared')
	credentials: CredentialsEntity;

	@PrimaryColumn()
	credentialsId: string;

	@ManyToOne('Project', 'sharedCredentials')
	project: Project;

	@PrimaryColumn()
	projectId: string;
}
