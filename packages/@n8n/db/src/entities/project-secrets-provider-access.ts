import { Entity, JoinColumn, ManyToOne, PrimaryColumn } from '@n8n/typeorm';

import { WithTimestamps } from './abstract-entity';
import { Project } from './project';
import { SecretsProviderConnection } from './secrets-provider-connection';

@Entity()
export class ProjectSecretsProviderAccess extends WithTimestamps {
	@ManyToOne('SecretsProviderConnection', 'projectAccess')
	@JoinColumn({ name: 'providerKey', referencedColumnName: 'providerKey' })
	secretsProviderConnection: SecretsProviderConnection;

	@PrimaryColumn()
	providerKey: string;

	@ManyToOne('Project', 'secretsProviderAccess')
	project: Project;

	@PrimaryColumn()
	projectId: string;
}
