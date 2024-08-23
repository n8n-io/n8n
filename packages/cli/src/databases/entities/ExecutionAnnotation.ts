import {
	Column,
	Entity,
	JoinTable,
	ManyToMany,
	ManyToOne,
	OneToMany,
	PrimaryGeneratedColumn,
	RelationId,
} from '@n8n/typeorm';
import { ExecutionEntity } from './ExecutionEntity';
import type { AnnotationTagEntity } from './AnnotationTagEntity';
import type { AnnotationTagMapping } from './AnnotationTagMapping';
import type { AnnotationVote } from 'n8n-workflow';

@Entity({ name: 'execution_annotations' })
export class ExecutionAnnotation {
	@PrimaryGeneratedColumn()
	id: number;

	/**
	 * This field stores the up- or down-vote of the execution by user.
	 */
	@Column({ type: 'varchar', nullable: true })
	vote: AnnotationVote | null;

	/**
	 * Custom text note added to the execution by user.
	 */
	@Column({ type: 'varchar', nullable: true })
	note: string | null;

	@RelationId((annotation: ExecutionAnnotation) => annotation.execution)
	executionId: string;

	@ManyToOne('ExecutionEntity', 'annotation', {
		onDelete: 'CASCADE',
	})
	execution: ExecutionEntity;

	@ManyToMany('AnnotationTagEntity', 'annotations')
	@JoinTable({
		name: 'execution_annotation_tags', // table name for the junction table of this relation
		joinColumn: {
			name: 'annotationId',
			referencedColumnName: 'id',
		},
		inverseJoinColumn: {
			name: 'tagId',
			referencedColumnName: 'id',
		},
	})
	tags?: AnnotationTagEntity[];

	@OneToMany('AnnotationTagMapping', 'annotations')
	tagMappings: AnnotationTagMapping[];
}
