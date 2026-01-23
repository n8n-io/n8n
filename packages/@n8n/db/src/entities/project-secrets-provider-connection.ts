import { ExternalSecretsProviderSharingRole } from '@n8n/permissions';
import { Column, Entity, ManyToOne, PrimaryColumn } from '@n8n/typeorm';

import { WithTimestamps } from './abstract-entity';
import { Project } from './project';
import { SecretsProviderConnection } from './secrets-provider-connection';

@Entity()
export class ProjectSecretsProviderConnection extends WithTimestamps {
	@Column({ type: 'varchar' })
	role: ExternalSecretsProviderSharingRole;

	@ManyToOne('SecretsProviderConnection', 'shared')
	secretsProviderConnection: SecretsProviderConnection;

	@PrimaryColumn()
	secretsProviderConnectionId: string;

	@ManyToOne('Project', 'sharedSecretsProviderConnections')
	project: Project;

	@PrimaryColumn()
	projectId: string;
}
