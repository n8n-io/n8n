import { Column, Entity, ManyToOne, PrimaryColumn } from '@n8n/typeorm';
import { WithTimestamps, jsonColumnType } from './abstract-entity';
import { IConnections } from 'n8n-workflow';
import type { INode } from 'n8n-workflow';
import { WorkflowEntity } from './workflow-entity';

@Entity()
export class WorkflowHistory extends WithTimestamps {
	@PrimaryColumn()
	versionId: string;

	@Column()
	workflowId: string;

	@Column(jsonColumnType)
	nodes: INode[];

	@Column(jsonColumnType)
	connections: IConnections;

	@Column()
	authors: string;

	@ManyToOne('WorkflowEntity', {
		onDelete: 'CASCADE',
	})
	workflow: WorkflowEntity;
}
