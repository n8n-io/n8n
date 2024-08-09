import { Service } from 'typedi';
import { validateEntity } from '@/GenericHelpers';
import type { ITagWithCountDb } from '@/Interfaces';
import type { AnnotationTagEntity } from '@db/entities/AnnotationTagEntity';
import { AnnotationTagRepository } from '@db/repositories/annotationTag.repository';
import { ExternalHooks } from '@/ExternalHooks';

type GetAllResult<T> = T extends { withUsageCount: true }
	? ITagWithCountDb[]
	: AnnotationTagEntity[];

@Service()
export class AnnotationTagService {
	constructor(
		private externalHooks: ExternalHooks,
		private tagRepository: AnnotationTagRepository,
	) {}

	toEntity(attrs: { name: string; id?: string }) {
		attrs.name = attrs.name.trim();

		return this.tagRepository.create(attrs);
	}

	async save(tag: AnnotationTagEntity, actionKind: 'create' | 'update') {
		await validateEntity(tag);

		const action = actionKind[0].toUpperCase() + actionKind.slice(1);

		await this.externalHooks.run(`annotationTag.before${action}`, [tag]);

		const savedTag = this.tagRepository.save(tag, { transaction: false });

		await this.externalHooks.run(`annotationTag.after${action}`, [tag]);

		return await savedTag;
	}

	async delete(id: string) {
		await this.externalHooks.run('annotationTag.beforeDelete', [id]);

		const deleteResult = this.tagRepository.delete(id);

		await this.externalHooks.run('annotationTag.afterDelete', [id]);

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
				} as ITagWithCountDb;
			}) as GetAllResult<T>;
		}

		return await (this.tagRepository.find({
			select: ['id', 'name', 'createdAt', 'updatedAt'],
		}) as Promise<GetAllResult<T>>);
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
