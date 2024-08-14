import { Service } from 'typedi';
import { DataSource, Repository } from '@n8n/typeorm';
import { AnnotationTagMapping } from '@db/entities/AnnotationTagMapping';
import { ExecutionAnnotation } from '@db/entities/ExecutionAnnotation';
import { ApplicationError } from 'n8n-workflow';

@Service()
export class AnnotationTagMappingRepository extends Repository<AnnotationTagMapping> {
	constructor(dataSource: DataSource) {
		super(AnnotationTagMapping, dataSource.manager);
	}

	async overwriteTags(executionId: string, tagIds: string[]) {
		return await this.manager.transaction(async (tx) => {
			const annotation = await tx.findOne(ExecutionAnnotation, {
				where: { execution: { id: executionId } },
			});

			if (!annotation) {
				throw new ApplicationError(`Annotation for execution ${executionId} not found`);
			}

			await tx.delete(AnnotationTagMapping, { annotationId: annotation.id });

			const tagMappings = tagIds.map((tagId) => {
				this.create({ annotationId: annotation.id, tagId });

				// FIXME: for some reason tx.insert below throws type error if we use this.create result directly,
				//  so we have to create plain objects
				return {
					annotationId: annotation.id,
					tagId,
				};
			});

			return await tx.insert(AnnotationTagMapping, tagMappings);
		});
	}
}
