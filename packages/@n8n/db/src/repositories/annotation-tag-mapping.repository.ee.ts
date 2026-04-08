import { Service } from '@n8n/di';
import { DataSource, Repository } from '@n8n/typeorm';

import { AnnotationTagMapping } from '../entities';

@Service()
export class AnnotationTagMappingRepository extends Repository<AnnotationTagMapping> {
	constructor(dataSource: DataSource) {
		super(AnnotationTagMapping, dataSource.manager);
	}

	/**
	 * Overwrite annotation tags for the given execution. Annotation should already exist.
	 */
	async overwriteTags(annotationId: number, tagIds: string[]) {
		return await this.manager.transaction(async (tx) => {
			await tx.delete(AnnotationTagMapping, { annotationId });

			const tagMappings = tagIds.map((tagId) => ({
				annotationId,
				tagId,
			}));

			return await tx.insert(AnnotationTagMapping, tagMappings);
		});
	}
}
