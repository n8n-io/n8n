import { Service } from '@n8n/di';
import { And, DataSource, In, LessThan, MoreThan, Not, IsNull, Repository } from '@n8n/typeorm';
import type { EntityManager, FindOptionsWhere } from '@n8n/typeorm';
import type { IDataObject } from 'n8n-workflow';

import { ActivityEvent } from '../entities';

/** Long enough for any name a list needs to show, short enough that a row stays a pointer. */
export const activityResourceNameMaxLength = 128;

/** Serialized `data` budget. A row that needs more than this is asking to be expanded instead. */
export const activityDataMaxLength = 512;

export type ActivityEventInput = Pick<ActivityEvent, 'category' | 'action'> &
	Partial<Pick<ActivityEvent, 'userId' | 'projectId' | 'resourceType' | 'resourceId'>> & {
		resourceName?: string | null;
		data?: IDataObject | null;
	};

export type ActivityFeedQuery = {
	limit: number;
	/**
	 * The projects whose entries the caller may see. Required for any agent-facing read: without
	 * it a read spans every project on the instance, including ones the user cannot open.
	 * Entries with no project are excluded, since there is no way to prove they are in scope.
	 */
	projectIds?: string[];
	userId?: string;
	resourceId?: string;
	category?: ActivityEvent['category'];
	/** Exclusive lower bound — entries newer than an id a caller has already seen. */
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
	 * `trx` lets a caller bind the entry to its own unit of work; the event relay does not,
	 * because an entry describes something that already happened.
	 */
	async record(input: ActivityEventInput, trx?: EntityManager): Promise<void> {
		const repository = trx ? trx.getRepository(ActivityEvent) : this;
		await repository.insert({
			category: input.category,
			action: input.action,
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
		const where: FindOptionsWhere<ActivityEvent> = {};
		if (query.projectIds !== undefined) {
			// An empty allowance means nothing is visible, not everything — `In([])` would match no
			// row on Postgres but is worth being explicit about rather than relying on it.
			if (query.projectIds.length === 0) return [];
			where.projectId = In(query.projectIds);
		}
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

	/**
	 * Everything recorded about one resource, newest first — the history behind a single entry, and
	 * the read `IDX_activity_event_resource` exists for.
	 */
	async findByResource(
		resourceType: NonNullable<ActivityEvent['resourceType']>,
		resourceId: string,
		limit: number,
	): Promise<ActivityEvent[]> {
		return await this.find({
			where: { resourceType, resourceId },
			order: { id: 'DESC' },
			take: limit,
		});
	}

	/** One entry by id, for expanding it. Callers check its project against their own scope. */
	async findById(id: number): Promise<ActivityEvent | null> {
		return await this.findOne({ where: { id } });
	}

	/**
	 * The project a resource was last seen in, from the log's own earlier entries.
	 *
	 * This is the only way to scope an entry recorded after the resource is gone: by the time
	 * `workflow-deleted` fires, the sharing rows that would name its project are deleted too.
	 * Without it such entries have no project, and an agent-facing read has to drop them — which
	 * would silently lose deletions, the entries most worth surfacing.
	 */
	async findProjectIdForResource(
		resourceType: NonNullable<ActivityEvent['resourceType']>,
		resourceId: string,
	): Promise<string | undefined> {
		const [latest] = await this.find({
			where: { resourceType, resourceId, projectId: Not(IsNull()) },
			order: { id: 'DESC' },
			take: 1,
			select: { projectId: true },
		});
		return latest?.projectId ?? undefined;
	}

	/** Retention by age. Returns how many entries went, so a caller can log a sweep worth noticing. */
	async deleteOlderThan(cutoff: Date): Promise<number> {
		const { affected } = await this.delete({ createdAt: LessThan(cutoff) });
		return affected ?? 0;
	}

	/**
	 * Retention by count, as a backstop for the age sweep on an instance busy enough to write
	 * more in a day than the window is meant to hold. Finds the oldest entry worth keeping and
	 * deletes below it, rather than counting rows twice.
	 */
	async deleteBeyondNewest(keep: number): Promise<number> {
		const [oldestKept] = await this.find({
			order: { id: 'DESC' },
			skip: keep - 1,
			take: 1,
			select: { id: true },
		});
		if (!oldestKept) return 0;

		const { affected } = await this.delete({ id: LessThan(oldestKept.id) });
		return affected ?? 0;
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
