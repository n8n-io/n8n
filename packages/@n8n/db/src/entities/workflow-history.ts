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

	@Column({ type: 'text', nullable: true })
	name: string | null;

	@Column({ type: 'text', nullable: true })
	description: string | null;

	@Column({ default: false })
	autosaved: boolean;

	@ManyToOne('WorkflowEntity', {
		onDelete: 'CASCADE',
	})
	workflow: WorkflowEntity;

	@OneToMany('WorkflowPublishHistory', 'workflowHistory')
	workflowPublishHistory: Relation<WorkflowPublishHistory[]>;
}
