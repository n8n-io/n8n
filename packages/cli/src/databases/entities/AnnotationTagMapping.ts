import { Entity, JoinColumn, ManyToOne, PrimaryColumn } from '@n8n/typeorm';
import { ExecutionAnnotation } from '@db/entities/ExecutionAnnotation';
import { AnnotationTagEntity } from '@db/entities/AnnotationTagEntity';

@Entity({ name: 'execution_annotation_tags' })
export class AnnotationTagMapping {
	@PrimaryColumn()
	annotationId: string;

	@ManyToOne('ExecutionAnnotation', 'tagMappings')
	@JoinColumn({ name: 'annotationId' })
	annotations: ExecutionAnnotation[];

	@PrimaryColumn()
	tagId: string;

	@ManyToOne('AnnotationTagEntity', 'annotationMappings')
	@JoinColumn({ name: 'tagId' })
	tags: AnnotationTagEntity[];
}
