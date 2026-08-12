import { JsonColumn, WithTimestampsAndStringId } from '@n8n/db';
import { Column, Entity, Index } from '@n8n/typeorm';
import type { IPinData } from 'n8n-workflow';

import type { NodeExpectation } from '../../workflow-tests.types';

@Entity()
@Index(['workflowId'])
export class WorkflowTest extends WithTimestampsAndStringId {
	@Column({ length: 128 })
	name: string;

	@Column({ type: 'varchar', length: 36 })
	workflowId: string;

	@Column({ type: 'varchar', length: 36 })
	sourceExecutionId: string;

	@Column({ length: 128 })
	triggerNodeName: string;

	@JsonColumn()
	fixtures: IPinData;

	@JsonColumn()
	expectations: NodeExpectation[];
}
