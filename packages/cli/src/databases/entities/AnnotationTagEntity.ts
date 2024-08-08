import { Column, Entity, Index, ManyToMany, OneToMany } from '@n8n/typeorm';
import { IsString, Length } from 'class-validator';
import type { WorkflowTagMapping } from './WorkflowTagMapping';
import { WithTimestampsAndStringId } from './AbstractEntity';
import type { ExecutionAnnotation } from '@db/entities/ExecutionAnnotation';

@Entity()
export class AnnotationTagEntity extends WithTimestampsAndStringId {
	@Column({ length: 24 })
	@Index({ unique: true })
	@IsString({ message: 'Tag name must be of type string.' })
	@Length(1, 24, { message: 'Tag name must be $constraint1 to $constraint2 characters long.' })
	name: string;

	@ManyToMany('ExecutionAnnotation', 'tags')
	annotations: ExecutionAnnotation[];

	@OneToMany('AnnotationTagMapping', 'tags')
	annotationMappings: WorkflowTagMapping[];
}
