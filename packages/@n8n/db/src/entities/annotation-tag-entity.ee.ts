import { Column, Entity, Index, ManyToMany, OneToMany } from '@n8n/typeorm';
import { IsString, Length } from 'class-validator';

import { WithTimestampsAndStringId } from './abstract-entity';
import type { AnnotationTagMapping } from './annotation-tag-mapping.ee';
import type { ExecutionAnnotation } from './execution-annotation.ee';

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
	annotationMappings: AnnotationTagMapping[];
}
