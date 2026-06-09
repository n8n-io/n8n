import type { TagEntity, ITagWithCountDb } from '@n8n/db';
import { TagRepository } from '@n8n/db';
import { Service } from '@n8n/di';
// eslint-disable-next-line n8n-local-rules/misplaced-n8n-typeorm-import
import { In } from '@n8n/typeorm';

import { ExternalHooks } from '@/external-hooks';
import { validateEntity } from '@/generic-helpers';

type GetAllResult<T> = T extends { withUsageCount: true } ? ITagWithCountDb[] : TagEntity[];

type Action = 'Create' | 'Update';

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

		const action = (actionKind[0].toUpperCase() + actionKind.slice(1)) as Action;

		await this.externalHooks.run(`tag.before${action}`, [tag]);

		const savedTag = this.tagRepository.save(tag, { transaction: false });

		await this.externalHooks.run(`tag.after${action}`, [tag]);

		return await savedTag;
	}

	async delete(id: string) {
		await this.externalHooks.run('tag.beforeDelete', [id]);

		const deleteResult = this.tagRepository.delete(id);

		await this.externalHooks.run('tag.afterDelete', [id]);

		return await deleteResult;
	}

	async getAll<T extends { withUsageCount: boolean }>(options?: T): Promise<GetAllResult<T>> {
		if (options?.withUsageCount) {
			const tags = await this.tagRepository
				.createQueryBuilder('tag')
				.select(['tag.id', 'tag.name', 'tag.createdAt', 'tag.updatedAt'])
				.loadRelationCountAndMap('tag.usageCount', 'tag.workflowMappings', 'wm', (qb) =>
					qb.leftJoin('wm.workflows', 'workflow').where('workflow.isArchived = :isArchived', {
						isArchived: false,
					}),
				)
				.getMany();

			return tags as GetAllResult<T>;
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
	sortByRequestOrder(tags: TagEntity[], { requestOrder }: { requestOrder: string[] }) {
		const tagMap = tags.reduce<Record<string, TagEntity>>((acc, tag) => {
			acc[tag.id] = tag;
			return acc;
		}, {});

		return requestOrder.map((tagId) => tagMap[tagId]);
	}

	/**
	 * Resolve a set of tag names to their entities, creating any that don't exist.
	 * Names are trimmed and de-duplicated before lookup. Returns one entity per
	 * unique input name, in the same order as the de-duplicated input.
	 */
	async findOrCreateByNames(names: string[]): Promise<TagEntity[]> {
		const uniqueNames = Array.from(new Set(names.map((n) => n.trim()).filter((n) => n.length > 0)));
		if (uniqueNames.length === 0) return [];

		const existing = await this.tagRepository.find({ where: { name: In(uniqueNames) } });
		const existingByName = new Map(existing.map((t) => [t.name, t]));

		const result: TagEntity[] = [];
		for (const name of uniqueNames) {
			const hit = existingByName.get(name);
			if (hit) {
				result.push(hit);
				continue;
			}
			const created = await this.save(this.toEntity({ name }), 'create');
			result.push(created);
		}
		return result;
	}
}
