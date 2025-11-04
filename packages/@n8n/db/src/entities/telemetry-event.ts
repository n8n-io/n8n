import { Column, Entity, Generated, Index, PrimaryColumn } from '@n8n/typeorm';
import type { IDataObject } from 'n8n-workflow';

import { JsonColumn, WithTimestamps } from './abstract-entity';
import { idStringifier } from '../utils/transformers';

@Entity()
export class TelemetryEvent extends WithTimestamps {
	@Generated()
	@PrimaryColumn({ transformer: idStringifier })
	id: string;

	@Index()
	@Column({ type: 'varchar', length: 255 })
	eventName: string;

	@JsonColumn()
	properties: IDataObject;

	@Index()
	@Column({ type: 'varchar', length: 36, nullable: true })
	userId: string | null;

	@Column({ type: 'varchar', length: 255, nullable: true })
	sessionId: string | null;

	@Column({ type: 'varchar', length: 36, nullable: true })
	workflowId: string | null;

	@Column({ type: 'varchar', length: 50 })
	source: 'frontend' | 'backend';

	@Column({ type: 'varchar', length: 255, nullable: true })
	instanceId: string | null;

	// Fields reserved for multi-tenant architecture
	@Index()
	@Column({ type: 'varchar', length: 36, nullable: true })
	workspaceId: string | null;

	@Column({ type: 'varchar', length: 36, nullable: true })
	tenantId: string | null;
}
