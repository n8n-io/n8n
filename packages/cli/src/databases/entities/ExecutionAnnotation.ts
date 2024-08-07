import { Column, Entity, Generated, ManyToOne, PrimaryColumn, RelationId } from '@n8n/typeorm';
import { idStringifier } from '../utils/transformers';
import { ExecutionEntity } from './ExecutionEntity';

type AnnotationVote = 'up' | 'down';

@Entity()
export class ExecutionAnnotation {
	@Generated()
	@PrimaryColumn({ transformer: idStringifier })
	id: string;

	@Column({ type: 'varchar', nullable: true })
	vote: AnnotationVote;

	@Column({ type: 'varchar', nullable: true })
	note: string;

	@RelationId((annotation: ExecutionAnnotation) => annotation.execution)
	executionId: string;

	@ManyToOne('ExecutionEntity', 'data', {
		onDelete: 'CASCADE',
	})
	execution: ExecutionEntity;
}
