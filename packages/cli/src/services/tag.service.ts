import type { TagEntity, ITagWithCountDb } from '@n8n/db';
import { TagRepository } from '@n8n/db';
import { Service } from '@n8n/di';
import { QueryFailedError } from '@n8n/typeorm';

import { ExternalHooks } from '@/external-hooks';
import { validateEntity } from '@/generic-helpers';

type GetAllResult<T> = T extends { withUsageCount: true } ? ITagWithCountDb[] : TagEntity[];

type Action = 'Create' | 'Update';

// n8n supports postgres (SQLSTATE 23505) and sqlite (SQLITE_CONSTRAINT_UNIQUE,
// or the older SQLITE_CONSTRAINT with a "UNIQUE constraint" message).
function isUniqueConstraintViolation(error: unknown): error is QueryFailedError {
	if (!(error instanceof QueryFailedError)) return false;
	const driver = (error as { driverError?: { code?: unknown } }).driverError;
	const code = driver && typeof driver.code !== 'undefined' ? String(driver.code) : undefined;
	if (code === '23505' || code === 'SQLITE_CONSTRAINT_UNIQUE') return true;
	return code === 'SQLITE_CONSTRAINT' && /UNIQUE constraint/i.test(error.message);
}

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

	async getAll<T extends { withUsageCount: boolean; limit?: number; orderByName?: boolean }>(
		options?: T,
	): Promise<GetAllResult<T>> {
		if (options?.withUsageCount) {
			const qb = this.tagRepository
				.createQueryBuilder('tag')
				.select(['tag.id', 'tag.name', 'tag.createdAt', 'tag.updatedAt'])
				.loadRelationCountAndMap('tag.usageCount', 'tag.workflowMappings', 'wm', (qb2) =>
					qb2.leftJoin('wm.workflows', 'workflow').where('workflow.isArchived = :isArchived', {
						isArchived: false,
					}),
				);
			if (options.orderByName) qb.orderBy('tag.name', 'ASC');
			if (options.limit !== undefined) qb.limit(options.limit);
			const tags = await qb.getMany();

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
				if (!isUniqueConstraintViolation(error)) throw error;
				const raced = await this.tagRepository.findOneBy({ name });
				if (!raced) throw error;
				result.push(raced);
			}
		}
		return result;
	}
}
