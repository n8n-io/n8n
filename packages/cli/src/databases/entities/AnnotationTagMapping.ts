import { Entity, JoinColumn, ManyToOne, PrimaryColumn } from '@n8n/typeorm';
import { ExecutionAnnotation } from '@db/entities/ExecutionAnnotation';
import { AnnotationTagEntity } from '@db/entities/AnnotationTagEntity';

@Entity({ name: 'executions_annotations_tags' })
export class WorkflowTagMapping {
	@PrimaryColumn()
	annotationId: string;

	@ManyToOne('AnnotationEntity', 'tagMappings')
	@JoinColumn({ name: 'annotationId' })
	annotations: ExecutionAnnotation[];

	@PrimaryColumn()
	tagId: string;

	@ManyToOne('AnnotationTagEntity', 'annotationMappings')
	@JoinColumn({ name: 'tagId' })
	tags: AnnotationTagEntity[];
}
