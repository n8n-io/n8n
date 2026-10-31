import type { TagEntity, ITagWithCountDb, OperationContext } from '@n8n/db';
import { generateNanoId, isUniqueConstraintError, TagRepository, TransactionRunner } from '@n8n/db';
import { Service } from '@n8n/di';
import { UnexpectedError } from 'n8n-workflow';

import { ExternalHooks } from '@/external-hooks';
import { validateEntity } from '@/generic-helpers';

type GetAllResult<T> = T extends { withUsageCount: true } ? ITagWithCountDb[] : TagEntity[];

type Action = 'Create' | 'Update';

@Service()
export class TagService {
	constructor(
		private externalHooks: ExternalHooks,
		private tagRepository: TagRepository,
		private txRunner: TransactionRunner,
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

	/**
	 * Re-keys an existing tag to a new id, moving its workflow and folder
	 * mappings along. Does not run the `tag.beforeUpdate`/`afterUpdate`
	 * external hooks: those model name edits, and no id-change hook contract
	 * exists.
	 */
	async reconcileTagId(oldId: string, newId: string) {
		await this.txRunner.run(
			{},
			async (ctx) => await this.tagRepository.reconcileTagId(oldId, newId, ctx),
		);
	}

	async delete(id: string) {
		await this.externalHooks.run('tag.beforeDelete', [id]);

		const deleteResult = this.tagRepository.delete(id);

		await this.externalHooks.run('tag.afterDelete', [id]);

		return await deleteResult;
	}

	async getAll<T extends { withUsageCount: boolean; limit?: number; orderByName?: boolean }>(
		options?: T,
	): Promise<GetAllResult<T>> {
		if (options?.withUsageCount) {
			const tags = await this.tagRepository.findAllWithUsageCount({
				orderByName: options.orderByName,
				limit: options.limit,
			});

			return tags as GetAllResult<T>;
		}

		return await (this.tagRepository.find({
			select: ['id', 'name', 'createdAt', 'updatedAt'],
			...(options?.orderByName ? { order: { name: 'ASC' as const } } : {}),
			...(options?.limit !== undefined ? { take: options.limit } : {}),
		}) as Promise<GetAllResult<T>>);
	}

	async getPaginated({ offset, limit }: { offset: number; limit: number }): Promise<{
		data: TagEntity[];
		count: number;
	}> {
		const [data, count] = await this.tagRepository.findAndCount({
			skip: offset,
			take: limit,
			select: ['id', 'name', 'createdAt', 'updatedAt'],
			order: { createdAt: 'ASC', id: 'ASC' },
		});
		return { data, count };
	}

	async getById(id: string) {
		return await this.tagRepository.findOneOrFail({
			where: { id },
		});
	}

	async getByIds(ids: string[]): Promise<TagEntity[]> {
		if (ids.length === 0) return [];
		return await this.tagRepository.findMany(ids);
	}

	async getByNames(names: string[]): Promise<TagEntity[]> {
		if (names.length === 0) return [];
		return await this.tagRepository.findManyByName(names);
	}

	async getAllByWorkflowId(workflowId: string): Promise<TagEntity[]> {
		return await this.tagRepository.findBy({ workflows: { id: workflowId } });
	}

	/**
	 * Paginated tags with non-archived usage counts plus the total count, both
	 * via DB-level queries. Runs the data query and `count` in parallel.
	 */
	async listWithUsageCount({ limit }: { limit: number }): Promise<{
		data: ITagWithCountDb[];
		totalCount: number;
	}> {
		const [data, totalCount] = await Promise.all([
			this.getAll({ withUsageCount: true, limit, orderByName: true }),
			this.tagRepository.count(),
		]);
		return { data, totalCount };
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
	 * Resolve names to tag entities, creating any missing. Names are trimmed
	 * and exact duplicates collapsed, matching how tags are stored; case-variant
	 * names resolve as distinct tags. Race-safe against concurrent same-name
	 * creates.
	 */
	async findOrCreateByNames(names: string[]): Promise<TagEntity[]> {
		const uniqueNames = [
			...new Set(names.map((name) => name.trim()).filter((name) => name.length > 0)),
		];
		if (uniqueNames.length === 0) return [];

		const existing = await this.tagRepository.findManyByName(uniqueNames);
		const existingByName = new Map(existing.map((t) => [t.name, t]));

		const result: TagEntity[] = [];
		for (const name of uniqueNames) {
			const hit = existingByName.get(name);
			if (hit) {
				result.push(hit);
				continue;
			}
			try {
				const created = await this.save(this.toEntity({ name }), 'create');
				result.push(created);
			} catch (error) {
				if (!isUniqueConstraintError(error)) throw error;
				const raced = await this.tagRepository.findOneBy({ name });
				if (!raced) throw error;
				result.push(raced);
			}
		}
		return result;
	}

	/**
	 * Resolves names to tags in the caller's transaction and inserts the missing ones.
	 * Names are normalized like `findOrCreateByNames`. Only the `tag.beforeCreate` hooks
	 * run here. Pass `created` to `runAfterCreateHooks` after the transaction commits, so a
	 * rolled-back transaction leaves no tag and runs no after-create hook.
	 */
	async findOrCreateByNamesInTransaction(
		names: string[],
		ctx: OperationContext,
	): Promise<{ tags: TagEntity[]; created: TagEntity[] }> {
		const uniqueNames = [
			...new Set(names.map((name) => name.trim()).filter((name) => name.length > 0)),
		];
		if (uniqueNames.length === 0) return { tags: [], created: [] };

		const existing = await this.tagRepository.findManyByName(uniqueNames, ctx);
		const existingNames = new Set(existing.map((tag) => tag.name));

		const candidates: TagEntity[] = [];
		for (const name of uniqueNames.filter((n) => !existingNames.has(n))) {
			const tag = this.toEntity({ name, id: generateNanoId() });
			await validateEntity(tag);
			await this.externalHooks.run('tag.beforeCreate', [tag]);
			candidates.push(tag);
		}

		if (candidates.length === 0) {
			return { tags: this.orderByNames(existing, uniqueNames), created: [] };
		}

		// A concurrent create of the same name wins, so read back what is stored.
		await this.tagRepository.insertIgnoringNameConflicts(candidates, ctx);
		const stored = await this.tagRepository.findManyByName(uniqueNames, ctx);
		const tags = this.orderByNames(stored, uniqueNames);
		const candidateIds = new Set(candidates.map((tag) => tag.id));

		return { tags, created: tags.filter((tag) => candidateIds.has(tag.id)) };
	}

	/** Runs the `tag.afterCreate` hooks for tags that `findOrCreateByNamesInTransaction` created. */
	async runAfterCreateHooks(tags: TagEntity[]) {
		for (const tag of tags) {
			await this.externalHooks.run('tag.afterCreate', [tag]);
		}
	}

	private orderByNames(tags: TagEntity[], names: string[]): TagEntity[] {
		const byName = new Map(tags.map((tag) => [tag.name, tag]));
		return names.map((name) => {
			const tag = byName.get(name);
			if (!tag) throw new UnexpectedError(`Tag "${name}" was not found after it was saved`);
			return tag;
		});
	}
}
