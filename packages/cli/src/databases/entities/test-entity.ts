import {
	Column,
	Entity,
	Generated,
	Index,
	ManyToOne,
	OneToOne,
	PrimaryColumn,
	RelationId,
} from '@n8n/typeorm';
import { Length } from 'class-validator';

import { AnnotationTagEntity } from '@/databases/entities/annotation-tag-entity.ee';
import { WorkflowEntity } from '@/databases/entities/workflow-entity';

import { WithTimestamps } from './abstract-entity';

@Entity()
@Index(['workflow'])
@Index(['evaluationWorkflow'])
export class TestEntity extends WithTimestamps {
	@Generated()
	@PrimaryColumn()
	id: number;

	@Column({ length: 255 })
	@Length(1, 255, { message: 'Test name must be $constraint1 to $constraint2 characters long.' })
	name: string;

	@RelationId((test: TestEntity) => test.workflow)
	workflowId: number;

	@ManyToOne('WorkflowEntity', 'tests')
	workflow: WorkflowEntity;

	@RelationId((test: TestEntity) => test.evaluationWorkflow)
	evaluationWorkflowId: number;

	@ManyToOne('WorkflowEntity', 'evaluationTests')
	evaluationWorkflow: WorkflowEntity;

	@OneToOne('AnnotationTagEntity', 'test')
	annotationTag: AnnotationTagEntity;
}
