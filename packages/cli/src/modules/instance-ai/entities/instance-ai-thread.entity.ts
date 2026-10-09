import { WithTimestamps, JsonColumn, Project } from '@n8n/db';
import {
	Column,
	Entity,
	Index,
	JoinColumn,
	ManyToOne,
	PrimaryColumn,
	type Relation,
} from '@n8n/typeorm';

import { SelfHealingResult } from '../self-healing/database/self-healing-result.entity';

@Entity({ name: 'instance_ai_threads' })
@Index(['resourceId', 'updatedAt', 'id'])
@Index(['selfHealingResultId', 'resourceId'], {
	unique: true,
	where: '"selfHealingResultId" IS NOT NULL',
})
export class InstanceAiThread extends WithTimestamps {
	@PrimaryColumn('uuid')
	id: string;

	@Index()
	@Column({ type: 'varchar', length: 255 })
	resourceId: string;

	@ManyToOne(() => Project, { onDelete: 'CASCADE' })
	@JoinColumn({ name: 'projectId' })
	project: Project;

	@Index()
	@Column({ type: 'varchar', length: 36 })
	projectId: string;

	@Column({ type: 'varchar', length: 36, nullable: true })
	selfHealingResultId: string | null;

	@ManyToOne(() => SelfHealingResult, { nullable: true, onDelete: 'SET NULL' })
	@JoinColumn({ name: 'selfHealingResultId' })
	selfHealingResult: Relation<SelfHealingResult> | null;

	@Column({ type: 'text', default: '' })
	title: string;

	@JsonColumn({ nullable: true })
	metadata: Record<string, unknown> | null;
}
