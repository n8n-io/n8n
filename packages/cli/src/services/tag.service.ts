import { TagRepository } from '@db/repositories/tag.repository';
import { Service } from 'typedi';
import { validateEntity } from '@/GenericHelpers';
import type { ITagWithCountDb } from '@/Interfaces';
import type { TagEntity } from '@db/entities/TagEntity';
import type { FindManyOptions, FindOneOptions } from 'typeorm';
import type { UpsertOptions } from 'typeorm/repository/UpsertOptions';
import { ExternalHooks } from '@/ExternalHooks';

type GetAllResult<T> = T extends { withUsageCount: true } ? ITagWithCountDb[] : TagEntity[];

@Service()
export class TagService {
	constructor(
		private externalHooks: ExternalHooks,
		private tagRepository: TagRepository,
	) {}

	toEntity(attrs: { name: string; id?: string }) {
		attrs.name = attrs.name.trim();

		return this.tagRepository.create(attrs);
	}

	async save(tag: TagEntity, actionKind: 'create' | 'update') {
		await validateEntity(tag);

		const action = actionKind[0].toUpperCase() + actionKind.slice(1);

		await this.externalHooks.run(`tag.before${action}`, [tag]);

		const savedTag = this.tagRepository.save(tag);

		await this.externalHooks.run(`tag.after${action}`, [tag]);

		return savedTag;
	}

	async delete(id: string) {
		await this.externalHooks.run('tag.beforeDelete', [id]);

		const deleteResult = this.tagRepository.delete(id);

		await this.externalHooks.run('tag.afterDelete', [id]);

		return deleteResult;
	}

	async findOne(options: FindOneOptions<TagEntity>) {
		return this.tagRepository.findOne(options);
	}

	async findMany(options: FindManyOptions<TagEntity>) {
		return this.tagRepository.find(options);
	}

	async upsert(tag: TagEntity, options: UpsertOptions<TagEntity>) {
		return this.tagRepository.upsert(tag, options);
	}

	async getAll<T extends { withUsageCount: boolean }>(options?: T): Promise<GetAllResult<T>> {
		if (options?.withUsageCount) {
			const allTags = await this.tagRepository.find({
				select: ['id', 'name', 'createdAt', 'updatedAt'],
				relations: ['workflowMappings'],
			});

			return allTags.map(({ workflowMappings, ...rest }) => {
				return {
					...rest,
					usageCount: workflowMappings.length,
				} as ITagWithCountDb;
			}) as GetAllResult<T>;
		}

		return this.tagRepository.find({
			select: ['id', 'name', 'createdAt', 'updatedAt'],
		}) as Promise<GetAllResult<T>>;
	}

	/**
	 * Sort tags based on the order of the tag IDs in the request.
	 */
	sortByRequestOrder(tags: TagEntity[], { requestOrder }: { requestOrder: string[] }) {
		const tagMap = tags.reduce<Record<string, TagEntity>>((acc, tag) => {
			acc[tag.id] = tag;
			return acc;
		}, {});

		return requestOrder.map((tagId) => tagMap[tagId]);
	}
}
