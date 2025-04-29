import { WithTimestamps } from '@n8n/db';
import { CredentialSharingRole } from '@n8n/permissions';
import { Column, Entity, ManyToOne, PrimaryColumn } from '@n8n/typeorm';

import { CredentialsEntity } from './credentials-entity';
import { Project } from './project';

@Entity()
export class SharedCredentials extends WithTimestamps {
	@Column({ type: String })
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
