import crypto from 'crypto';
import { Length } from 'class-validator';

import type {
	IBinaryKeyData,
	IConnections,
	IDataObject,
	INode,
	IPairedItemData,
	IWorkflowSettings,
} from 'n8n-workflow';

import {
	AfterLoad,
	AfterUpdate,
	AfterInsert,
	Column,
	Entity,
	Index,
	JoinTable,
	ManyToMany,
	OneToMany,
	PrimaryGeneratedColumn,
} from 'typeorm';

import config from '@/config';
import { TagEntity } from './TagEntity';
import { SharedWorkflow } from './SharedWorkflow';
import { objectRetriever, sqlite } from '../utils/transformers';
import { AbstractEntity, jsonColumnType } from './AbstractEntity';
import type { IWorkflowDb } from '@/Interfaces';
import { alphabetizeKeys } from '@/utils';

@Entity()
export class WorkflowEntity extends AbstractEntity implements IWorkflowDb {
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

	@Column(jsonColumnType)
	nodes: INode[];

	@Column(jsonColumnType)
	connections: IConnections;

	@Column({
		type: jsonColumnType,
		nullable: true,
	})
	settings?: IWorkflowSettings;

	@Column({
		type: jsonColumnType,
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
	tags?: TagEntity[];

	@OneToMany(() => SharedWorkflow, (sharedWorkflow) => sharedWorkflow.workflow)
	shared: SharedWorkflow[];

	@Column({
		type: config.getEnv('database.type') === 'sqlite' ? 'text' : 'json',
		nullable: true,
		transformer: sqlite.jsonColumn,
	})
	pinData: ISimplifiedPinData;

	/**
	 * Hash of editable workflow state.
	 */
	hash: string;

	@AfterLoad()
	@AfterUpdate()
	@AfterInsert()
	setHash(): void {
		const { name, active, nodes, connections, settings, staticData, pinData } = this;

		// Workflow listing page does not request the `connections` column, so we can use this for `undefined` to avoid generating hashes for all the workflows.
		if (!connections) return;

		const state = JSON.stringify({
			name,
			active,
			nodes: nodes ? nodes.map(alphabetizeKeys) : [],
			connections,
			settings,
			staticData,
			pinData,
		});

		this.hash = crypto.createHash('md5').update(state).digest('hex');
	}
}

/**
 * Simplified to prevent excessively deep type instantiation error from
 * `INodeExecutionData` in `IPinData` in a TypeORM entity field.
 */
export interface ISimplifiedPinData {
	[nodeName: string]: Array<{
		json: IDataObject;
		binary?: IBinaryKeyData;
		pairedItem?: IPairedItemData | IPairedItemData[] | number;
	}>;
}
