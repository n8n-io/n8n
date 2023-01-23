import { WorkflowEntity } from "./WorkflowEntity";
import { idStringifier } from '../utils/transformers';

import {
	Entity,
	PrimaryColumn,
} from 'typeorm';

// Clone of WorkflowEntity to allow importing workflows via cli with PostgreSQL
// https://github.com/n8n-io/n8n/issues/2527

@Entity({ name: "workflow_entity" })
export class ExistingWorkflowEntity extends WorkflowEntity {
	@PrimaryColumn({ transformer: idStringifier })
	id: string;
}
