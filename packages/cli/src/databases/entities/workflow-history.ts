import { JsonColumn, WithTimestamps, WorkflowEntity } from '@n8n/db';
import { Column, Entity, ManyToOne, PrimaryColumn } from '@n8n/typeorm';
import { IConnections } from 'n8n-workflow';
import type { INode } from 'n8n-workflow';

@Entity()
export class WorkflowHistory extends WithTimestamps {
	@PrimaryColumn()
	versionId: string;

	@Column()
	workflowId: string;

	@JsonColumn()
	nodes: INode[];

	@JsonColumn()
	connections: IConnections;

	@Column()
	authors: string;

	@ManyToOne('WorkflowEntity', {
		onDelete: 'CASCADE',
	})
	workflow: WorkflowEntity;
}
