import { WithTimestampsAndStringId } from '@n8n/db';
import { Column, Entity, Index } from '@n8n/typeorm';

export type InstanceAiObservationScopeKind = 'thread' | 'resource';
export type InstanceAiObservationMarker = 'critical' | 'important' | 'info' | 'completion';
export type InstanceAiObservationStatus = 'active' | 'superseded' | 'dropped';

@Entity({ name: 'instance_ai_observations' })
@Index(['scopeKind', 'scopeId', 'status', 'createdAt', 'id'])
@Index(['scopeKind', 'scopeId', 'createdAt', 'id'])
@Index(['parentId'])
@Index(['supersededBy'])
export class InstanceAiObservationEntity extends WithTimestampsAndStringId {
	@Column({ type: 'varchar', length: 20 })
	scopeKind: InstanceAiObservationScopeKind;

	@Column({ type: 'varchar', length: 255 })
	scopeId: string;

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
