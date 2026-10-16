import type {
	AutomationMapAnnotations,
	AutomationMapGraph,
	AutomationMapScope,
	AutomationMapStatus,
} from '@n8n/api-types';
import { DateTimeColumn, JsonColumn, WithTimestampsAndStringId } from '@n8n/db';
import { Column, Entity } from '@n8n/typeorm';

@Entity('automation_map')
export class AutomationMap extends WithTimestampsAndStringId {
	@Column({ type: 'varchar', length: 255 })
	name: string;

	@Column({ type: 'text' })
	prompt: string;

	@Column({ type: 'uuid', nullable: true })
	createdById: string | null;

	@Column({ type: 'boolean', default: false })
	saved: boolean;

	@Column({ type: 'boolean', default: false })
	autoUpdate: boolean;

	@Column({ type: 'varchar', length: 16 })
	status: AutomationMapStatus;

	@Column({ type: 'text', nullable: true })
	error: string | null;

	@JsonColumn()
	scope: AutomationMapScope;

	@JsonColumn({ nullable: true })
	graph: AutomationMapGraph | null;

	@JsonColumn({ nullable: true })
	annotations: AutomationMapAnnotations | null;

	@JsonColumn({ nullable: true })
	fingerprint: Record<string, string> | null;

	@DateTimeColumn({ nullable: true })
	builtAt: Date | null;
}
