import { Project } from '@n8n/db';
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

import { SelfHealingConfiguration } from '../../database/self-healing-configuration.entity';

@Entity('self_healing_configuration_agent')
@Index(['projectId', 'agentId'], { unique: true })
export class SelfHealingConfigurationAgent extends BaseEntity {
	@PrimaryColumn({ type: 'int' })
	configurationId: number;

	@ManyToOne(() => SelfHealingConfiguration, { onDelete: 'CASCADE' })
	@JoinColumn({ name: 'configurationId' })
	configuration: Relation<SelfHealingConfiguration>;

	// The foreign key to `agents` is in the migration only. Instance AI must not import the agent entity.
	@Index()
	@PrimaryColumn({ type: 'varchar', length: 36 })
	agentId: string;

	@Column({ type: 'varchar', length: 36 })
	projectId: string;

	@ManyToOne(() => Project, { onDelete: 'CASCADE' })
	@JoinColumn({ name: 'projectId' })
	project: Relation<Project>;
}
