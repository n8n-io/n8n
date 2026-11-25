import { Project, WorkflowEntity } from '@n8n/db';
import {
	BaseEntity,
	Column,
	Entity,
	Index,
	JoinColumn,
	ManyToOne,
	PrimaryColumn,
	type Relation,
} from '@n8n/typeorm';

import { SelfHealingConfiguration } from './self-healing-configuration.entity';

@Entity('self_healing_configuration_workflow')
@Index(['projectId', 'workflowId'], { unique: true })
export class SelfHealingConfigurationWorkflow extends BaseEntity {
	@PrimaryColumn({ type: 'int' })
	configurationId: number;

	@ManyToOne(() => SelfHealingConfiguration, { onDelete: 'CASCADE' })
	@JoinColumn({ name: 'configurationId' })
	configuration: Relation<SelfHealingConfiguration>;

	@Index()
	@PrimaryColumn({ type: 'varchar', length: 36 })
	workflowId: string;

	@ManyToOne(() => WorkflowEntity, { onDelete: 'CASCADE' })
	@JoinColumn({ name: 'workflowId' })
	workflow: Relation<WorkflowEntity>;

	@Column({ type: 'varchar', length: 36 })
	projectId: string;

	@ManyToOne(() => Project, { onDelete: 'CASCADE' })
	@JoinColumn({ name: 'projectId' })
	project: Relation<Project>;
}
