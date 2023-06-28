import { IConnections, IDataObject, IWorkflowSettings } from 'n8n-workflow';
import type { IBinaryKeyData, INode, IPairedItemData } from 'n8n-workflow';

import { Column, Entity, PrimaryColumn } from 'typeorm';
import { AbstractEntity, jsonColumnType } from './AbstractEntity';
import { idStringifier, objectRetriever, sqlite } from '../utils/transformers';
import config from "@/config";
import {ISimplifiedPinData} from "@db/entities/WorkflowEntity";

@Entity({ name: 'workflow_entity_with_version' })
export class WorkflowEntityWithVersion extends AbstractEntity {
	@PrimaryColumn()
	versionId: string;

	@Column()
	id: string;

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
		type: config.getEnv('database.type') === 'sqlite' ? 'text' : 'json',
		nullable: true,
		transformer: sqlite.jsonColumn,
	})
	pinData: ISimplifiedPinData;



	@Column({ default: 0 })
	triggerCount: number;
}
