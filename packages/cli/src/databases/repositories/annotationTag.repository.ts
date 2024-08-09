import { Service } from 'typedi';
import type { EntityManager } from '@n8n/typeorm';
import { DataSource, In, Repository } from '@n8n/typeorm';
import intersection from 'lodash/intersection';
import { AnnotationTagEntity } from '@db/entities/AnnotationTagEntity';
import type { ExecutionAnnotation } from '@db/entities/ExecutionAnnotation';

@Service()
export class AnnotationTagRepository extends Repository<AnnotationTagEntity> {
	constructor(dataSource: DataSource) {
		super(AnnotationTagEntity, dataSource.manager);
	}

	async findMany(tagIds: string[]) {
		return await this.find({
			select: ['id', 'name'],
			where: { id: In(tagIds) },
		});
	}

	/**
	 * Set tags on execution annotation to import while ensuring all tags exist in the database,
	 * either by matching incoming to existing tags or by creating them first.
	 */
	async setTags(tx: EntityManager, dbTags: AnnotationTagEntity[], annotation: ExecutionAnnotation) {
		if (!annotation?.tags?.length) return;

		for (let i = 0; i < annotation.tags.length; i++) {
			const importTag = annotation.tags[i];

			if (!importTag.name) continue;

			const identicalMatch = dbTags.find(
				(dbTag) =>
					dbTag.id === importTag.id &&
					dbTag.createdAt &&
					importTag.createdAt &&
					dbTag.createdAt.getTime() === new Date(importTag.createdAt).getTime(),
			);

			if (identicalMatch) {
				annotation.tags[i] = identicalMatch;
				continue;
			}

			const nameMatch = dbTags.find((dbTag) => dbTag.name === importTag.name);

			if (nameMatch) {
				annotation.tags[i] = nameMatch;
				continue;
			}

			const tagEntity = this.create(importTag);

			annotation.tags[i] = await tx.save<AnnotationTagEntity>(tagEntity);
		}
	}

	/**
	 * Returns the annotation IDs that have certain tags.
	 * Intersection! e.g. annotation needs to have all provided tags.
	 */
	async getAnnotationIdsViaTags(tags: string[]): Promise<number[]> {
		const dbTags = await this.find({
			where: { name: In(tags) },
			relations: ['annotations'],
		});

		const annotationIdsPerTag = dbTags.map((tag) =>
			tag.annotations.map((annotation) => annotation.id),
		);

		return intersection(...annotationIdsPerTag);
	}
}
