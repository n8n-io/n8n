import {
	AnnotationTagMapping,
	ExecutionAnnotation,
	ExecutionAnnotationRepository,
	type AnnotationTagEntity,
} from '@n8n/db';
import { Container } from '@n8n/di';

export function mapAnnotationTags(tags: AnnotationTagEntity[]) {
	return tags.map(({ id: tagId, name, createdAt, updatedAt }) => ({
		id: tagId,
		name,
		createdAt,
		updatedAt,
	}));
}

export async function getExecutionTags(executionId: string) {
	const annotation = await Container.get(ExecutionAnnotationRepository).findOne({
		where: { execution: { id: executionId } },
		relations: ['tags'],
	});

	return mapAnnotationTags(annotation?.tags ?? []);
}

export async function updateExecutionTags(
	executionId: string,
	newTagIds: string[],
): Promise<AnnotationTagEntity[]> {
	const { manager: dbManager } = Container.get(ExecutionAnnotationRepository);
	return await dbManager.transaction(async (transactionManager) => {
		// Upsert annotation (create if it doesn't exist)
		await transactionManager.upsert(ExecutionAnnotation, { execution: { id: executionId } }, [
			'execution',
		]);

		const annotation = await transactionManager.findOneOrFail(ExecutionAnnotation, {
			where: { execution: { id: executionId } },
		});

		// Overwrite tags
		await transactionManager.delete(AnnotationTagMapping, {
			annotationId: annotation.id,
		});

		if (newTagIds.length > 0) {
			const tagMappings = newTagIds.map((tagId) => ({
				annotationId: annotation.id,
				tagId,
			}));
			await transactionManager.insert(AnnotationTagMapping, tagMappings);
		}

		// Fetch updated tags to return
		const updatedAnnotation = await transactionManager.findOneOrFail(ExecutionAnnotation, {
			where: { execution: { id: executionId } },
			relations: ['tags'],
		});

		return updatedAnnotation.tags ?? [];
	});
}
