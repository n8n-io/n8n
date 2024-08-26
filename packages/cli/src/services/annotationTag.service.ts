import { Service } from 'typedi';
import { validateEntity } from '@/GenericHelpers';
import type { IAnnotationTagDb, IAnnotationTagWithCountDb } from '@/Interfaces';
import type { AnnotationTagEntity } from '@db/entities/AnnotationTagEntity';
import { AnnotationTagRepository } from '@db/repositories/annotationTag.repository';

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

		const savedTag = this.tagRepository.save(tag, { transaction: false });

		return await savedTag;
	}

	async delete(id: string) {
		const deleteResult = this.tagRepository.delete(id);

		return await deleteResult;
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

	async getById(id: string) {
		return await this.tagRepository.findOneOrFail({
			where: { id },
		});
	}

	/**
	 * Sort tags based on the order of the tag IDs in the request.
	 */
	sortByRequestOrder(tags: AnnotationTagEntity[], { requestOrder }: { requestOrder: string[] }) {
		const tagMap = tags.reduce<Record<string, AnnotationTagEntity>>((acc, tag) => {
			acc[tag.id] = tag;
			return acc;
		}, {});

		return requestOrder.map((tagId) => tagMap[tagId]);
	}
}
