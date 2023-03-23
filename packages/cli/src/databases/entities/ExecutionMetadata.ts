import { Column, Entity, ManyToOne, PrimaryGeneratedColumn, RelationId } from 'typeorm';
import { ExecutionEntity } from './ExecutionEntity';

@Entity()
export class ExecutionMetadata {
	@PrimaryGeneratedColumn()
	id: number;

	@ManyToOne('ExecutionEntity', 'metadata', {
		onDelete: 'CASCADE',
	})
	execution: ExecutionEntity;

	@RelationId((executionMetadata: ExecutionMetadata) => executionMetadata.execution)
	executionId: number;

	@Column('text')
	key: string;

	@Column('text')
	value: string;
}
