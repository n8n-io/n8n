import { WithTimestampsAndStringId } from '@n8n/db';
import { Column, Entity, Index } from '@n8n/typeorm';

export type ObservationMarker = 'critical' | 'important' | 'info' | 'completion';
export type ObservationStatus = 'active' | 'superseded' | 'dropped';

@Entity({ name: 'agents_observations' })
@Index(['agentId', 'observationScopeId', 'status', 'createdAt', 'id'])
@Index(['agentId', 'observationScopeId', 'createdAt', 'id'])
@Index(['observationScopeId'])
@Index(['parentId'])
@Index(['supersededBy'])
export class AgentObservationEntity extends WithTimestampsAndStringId {
	@Column({ type: 'varchar', length: 36 })
	agentId: string;

	@Column({ type: 'varchar', length: 255 })
	observationScopeId: string;

	@Column({ type: 'varchar', length: 16 })
	marker: ObservationMarker;

	@Column({ type: 'text' })
	text: string;

	@Column({ type: 'varchar', length: 36, nullable: true })
	parentId: string | null;

	@Column({ type: 'int', default: 0 })
	tokenCount: number;

	@Column({ type: 'varchar', length: 16 })
	status: ObservationStatus;

	@Column({ type: 'varchar', length: 36, nullable: true })
	supersededBy: string | null;
}
