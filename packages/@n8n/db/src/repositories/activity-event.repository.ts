import { Service } from '@n8n/di';
import { And, DataSource, In, LessThan, LessThanOrEqual, MoreThan, Repository } from '@n8n/typeorm';
import type { FindOperator, FindOptionsWhere } from '@n8n/typeorm';
import type { IDataObject } from 'n8n-workflow';

import { ActivityEvent } from '../entities';

/** Long enough for any name a list needs to show, short enough that a row stays a pointer. */
export const activityResourceNameMaxLength = 128;

/** Serialized `data` budget. A row that needs more than this is asking to be expanded instead. */
export const activityDataMaxLength = 512;

/**
 * Rows per retention pass. Bounded so a first sweep over a long backlog does not hold one
 * transaction — and one set of locks — over the highest-write table in the schema.
 */
const retentionBatchSize = 500;

/**
 * `find` drops a falsy `take`, so `take: 0` reads the whole table rather than nothing. Every
 * limited read goes through this first.
 */
function isEmptyPage(limit: number): boolean {
	return !Number.isInteger(limit) || limit <= 0;
}

export type ActivityEventInput = Pick<ActivityEvent, 'category' | 'action'> &
	Partial<
		Pick<ActivityEvent, 'typeVersion' | 'userId' | 'projectId' | 'resourceType' | 'resourceId'>
	> & {
		resourceName?: string | null;
		data?: IDataObject | null;
	};

export type ActivityFeedQuery = {
	limit: number;
	/**
	 * The projects whose entries the caller may see. Required, not optional: an omitted scope
	 * would read every project on the instance, including ones the user cannot open. Entries
	 * with no project are excluded, since there is no way to prove they are in scope.
	 */
	projectIds: string[];
	userId?: string;
	resourceId?: string;
	category?: ActivityEvent['category'];
	/**
	 * Exclusive lower bound — entries newer than an id a caller has already seen. Ids are not a
	 * completeness watermark; see `ActivityEvent.id` before using this to tail the feed.
	 */
	afterId?: number;
	/** Exclusive upper bound, for paging backwards through older entries. */
	beforeId?: number;
};

@Service()
export class ActivityEventRepository extends Repository<ActivityEvent> {
	constructor(dataSource: DataSource) {
		super(ActivityEvent, dataSource.manager);
	}

	/**
	 * The only write path, so the row-size guarantees hold whatever the caller passes.
	 * Deliberately not transaction-aware: an entry describes something that already happened, so
	 * it must not be rolled back with the operation that produced it.
	 */
	async record(input: ActivityEventInput): Promise<void> {
		await this.insert({
			category: input.category,
			action: input.action,
			typeVersion: input.typeVersion ?? 1,
			userId: input.userId ?? null,
			projectId: input.projectId ?? null,
			resourceType: input.resourceType ?? null,
			resourceId: input.resourceId ?? null,
			resourceName: truncateResourceName(input.resourceName),
			data: capData(input.data),
		});
	}

	/**
	 * Newest first, which is both the render order and the order the indexes are built for.
	 * Scoping is by project, not by user: a scheduled run that failed at 03:00 has no user, and
	 * it is exactly the entry worth surfacing. `userId` is carried per row so a reader can tell
	 * the current user's own actions apart from everyone else's.
	 */
	async findFeed(query: ActivityFeedQuery): Promise<ActivityEvent[]> {
		if (isEmptyPage(query.limit)) return [];
		// An empty allowance means nothing is visible, not everything — `In([])` would match no
		// row on Postgres but is worth being explicit about rather than relying on it.
		if (query.projectIds.length === 0) return [];

		const where: FindOptionsWhere<ActivityEvent> = { projectId: In(query.projectIds) };
		if (query.userId !== undefined) where.userId = query.userId;
		if (query.resourceId !== undefined) where.resourceId = query.resourceId;
		if (query.category !== undefined) where.category = query.category;

		// Both bounds can apply at once — "what arrived while this page was open" pages an
		// already-bounded range — so they combine rather than overwrite each other.
		const bounds = [
			...(query.afterId !== undefined ? [MoreThan(query.afterId)] : []),
			...(query.beforeId !== undefined ? [LessThan(query.beforeId)] : []),
		];
		if (bounds.length === 1) where.id = bounds[0];
		else if (bounds.length === 2) where.id = And(...bounds);

		return await this.find({ where, order: { id: 'DESC' }, take: query.limit });
	}

	/** Retention by age. Returns how many entries went, so a caller can log a sweep worth noticing. */
	async deleteOlderThan(cutoff: Date): Promise<number> {
		return await this.deleteInBatches({ createdAt: LessThan(cutoff) });
	}

	/**
	 * Retention by count, as a backstop for the age sweep on an instance busy enough to write
	 * more in a day than the window is meant to hold. Finds the oldest entry worth keeping and
	 * deletes below it, rather than counting rows twice.
	 */
	async deleteBeyondNewest(keep: number): Promise<number> {
		// A cap of 0 means unlimited, as it does for `EXECUTIONS_DATA_PRUNE_MAX_COUNT`. Reading it
		// as "keep nothing" would empty the table on a config typo. Also guards `skip: keep - 1`,
		// which would otherwise ask the driver for a negative offset.
		if (!Number.isInteger(keep) || keep <= 0) return 0;

		const [oldestKept] = await this.find({
			order: { id: 'DESC' },
			skip: keep - 1,
			take: 1,
			select: { id: true },
		});
		if (!oldestKept) return 0;

		return await this.deleteInBatches({}, LessThan(oldestKept.id));
	}

	/**
	 * Deletes everything matching `scope` (and `idBound`, if the caller restricts ids), oldest
	 * first, a batch at a time.
	 *
	 * Each pass reads the id that ends the next batch and deletes up to it, rather than deleting
	 * by an id list: SQLite caps a statement at 999 bound variables, so a list would put a ceiling
	 * on the batch size, and `DELETE ... LIMIT` needs a SQLite compiled with an option we cannot
	 * assume.
	 *
	 * `idBound` is taken apart from `scope` so the per-batch bound can be *added* to it rather
	 * than replacing it. A caller cannot hand over a batch predicate that drops its own scope.
	 */
	private async deleteInBatches(
		scope: Omit<FindOptionsWhere<ActivityEvent>, 'id'>,
		idBound?: FindOperator<number>,
	): Promise<number> {
		const scoped: FindOptionsWhere<ActivityEvent> = idBound ? { ...scope, id: idBound } : scope;
		let total = 0;

		for (;;) {
			const batch = await this.find({
				where: scoped,
				order: { id: 'ASC' },
				take: retentionBatchSize,
				select: { id: true },
			});
			if (batch.length === 0) return total;

			const upTo = LessThanOrEqual(batch[batch.length - 1].id);
			const { affected } = await this.delete({
				...scope,
				id: idBound ? And(idBound, upTo) : upTo,
			});
			total += affected ?? 0;

			if (batch.length < retentionBatchSize) return total;
		}
	}
}

function truncateResourceName(name: string | null | undefined): string | null {
	if (!name) return null;
	return name.length > activityResourceNameMaxLength
		? name.slice(0, activityResourceNameMaxLength)
		: name;
}

/**
 * Oversized detail is replaced rather than trimmed: half a JSON object is worse than an honest
 * marker, and the marker tells a reader the full record is only a fetch away.
 */
function capData(data: IDataObject | null | undefined): IDataObject | null {
	if (!data) return null;
	return JSON.stringify(data).length > activityDataMaxLength ? { truncated: true } : data;
}
