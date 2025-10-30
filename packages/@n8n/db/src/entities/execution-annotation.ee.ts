import {
	Column,
	Entity,
	Index,
	JoinColumn,
	JoinTable,
	ManyToMany,
	OneToMany,
	OneToOne,
	PrimaryGeneratedColumn,
	RelationId,
} from '@n8n/typeorm';
import type { AnnotationVote } from 'n8n-workflow';

import type { AnnotationTagEntity } from './annotation-tag-entity.ee';
import type { AnnotationTagMapping } from './annotation-tag-mapping.ee';
import { ExecutionEntity } from './execution-entity';

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

	@Index({ unique: true })
	@OneToOne('ExecutionEntity', 'annotation', {
		onDelete: 'CASCADE',
	})
	@JoinColumn({ name: 'executionId' })
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
