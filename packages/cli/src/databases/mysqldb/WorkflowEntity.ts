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
	PrimaryGeneratedColumn,
} from 'typeorm';

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

	@Column('json')
	nodes: INode[];

	@Column('json')
	connections: IConnections;

	@Column('datetime')
	createdAt: Date;

	@Column('datetime')
	updatedAt: Date;

	@Column({
		type: 'json',
		nullable: true,
	})
	settings?: IWorkflowSettings;

	@Column({
		type: 'json',
		nullable: true,
	})
	staticData?: IDataObject;
}
