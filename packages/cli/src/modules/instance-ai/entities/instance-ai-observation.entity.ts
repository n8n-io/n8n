import { WithTimestampsAndStringId } from '@n8n/db';
import { Column, Entity, Index } from '@n8n/typeorm';

export type InstanceAiObservationMarker = 'critical' | 'important' | 'info' | 'completion';
export type InstanceAiObservationStatus = 'active' | 'superseded' | 'dropped';

@Entity({ name: 'instance_ai_observations' })
@Index(['observationScopeId', 'status', 'createdAt', 'id'])
@Index(['parentId'])
@Index(['supersededBy'])
export class InstanceAiObservation extends WithTimestampsAndStringId {
	@Column({ type: 'uuid' })
	observationScopeId: string;

	@Column({ type: 'varchar', length: 16 })
	marker: InstanceAiObservationMarker;

	@Column({ type: 'text' })
	text: string;

	@Column({ type: 'varchar', length: 36, nullable: true })
	parentId: string | null;

	@Column({ type: 'int', default: 0 })
	tokenCount: number;

	@Column({ type: 'varchar', length: 16 })
	status: InstanceAiObservationStatus;

	@Column({ type: 'varchar', length: 36, nullable: true })
	supersededBy: string | null;
}
