import { TagRepository } from '@/databases/repositories';
import { Service } from 'typedi';
import { validateEntity } from '@/GenericHelpers';
import type { ITagToImport, ITagWithCountDb, IWorkflowToImport } from '@/Interfaces';
import type { TagEntity } from '@/databases/entities/TagEntity';
import type { EntityManager, FindManyOptions, FindOneOptions } from '@n8n/typeorm';
import type { UpsertOptions } from '@n8n/typeorm/repository/UpsertOptions';
import { ExternalHooks } from '@/ExternalHooks';

type GetAllResult<T> = T extends { withUsageCount: true } ? ITagWithCountDb[] : TagEntity[];

@Service()
export class TagService {
	constructor(private externalHooks: ExternalHooks, private tagRepository: TagRepository) {}

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

	/**
	 * Set tag IDs to use existing tags, creates a new tag if no matching tag could be found
	 */
	async setTagsForImport(
		transactionManager: EntityManager,
		workflow: IWorkflowToImport,
		tags: TagEntity[],
	) {
		if (!this.hasTags(workflow)) return;

		const workflowTags = workflow.tags;
		const tagLookupPromises = [];
		for (let i = 0; i < workflowTags.length; i++) {
			if (workflowTags[i]?.name) {
				const lookupPromise = this.findOrCreateTag(transactionManager, workflowTags[i], tags).then(
					(tag) => {
						workflowTags[i] = {
							id: tag.id,
							name: tag.name,
						};
					},
				);
				tagLookupPromises.push(lookupPromise);
			}
		}

		await Promise.all(tagLookupPromises);
	}

	private hasTags(workflow: IWorkflowToImport) {
		return 'tags' in workflow && Array.isArray(workflow.tags) && workflow.tags.length > 0;
	}

	private async findOrCreateTag(
		transactionManager: EntityManager,
		importTag: ITagToImport,
		tagsEntities: TagEntity[],
	) {
		// Assume tag is identical if createdAt date is the same to preserve a changed tag name
		const identicalMatch = tagsEntities.find(
			(existingTag) =>
				existingTag.id === importTag.id &&
				existingTag.createdAt &&
				importTag.createdAt &&
				existingTag.createdAt.getTime() === new Date(importTag.createdAt).getTime(),
		);
		if (identicalMatch) {
			return identicalMatch;
		}

		const nameMatch = tagsEntities.find((existingTag) => existingTag.name === importTag.name);
		if (nameMatch) {
			return nameMatch;
		}

		const created = await this.txCreateTag(transactionManager, importTag.name);
		tagsEntities.push(created);
		return created;
	}

	private async txCreateTag(transactionManager: EntityManager, name: string) {
		const tag = this.tagRepository.create({ name: name.trim() });
		return transactionManager.save<TagEntity>(tag);
	}
}
