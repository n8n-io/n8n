import {
	Column,
	CreateDateColumn,
	Entity,
	PrimaryGeneratedColumn,
} from '@n8n/typeorm';

@Entity('scenario_execution')
export class ScenarioExecutionEntity {
	@PrimaryGeneratedColumn()
	id: number;

	@Column()
	workflowId: string;

	@Column()
	mode: 'manual' | 'trigger' | 'webhook';

	@Column({ default: 'running' })
	status: 'running' | 'success' | 'error';

	@CreateDateColumn()
	startedAt: Date;

	@Column('timestamp', { nullable: true })
	stoppedAt: Date;

	@Column('simple-json', { nullable: true })
	data: Record<string, unknown>;
}
