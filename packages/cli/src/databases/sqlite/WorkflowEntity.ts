import {
	IConnections,
	IDataObject,
	INode,
	IWorkflowSettings,
} from 'n8n-workflow';

import {
	IWorkflowDb,
} from '../../';

import {
	Column,
	Entity,
	JoinTable,
	ManyToMany,
	PrimaryGeneratedColumn,
} from 'typeorm';

import {
	TagEntity,
} from './TagEntity';

@Entity()
export class WorkflowEntity implements IWorkflowDb {

	@PrimaryGeneratedColumn()
	id: number;

	@Column({
		length: 128,
	})
	name: string;

	@Column()
	active: boolean;

	@Column('simple-json')
	nodes: INode[];

	@Column('simple-json')
	connections: IConnections;

	@Column()
	createdAt: Date;

	@Column()
	updatedAt: Date;

	@Column({
		type: 'simple-json',
		nullable: true,
	})
	settings?: IWorkflowSettings;

	@Column({
		type: 'simple-json',
		nullable: true,
	})
	staticData?: IDataObject;

	@ManyToMany(() => TagEntity, tagEntity => tagEntity.workflows)
	@JoinTable({ name: "workflows_tags" })
	tags: TagEntity[];
}
