import type {
	AutomationMapAnnotations,
	AutomationMapGraph,
	AutomationMapScope,
} from '@n8n/api-types';
import { DateTimeColumn, JsonColumn, Project, User, WithTimestampsAndStringId } from '@n8n/db';
import { Column, Entity, Index, JoinColumn, ManyToOne } from '@n8n/typeorm';

export type AutomationMapFingerprint = Record<string, string>;

@Entity({ name: 'automation_map' })
@Index(['projectId'])
export class AutomationMap extends WithTimestampsAndStringId {
	@Column({ type: 'varchar', length: 128 })
	name: string;

	@ManyToOne(() => Project, { onDelete: 'CASCADE' })
	@JoinColumn({ name: 'projectId' })
	project?: Project;

	@Column({ type: 'varchar', length: 36 })
	projectId: string;

	@JsonColumn()
	scope: AutomationMapScope;

	@JsonColumn()
	graph: AutomationMapGraph;

	@JsonColumn()
	annotations: AutomationMapAnnotations;

	@JsonColumn()
	fingerprint: AutomationMapFingerprint;

	@ManyToOne(() => User, { onDelete: 'SET NULL', nullable: true })
	@JoinColumn({ name: 'createdById' })
	createdBy?: User | null;

	@Column({ type: 'uuid', nullable: true })
	createdById: string | null;

	@DateTimeColumn()
	refreshedAt: Date;

	@DateTimeColumn({ nullable: true })
	annotatedAt: Date | null;
}
