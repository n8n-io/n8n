import { Entity, ManyToOne, PrimaryColumn } from '@n8n/typeorm';

import { WithTimestamps } from './abstract-entity';
import { Project } from './project';
import { SecretsProviderConnection } from './secrets-provider-connection';

@Entity()
export class ProjectSecretsProviderAccess extends WithTimestamps {
	@ManyToOne('SecretsProviderConnection', 'projectAccess')
	secretsProviderConnection: SecretsProviderConnection;

	@PrimaryColumn()
	secretsProviderConnectionId: number;

	@ManyToOne('Project', 'secretsProviderAccess', { eager: true })
	project: Project;

	@PrimaryColumn()
	projectId: string;
}
