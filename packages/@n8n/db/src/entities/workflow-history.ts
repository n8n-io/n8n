import { Column, Entity, ManyToOne, OneToMany, PrimaryColumn, Relation } from '@n8n/typeorm';
import { IConnections } from 'n8n-workflow';
import type { INode, IWorkflowGroup, VersionedWorkflowSettings } from 'n8n-workflow';

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

	@JsonColumn({ default: '[]' })
	nodeGroups: IWorkflowGroup[];

	@Column()
	authors: string;

	@Column({ type: 'text', nullable: true })
	name: string | null;

	@Column({ type: 'text', nullable: true })
	description: string | null;

	@Column({ default: false })
	autosaved: boolean;

	/**
	 * The version-scoped workflow settings of this version, such as the engine.
	 * An empty object when the version has none, for example on versions saved before this column existed.
	 */
	@JsonColumn({ default: '{}' })
	settings: VersionedWorkflowSettings;

	@ManyToOne('WorkflowEntity', {
		onDelete: 'CASCADE',
	})
	workflow: WorkflowEntity;

	@OneToMany('WorkflowPublishHistory', 'workflowHistory')
	workflowPublishHistory: Relation<WorkflowPublishHistory[]>;
}
