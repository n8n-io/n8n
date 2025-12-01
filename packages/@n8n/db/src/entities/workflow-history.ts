import { Column, Entity, ManyToOne, OneToMany, PrimaryColumn, Relation } from '@n8n/typeorm';
import { IConnections } from 'n8n-workflow';
import type { INode } from 'n8n-workflow';

import { JsonColumn, WithTimestamps } from './abstract-entity';
import { WorkflowEntity } from './workflow-entity';
import type { WorkflowPublishHistory } from './workflow-publish-history';

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

	@Column({ nullable: true })
	name: string;

	@Column({ nullable: true })
	description: string;

	@ManyToOne('WorkflowEntity', {
		onDelete: 'CASCADE',
	})
	workflow: WorkflowEntity;

	@OneToMany('WorkflowPublishHistory', 'workflowHistory')
	workflowPublishHistory: Relation<WorkflowPublishHistory[]>;
}
