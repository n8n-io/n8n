import { Column, Entity, JoinColumn, OneToOne, PrimaryColumn } from '@n8n/typeorm';

import { JsonColumn, WithTimestamps } from './abstract-entity';
import { Project } from './project';

@Entity()
export class ProjectPoolSettings extends WithTimestamps {
	@PrimaryColumn({ type: 'varchar', length: 36 })
	projectId: string;

	@OneToOne('Project', { onDelete: 'CASCADE' })
	@JoinColumn({ name: 'projectId' })
	project: Project;

	/** Pool for production executions (webhook/trigger/chat). `null` means inherit instance default. */
	@Column({ type: 'varchar', length: 63, nullable: true })
	productionPool: string | null;

	/** Pool for manual/retry executions. `null` means inherit instance default. */
	@Column({ type: 'varchar', length: 63, nullable: true })
	manualPool: string | null;

	/** Pool for evaluation executions. `null` means inherit instance default. */
	@Column({ type: 'varchar', length: 63, nullable: true })
	evaluationPool: string | null;

	/** Pool labels that workflow-level overrides may pick from. Empty array = no overrides allowed. */
	@JsonColumn({ default: () => "'[]'" })
	allowedPools: string[];
}
