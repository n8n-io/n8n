import { User } from '@n8n/db';
import {
	BaseEntity,
	Entity,
	Index,
	JoinColumn,
	ManyToOne,
	PrimaryColumn,
	type Relation,
} from '@n8n/typeorm';

import { SelfHealingConfiguration } from './self-healing-configuration.entity';

@Entity('self_healing_configuration_reviewer')
export class SelfHealingConfigurationReviewer extends BaseEntity {
	@PrimaryColumn({ type: 'int' })
	configurationId: number;

	@ManyToOne(() => SelfHealingConfiguration, { onDelete: 'CASCADE' })
	@JoinColumn({ name: 'configurationId' })
	configuration: Relation<SelfHealingConfiguration>;

	@Index()
	@PrimaryColumn({ type: 'uuid' })
	userId: string;

	@ManyToOne(() => User, { onDelete: 'CASCADE' })
	@JoinColumn({ name: 'userId' })
	user: Relation<User>;
}
