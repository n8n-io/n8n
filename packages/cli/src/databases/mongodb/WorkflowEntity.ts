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
	ObjectID,
	ObjectIdColumn,
} from "typeorm";

@Entity()
export class WorkflowEntity implements IWorkflowDb {

	@ObjectIdColumn()
	id: ObjectID;

	@Column()
	name: string;

	@Column()
	active: boolean;

	@Column('json')
	nodes: INode[];

	@Column('json')
	connections: IConnections;

	@Column()
	createdAt: number;

	@Column()
	updatedAt: number;

	@Column('json')
	settings?: IWorkflowSettings;

	@Column('json')
	staticData?: IDataObject;
}
