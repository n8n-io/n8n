import type { AnnotationTagEntity } from '@n8n/db';
import { AnnotationTagRepository } from '@n8n/db';
import { Service } from '@n8n/di';

import { validateEntity } from '@/generic-helpers';

type IAnnotationTagDb = Pick<AnnotationTagEntity, 'id' | 'name' | 'createdAt' | 'updatedAt'>;

type IAnnotationTagWithCountDb = IAnnotationTagDb & { usageCount: number };

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
