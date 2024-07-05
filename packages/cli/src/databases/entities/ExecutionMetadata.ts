import { Column, Entity, ManyToOne, PrimaryColumn, PrimaryGeneratedColumn } from '@n8n/typeorm';
import { ExecutionEntity } from './ExecutionEntity';

@Entity()
export class ExecutionMetadata {
	@PrimaryGeneratedColumn()
	id: number;

	@ManyToOne('ExecutionEntity', 'metadata', {
		onDelete: 'CASCADE',
	})
	execution: ExecutionEntity;

	@PrimaryColumn()
	executionId: string;

	@PrimaryColumn('text')
	key: string;

	@Column('text')
	value: string;
}
