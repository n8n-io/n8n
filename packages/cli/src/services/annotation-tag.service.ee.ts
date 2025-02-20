import { Service } from '@n8n/di';

import type { AnnotationTagEntity } from '@/databases/entities/annotation-tag-entity.ee';
import { AnnotationTagRepository } from '@/databases/repositories/annotation-tag.repository.ee';
import { validateEntity } from '@/generic-helpers';
import type { IAnnotationTagDb, IAnnotationTagWithCountDb } from '@/interfaces';

type GetAllResult<T> = T extends { withUsageCount: true }
	? IAnnotationTagWithCountDb[]
	: IAnnotationTagDb[];

@Service()
export class AnnotationTagService {
	constructor(private tagRepository: AnnotationTagRepository) {}

	toEntity(attrs: { name: string; id?: string }) {
		attrs.name = attrs.name.trim();

		return this.tagRepository.create(attrs);
	}

	async save(tag: AnnotationTagEntity) {
		await validateEntity(tag);

		return await this.tagRepository.save(tag, { transaction: false });
	}

	async delete(id: string) {
		return await this.tagRepository.delete(id);
	}

	async getAll<T extends { withUsageCount: boolean }>(options?: T): Promise<GetAllResult<T>> {
		if (options?.withUsageCount) {
			const allTags = await this.tagRepository.find({
				select: ['id', 'name', 'createdAt', 'updatedAt'],
				relations: ['annotationMappings'],
			});

			return allTags.map(({ annotationMappings, ...rest }) => {
				return {
					...rest,
					usageCount: annotationMappings.length,
				} as IAnnotationTagWithCountDb;
			}) as GetAllResult<T>;
		}

		const allTags = (await this.tagRepository.find({
			select: ['id', 'name', 'createdAt', 'updatedAt'],
		})) as IAnnotationTagDb[];

		return allTags as GetAllResult<T>;
	}
}
