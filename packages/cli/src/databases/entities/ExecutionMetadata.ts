import { Column, Entity, ManyToOne, PrimaryGeneratedColumn, Relation, RelationId } from 'typeorm';
import type { ExecutionEntity } from './ExecutionEntity';

@Entity()
export class ExecutionMetadata {
	@PrimaryGeneratedColumn()
	id: number;

	@ManyToOne('ExecutionEntity', 'metadata', {
		onDelete: 'CASCADE',
	})
	execution: Relation<ExecutionEntity>;

	@RelationId((executionMetadata: ExecutionMetadata) => executionMetadata.execution)
	executionId: number;

	@Column('text')
	key: string;

	@Column('text')
	value: string;
}
