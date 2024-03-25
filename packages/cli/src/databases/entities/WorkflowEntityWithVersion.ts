import { IConnections } from 'n8n-workflow';
import type { IDataObject, INode, IWorkflowSettings } from 'n8n-workflow';

import { Column, Entity, PrimaryColumn } from '@n8n/typeorm';
import { IsDate } from 'class-validator';

import { WithTimestampsAndStringId, jsonColumnType } from './AbstractEntity';

@Entity()
export class WorkflowEntityWithVersion extends WithTimestampsAndStringId {
	@Column()
	id: string;

	@Column({ length: 128 })
	name: string;

	@Column()
	active: boolean;

	@Column(jsonColumnType)
	nodes: INode[];

	@Column(jsonColumnType)
	connections: IConnections;

	@Column({
		type: jsonColumnType,
		nullable: true,
	})
	settings?: IWorkflowSettings;

	@Column({
		type: jsonColumnType,
		nullable: true,
	})
	staticData?: IDataObject;

	@PrimaryColumn({})
	versionId: string;
}
