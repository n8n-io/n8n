import { Column, Entity, ManyToOne, PrimaryColumn } from 'typeorm';
import { jsonColumnType } from './AbstractEntity';
import { IConnections } from 'n8n-workflow';
import type { INode } from 'n8n-workflow';
import { WorkflowEntity } from './WorkflowEntity';

@Entity()
export class WorkflowHistory {
	@PrimaryColumn({ length: 36 })
	versionId: string;

	@Column({ length: 36 })
	workflowId: string;

	@Column(jsonColumnType)
	nodes: INode[];

	@Column(jsonColumnType)
	connections: IConnections;

	@Column({ length: 255 })
	authors: string;

	@ManyToOne('WorkflowEntity', {
		onDelete: 'CASCADE',
	})
	workflow: WorkflowEntity;
}
