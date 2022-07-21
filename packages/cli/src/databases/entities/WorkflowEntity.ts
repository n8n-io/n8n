/* eslint-disable @typescript-eslint/explicit-module-boundary-types */
/* eslint-disable import/no-cycle */
import { Length } from 'class-validator';

import { IConnections, IDataObject, INode, IWorkflowSettings, PinData } from 'n8n-workflow';

import {
	BeforeUpdate,
	Column,
	ColumnOptions,
	CreateDateColumn,
	Entity,
	Index,
	JoinTable,
	ManyToMany,
	OneToMany,
	PrimaryGeneratedColumn,
	UpdateDateColumn,
} from 'typeorm';

import * as config from '../../../config';
import { DatabaseType, IWorkflowDb } from '../..';
import { TagEntity } from './TagEntity';
import { SharedWorkflow } from './SharedWorkflow';
import { objectRetriever, serializer } from '../utils/transformers';

function resolveDataType(dataType: string) {
	const dbType = config.getEnv('database.type');

	const typeMap: { [key in DatabaseType]: { [key: string]: string } } = {
		sqlite: {
			json: 'simple-json',
		},
		postgresdb: {
			datetime: 'timestamptz',
		},
		mysqldb: {},
		mariadb: {},
	};

	return typeMap[dbType][dataType] ?? dataType;
}

// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
function getTimestampSyntax() {
	const dbType = config.getEnv('database.type');

	const map: { [key in DatabaseType]: string } = {
		sqlite: "STRFTIME('%Y-%m-%d %H:%M:%f', 'NOW')",
		postgresdb: 'CURRENT_TIMESTAMP(3)',
		mysqldb: 'CURRENT_TIMESTAMP(3)',
		mariadb: 'CURRENT_TIMESTAMP(3)',
	};

	return map[dbType];
}

@Entity()
export class WorkflowEntity implements IWorkflowDb {
	@PrimaryGeneratedColumn()
	id: number;

	// TODO: Add XSS check
	@Index({ unique: true })
	@Length(1, 128, {
		message: 'Workflow name must be $constraint1 to $constraint2 characters long.',
	})
	@Column({ length: 128 })
	name: string;

	@Column()
	active: boolean;

	@Column(resolveDataType('json'))
	nodes: INode[];

	@Column(resolveDataType('json'))
	connections: IConnections;

	@CreateDateColumn({ precision: 3, default: () => getTimestampSyntax() })
	createdAt: Date;

	@UpdateDateColumn({
		precision: 3,
		default: () => getTimestampSyntax(),
		onUpdate: getTimestampSyntax(),
	})
	updatedAt: Date;

	@Column({
		type: resolveDataType('json') as ColumnOptions['type'],
		nullable: true,
	})
	settings?: IWorkflowSettings;

	@Column({
		type: resolveDataType('json') as ColumnOptions['type'],
		nullable: true,
		transformer: objectRetriever,
	})
	staticData?: IDataObject;

	@ManyToMany(() => TagEntity, (tag) => tag.workflows)
	@JoinTable({
		name: 'workflows_tags', // table name for the junction table of this relation
		joinColumn: {
			name: 'workflowId',
			referencedColumnName: 'id',
		},
		inverseJoinColumn: {
			name: 'tagId',
			referencedColumnName: 'id',
		},
	})
	tags: TagEntity[];

	@OneToMany(() => SharedWorkflow, (sharedWorkflow) => sharedWorkflow.workflow)
	shared: SharedWorkflow[];

	@Column({
		type: config.getEnv('database.type') === 'sqlite' ? 'text' : 'json',
		nullable: true,
		transformer: serializer,
	})
	pinData: PinData;

	@BeforeUpdate()
	setUpdateDate() {
		this.updatedAt = new Date();
	}
}
