import { Column, Entity, ManyToOne, PrimaryColumn } from '@n8n/typeorm';
import { CredentialsEntity } from './CredentialsEntity';
import { WithTimestamps } from './AbstractEntity';
import { Project } from './Project';

export type CredentialSharingRole = 'credential:owner' | 'credential:user';

@Entity()
export class SharedCredentials extends WithTimestamps {
	@Column()
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
