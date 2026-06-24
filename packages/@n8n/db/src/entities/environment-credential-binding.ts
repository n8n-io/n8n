import {
	Column,
	Entity,
	JoinColumn,
	ManyToOne,
	PrimaryGeneratedColumn,
	Relation,
} from '@n8n/typeorm';

import { WithTimestamps } from './abstract-entity';
import type { CredentialsEntity } from './credentials-entity';
import type { ProjectEnvironment } from './project-environment';
import type { WorkflowEntity } from './workflow-entity';

@Entity({ name: 'environment_credential_binding' })
export class EnvironmentCredentialBinding extends WithTimestamps {
	@PrimaryGeneratedColumn()
	id: number;

	@Column({ type: 'varchar', length: 36 })
	workflowId: string;

	@Column({ type: 'varchar', length: 36 })
	environmentId: string;

	@Column({ type: 'varchar', length: 36 })
	sourceCredentialId: string;

	@Column({ type: 'varchar', length: 36 })
	targetCredentialId: string;

	@ManyToOne('WorkflowEntity', { onDelete: 'CASCADE' })
	@JoinColumn({ name: 'workflowId' })
	workflow: Relation<WorkflowEntity>;

	@ManyToOne('ProjectEnvironment', { onDelete: 'CASCADE' })
	@JoinColumn({ name: 'environmentId' })
	environment: Relation<ProjectEnvironment>;

	@ManyToOne('CredentialsEntity', { onDelete: 'CASCADE' })
	@JoinColumn({ name: 'sourceCredentialId' })
	sourceCredential: Relation<CredentialsEntity>;

	@ManyToOne('CredentialsEntity', { onDelete: 'CASCADE' })
	@JoinColumn({ name: 'targetCredentialId' })
	targetCredential: Relation<CredentialsEntity>;
}
