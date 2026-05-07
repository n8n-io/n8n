import { JsonColumn, WithTimestampsAndStringId } from '@n8n/db';
import { Column, Entity, Index } from '@n8n/typeorm';

export type ObservationScopeKind = 'thread' | 'resource' | 'agent';

@Entity({ name: 'agents_observations' })
@Index(['scopeKind', 'scopeId', 'kind', 'createdAt'])
@Index(['scopeKind', 'scopeId', 'createdAt', 'id'])
export class AgentObservationEntity extends WithTimestampsAndStringId {
	@Column({ type: 'varchar', length: 20 })
	scopeKind: ObservationScopeKind;

	@Column({ type: 'varchar', length: 255 })
	scopeId: string;

	@Column({ type: 'varchar', length: 64 })
	kind: string;

	@JsonColumn()
	payload: unknown;

	@Column({ type: 'bigint', nullable: true })
	durationMs: number | null;

	@Column({ type: 'int' })
	schemaVersion: number;
}
