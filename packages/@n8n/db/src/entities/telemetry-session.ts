import { Column, Entity, Generated, Index, PrimaryColumn } from '@n8n/typeorm';
import type { IDataObject } from 'n8n-workflow';

import { JsonColumn, WithTimestamps } from './abstract-entity';
import { idStringifier } from '../utils/transformers';

@Entity()
export class TelemetrySession extends WithTimestamps {
	@Generated()
	@PrimaryColumn({ transformer: idStringifier })
	id: string;

	@Index()
	@Column({ type: 'varchar', length: 36, nullable: true })
	userId: string | null;

	@Column('datetime', { nullable: true })
	endedAt: Date | null;

	@JsonColumn()
	metadata: IDataObject;

	@Column({ type: 'varchar', length: 36, nullable: true })
	workspaceId: string | null;
}
