import { Logger } from '@n8n/backend-common';
import { GlobalConfig } from '@n8n/config';
import { Time } from '@n8n/constants';
import {
	ActivityEventRepository,
	activityEventCategories,
	ExecutionRepository,
	ProjectRepository,
	WorkflowRepository,
} from '@n8n/db';
import type {
	ActivityProjectScope,
	ActivityEvent,
	ActivityEventCategory,
	ActivityResourceType,
	User,
} from '@n8n/db';
import { Service } from '@n8n/di';
import type { InstanceAiActivityEntry, InstanceAiActivityExpansion } from '@n8n/instance-ai';
import { hasGlobalScope } from '@n8n/permissions';
import { isRecord } from '@n8n/utils/is-record';
import type { IDataObject } from 'n8n-workflow';

import { userHasScopes } from '@/permissions.ee/check-access';
import { ProjectService } from '@/services/project.service.ee';

import { INSTANCE_CONTEXT_CLOSE_TAG, INSTANCE_CONTEXT_OPEN_TAG } from './internal-messages';

/**
 * Every tunable in one place, because they trade off against each other: widening the window and
 * raising the run cap both buy context with tokens on every turn of every conversation.
 */

/** Entries the agent sees. Wide enough to show a working session, narrow enough to stay skimmable. */
const windowSize = 40;

/** Collapsing and age-filtering both discard rows, so the read starts with more than it will show. */
const fetchMultiplier = 4;

/**
 * The MCP read discards rows for a different reason — workflows withheld from that surface — so it
 * over-fetches on its own dial. Tuning the window above must not silently retune paging here.
 */
const withheldFetchMultiplier = 4;

/** Older than this is history, not context — and the agent has tools for history. */
const maxAgeMs = 7 * Time.days.toMilliseconds;

/**
 * Distinct workflows whose runs may appear. Runs are already folded per workflow, so this caps
 * breadth, not repetition: without it a busy instance's schedules crowd out every edit the user
 * made, which is the signal actually worth carrying.
 */
const runWorkflowCap = 12;

/** Existing workflows to name in the opening block. Enough to recognise the estate, not an index. */
const inventorySize = 8;

/** How much of one resource's own history an expand returns. A resource cannot need more. */
const resourceHistoryLimit = 20;

/**
 * How far below the high-water mark a delta re-reads.
 *
 * Ids are an ordering key, not a completeness watermark: Postgres allocates a sequence value
 * outside the surrounding transaction, so two writers can commit id 101 before id 100, and a
 * cursor that asks for "everything above the highest id seen" skips 100 for good. The entries most
 * worth surfacing are deletions, written by whichever request happens to be committing.
 *
 * So a delta re-reads this far below the mark and drops what it has already shown.
 *
 * What this does and does not promise. The read below is newest-first and capped, so when more
 * rows sit above the floor than the cap, the ones dropped are the lowest — and the mark then
 * advances past them. Those rows are by definition further down than a cap's worth of newer ones,
 * so no row the window could have shown is lost; what is lost is a late commit on a turn that was
 * already too busy to show it. The guarantee is therefore "a straggler is recovered whenever it
 * could be displayed", not "every straggler is recovered". What makes even that much true is
 * `entryFetchLimit` staying above `windowSize`, which is why that one is derived rather than set.
 */
const activityLagIds = 200;

/**
 * Ids remembered inside the band, so a delta does not show one twice. Deliberately the band's own
 * width: the band spans that many ids, so a smaller cap would forget an id still inside it and
 * show it again, and a larger one would store ids the floor already excludes.
 */
const seenIdsCap = activityLagIds;

/**
 * Rows one delta reads. Derived from `windowSize` rather than set by hand: staying above it is
 * what bounds what a truncated read can lose — see the note on `activityLagIds` — and the multiple
 * leaves room for the age filter to discard rows and still fill a window.
 */
const entryFetchLimit = windowSize * fetchMultiplier;

/**
 * Which projects a read may see, and whose visibility rules apply on top.
 *
 * The two surfaces differ because only one of them has a conversation. Instance AI reads inside a
 * thread that was bound to a project when it was created; an MCP client has no such binding, so
 * its scope is resolved from the caller's own access instead.
 */
export type InstanceContextScope =
	/** Instance AI, bound to the thread's own project. Without one it reads nothing. */
	| { surface: 'conversation'; projectId?: string }
	/**
	 * An external MCP client. With no conversation to bind to, the scope is every project the
	 * caller can read workflows in, narrowed to one when the caller names it.
	 *
	 * `credentialGranted` is whether the caller's *token* carries `credential:read`. It narrows a
	 * token; it does not attest a permission, and any user may request the scope. So it is one half
	 * of the credential gate — the other half is the caller's actual `credential:read` on the
	 * projects being read, which this service resolves rather than trusts.
	 */
	| { surface: 'mcp'; projectId?: string; credentialGranted: boolean };

/**
 * A scope after the caller's access has actually been resolved. Separate from the requested scope
 * so nothing downstream can mistake "what was asked for" for "what was allowed".
 */
type ResolvedScope =
	| { surface: 'conversation'; projectIds: string[] }
	| {
			surface: 'mcp';
			projectIds: ActivityProjectScope;
			/** Of those, the ones whose credential entries the caller may read. */
			credentialProjectIds: ActivityProjectScope;
	  };

export type ActivityPage = {
	entries: InstanceAiActivityEntry[];
	hasMore: boolean;
	/**
	 * Where to resume. Present whenever more is below, including when this page showed nothing —
	 * which is the case a cursor drawn from the visible rows would miss.
	 */
	nextBeforeId?: number;
};

/** Thread-metadata key holding what this thread has already been shown. */
export const INSTANCE_CONTEXT_CURSOR = 'instanceContext';

export type InstanceContextCursor = {
	/** Highest activity entry id shown. */
	activityMark: number;
	/** Entry ids already shown that still sit inside the lag band. */
	activitySeen: number[];
	/** ISO timestamp runs were summarised up to. */
	runsThrough: string;
};

/**
 * Tolerant by design — a thread predating this feature, or written by an older shape, starts over
 * with a full block rather than a delta against nothing.
 */
export function readInstanceContextCursor(
	metadata: Record<string, unknown> | undefined,
): InstanceContextCursor | null {
	const value = metadata?.[INSTANCE_CONTEXT_CURSOR];
	if (!isRecord(value)) return null;

	const { activityMark, activitySeen, runsThrough } = value;
	if (typeof activityMark !== 'number' || !Number.isFinite(activityMark)) return null;
	if (typeof runsThrough !== 'string' || Number.isNaN(Date.parse(runsThrough))) return null;

	return {
		activityMark,
		activitySeen: Array.isArray(activitySeen)
			? activitySeen.filter((id): id is number => typeof id === 'number' && Number.isFinite(id))
			: [],
		runsThrough,
	};
}

type RunSummary = {
	workflowId: string;
	workflowName: string;
	total: number;
	failed: number;
	lastStoppedAt: Date;
	lastFailedExecutionId: string | null;
};

type Inventory = { total: number; workflows: Array<{ id: string; name: string; active: boolean }> };

export type InstanceContextBlock = {
	block: string;
	/** What the caller should store on the thread, so the next turn sends only what is new. */
	cursor: InstanceContextCursor;
};

/**
 * Renders what is going on in this instance as a context block for the agent: what exists, what
 * changed, and what has run.
 *
 * Three sources with three different lifetimes, so each gets its own freshness rule. Edits come
 * from `activity_event` and are delta-able by id. What exists comes from the workflows themselves,
 * because an event log cannot answer it: a workflow nobody has touched produces no events at all,
 * and that is often the work being asked about. Runs come from `execution_entity`, which already
 * records every one of them.
 *
 * Deliberately returns nothing rather than an empty block: one saying "nothing happened" is pure
 * cost, and worse, invites the agent to comment on it.
 */
@Service()
export class InstanceContextService {
	constructor(
		private readonly logger: Logger,
		private readonly globalConfig: GlobalConfig,
		private readonly activityEventRepository: ActivityEventRepository,
		private readonly executionRepository: ExecutionRepository,
		private readonly workflowRepository: WorkflowRepository,
		private readonly projectRepository: ProjectRepository,
		private readonly projectService: ProjectService,
	) {
		this.logger = this.logger.scoped('instance-ai');
	}

	get enabled(): boolean {
		return this.globalConfig.instanceAi.instanceContextEnabled;
	}

	/**
	 * `cursor` is what this thread has already been shown; null on its first turn.
	 *
	 * A thread that has seen a block before gets only what is new. Re-sending the window would
	 * leave two overlapping blocks in the conversation whose collapsed counts disagree — "ran 3×,
	 * all succeeded" sitting above "ran 40×, 2 failed" for the same workflow is worse than no
	 * second block, and nothing can retract the older one.
	 */
	async buildBlock(input: {
		user: User;
		/**
		 * Instance AI passes its thread's own project; an MCP client passes the MCP scope, which
		 * resolves the caller's own access instead. Both legs below are filtered accordingly.
		 */
		scope: InstanceContextScope;
		cursor: InstanceContextCursor | null;
		/**
		 * The agent continuing its own task — a checkpoint or a planned build — rather than a
		 * person saying something. Nobody is reading intent on those turns, so the block would be
		 * paid for unread. Checked before any read, so a skipped turn costs nothing.
		 */
		isMachineFollowUp?: boolean;
		now?: Date;
	}): Promise<InstanceContextBlock | null> {
		// The flag gates Instance AI's own block. The MCP surface has its own flag, checked where
		// its tools are registered, so it does not answer to this one.
		if (input.scope.surface === 'conversation' && !this.enabled) return null;
		if (input.isMachineFollowUp) return null;

		try {
			const now = input.now ?? new Date();
			const isUpdate = input.cursor !== null;

			const resolved = await this.resolveScope(input.user, input.scope);
			// Every leg is project-scoped, and a run has no acting user, so project is the only
			// boundary available. Nothing in scope means nothing to show, never something wider.
			if (resolved === null) return null;

			const projectIds = resolved.projectIds;
			// Withheld and archived workflows are excluded inside each query, not after it. The
			// inventory and run legs are aggregates, so filtering their rows afterwards would leave
			// a total counting workflows the caller cannot see.
			const mcpVisibleOnly = resolved.surface === 'mcp';

			const [entries, runs, inventory] = await Promise.all([
				this.readEntries({ projectIds, cursor: input.cursor, now, scope: resolved }),
				this.readRuns({ projectIds, cursor: input.cursor, now, mcpVisibleOnly }),
				// Only on the opening block. A delta skips it: the estate has not changed in a way
				// the earlier block failed to cover.
				isUpdate
					? Promise.resolve(undefined)
					: this.workflowRepository.findRecentForProjects(projectIds, inventorySize, {
							mcpVisibleOnly,
						}),
			]);

			// An instance can hold plenty of work and have had nothing happen to it lately — a fresh
			// clone, or a quiet fortnight. That is exactly the case that most needs "here is what
			// exists", so the block stands on any one leg and only genuine emptiness suppresses it.
			if (entries.rows.length === 0 && runs.length === 0 && !inventory?.total) return null;

			return {
				block: renderBlock({
					surface: resolved.surface,
					entries: entries.rows.map((row) => toFeedEntry(row, input.user.id, now)),
					entriesTruncated: entries.truncated,
					runs,
					isUpdate,
					inventory,
					now,
				}),
				cursor: {
					activityMark: entries.mark,
					activitySeen: entries.seen,
					runsThrough: now.toISOString(),
				},
			};
		} catch (error) {
			// Context is an enhancement; failing to build it must not fail the user's turn.
			this.logger.warn('Failed to build the instance-context block', { error });
			return null;
		}
	}

	/**
	 * Backs the `list` action for Instance AI, whose tool has no paging affordance and so has no
	 * use for the `hasMore` half of the answer.
	 */
	async list(input: {
		user: User;
		scope: InstanceContextScope;
		limit: number;
		category?: string;
		resourceId?: string;
		beforeId?: number;
	}): Promise<InstanceAiActivityEntry[]> {
		return (await this.listPage(input)).entries;
	}

	/**
	 * One page of the log, and whether the feed holds more below it.
	 *
	 * `hasMore` exists because the MCP read filters after fetching: `availableInMCP` defaults to
	 * withheld, so on an instance that predates it almost every workflow is hidden and a page can
	 * come back short — or empty — while plenty sits further back. Without the flag an agent reads
	 * that as "nothing has happened", which is the wrong conclusion and an expensive one.
	 */
	async listPage(input: {
		user: User;
		scope: InstanceContextScope;
		limit: number;
		category?: string;
		resourceId?: string;
		beforeId?: number;
	}): Promise<ActivityPage> {
		const empty: ActivityPage = { entries: [], hasMore: false };

		// A category the vocabulary does not hold matches nothing. Dropping the filter instead would
		// answer a narrowing request by widening it to the whole feed.
		if (input.category !== undefined && !isKnownCategory(input.category)) return empty;

		const resolved = await this.resolveScope(input.user, input.scope);
		if (resolved === null) return empty;

		const category = resolveCategory(input.category, resolved);
		// A caller who may not see credentials and asked for exactly those gets nothing, rather
		// than the workflow entries they did not ask for.
		if (category === null) return empty;

		// Withheld workflows are dropped after the read, so a page of exactly `limit` rows would
		// come back short. Over-fetch and slice back; what the over-fetch cannot promise is covered
		// by `hasMore` and the cursor beside it.
		const filtersWithheld = resolved.surface === 'mcp';
		const fetchLimit = filtersWithheld ? input.limit * withheldFetchMultiplier : input.limit;

		const rows = await this.activityEventRepository.findFeed({
			limit: fetchLimit,
			projectIds: resolved.projectIds,
			...(category !== undefined ? { category } : {}),
			...(input.resourceId !== undefined ? { resourceId: input.resourceId } : {}),
			...(input.beforeId !== undefined ? { beforeId: input.beforeId } : {}),
		});

		const visible = filtersWithheld ? await this.withoutWithheldWorkflows(rows, resolved) : rows;

		// More is below either because the filter cut this page short of a full read, or because a
		// full page came back and the read itself was capped. Both mean "page again".
		const hasMore = visible.length > input.limit || rows.length === fetchLimit;

		// The cursor is the lowest id *read*, not the lowest shown. A page where everything was
		// withheld shows nothing and still has to be pageable — that is the whole case `hasMore`
		// exists for, and a cursor drawn from the visible rows would be absent exactly there.
		const lowestRead = rows.at(-1)?.id;

		return {
			entries: visible.slice(0, input.limit).map((row) => toActivityEntry(row, input.user.id)),
			hasMore,
			...(hasMore && lowestRead !== undefined ? { nextBeforeId: lowestRead } : {}),
		};
	}

	/**
	 * Backs the `expand` action. Returns nothing for an entry outside the caller's scope, exactly
	 * as it does for one that was pruned — an id is a guess the agent may get wrong, and the two
	 * cases must be indistinguishable from outside.
	 *
	 * Every later refusal here answers the same way, for the same reason: a distinct "exists but
	 * withheld" would turn the id into a probe for what the caller cannot see.
	 */
	async expand(input: {
		id: number;
		user: User;
		scope: InstanceContextScope;
	}): Promise<InstanceAiActivityExpansion | null> {
		const resolved = await this.resolveScope(input.user, input.scope);
		if (resolved === null) return null;

		const projectIds = resolved.projectIds;
		const row = await this.activityEventRepository.findEntry({ id: input.id, projectIds });
		if (!row) return null;

		if (resolved.surface === 'mcp') {
			// Both fields are checked, not just `category`. `ActivityEvent` documents that the two
			// come apart as soon as an entry is about one kind of thing but points at another, and
			// at that point a `category: 'workflow'` row could still name a credential.
			const touchesCredential = row.category === 'credential' || row.resourceType === 'credential';
			if (touchesCredential && !isCredentialVisible(row, resolved)) return null;

			// The history below is about this same resource, so one check covers both.
			const [visible] = await this.withoutWithheldWorkflows([row], resolved);
			if (!visible) return null;
		}

		const history =
			row.resourceType && row.resourceId
				? await this.activityEventRepository.findByResource({
						resourceType: row.resourceType,
						resourceId: row.resourceId,
						projectIds,
						limit: resourceHistoryLimit,
					})
				: [];

		const hint = liveRecordHint(row, input.scope.surface);

		return {
			entry: toActivityEntry(row, input.user.id),
			resourceHistory: history
				.filter((other) => other.id !== row.id)
				.map((other) => toActivityEntry(other, input.user.id)),
			...(hint ? { liveRecordHint: hint } : {}),
		};
	}

	/**
	 * Entries newer than the cursor, with the ids to remember.
	 *
	 * The mark advances past every row the query saw, including ones dropped by age or already
	 * shown: they have been accounted for, and re-reading them next turn would only cost tokens.
	 */
	private async readEntries(input: {
		projectIds: ActivityProjectScope;
		cursor: InstanceContextCursor | null;
		now: Date;
		scope: ResolvedScope;
	}): Promise<{ rows: ActivityEvent[]; mark: number; seen: number[]; truncated: boolean }> {
		const cursor = input.cursor;

		// Newest first, and on a delta only what arrived above the mark.
		const arrivals = await this.activityEventRepository.findFeed({
			limit: entryFetchLimit,
			projectIds: input.projectIds,
			...(cursor ? { afterId: cursor.activityMark } : {}),
		});

		// The band below the mark is read separately, not folded into the query above. One capped
		// read cannot cover both: arrivals are unbounded and come back first, so a busy turn would
		// fill the page and push the band out — losing exactly the late commit the band exists for.
		// Alone it is bounded by its own width, since it spans that many ids at most.
		const band = cursor
			? await this.activityEventRepository.findFeed({
					limit: activityLagIds,
					projectIds: input.projectIds,
					afterId: Math.max(0, cursor.activityMark - activityLagIds),
					beforeId: cursor.activityMark,
				})
			: [];

		// Both are newest-first and every arrival outranks every band row, so this stays ordered.
		const read = [...arrivals, ...band];

		// Entries are individual rows rather than an aggregate, so the same post-read filter the
		// `list` tool uses applies here. The mark below still advances past what was filtered:
		// those rows have been accounted for and will not become visible on a later turn.
		const rows =
			input.scope.surface === 'mcp' ? await this.withoutWithheldWorkflows(read, input.scope) : read;

		const alreadyShown = new Set(cursor?.activitySeen ?? []);
		const fresh = rows.filter(
			(row) =>
				!alreadyShown.has(row.id) && input.now.getTime() - row.createdAt.getTime() <= maxAgeMs,
		);

		const shown = fresh.slice(0, windowSize);
		// Over everything read, including rows the visibility filter dropped. They will not become
		// visible later, so leaving the mark behind them would re-read them every turn.
		const mark = read.reduce(
			(highest, row) => Math.max(highest, row.id),
			cursor?.activityMark ?? 0,
		);
		// What was shown, not what was read: an entry the window cut is still unseen, and the band
		// gives it another turn to appear rather than burying it under a mark it never reached.
		// Only ids inside the band need remembering — below it, the floor already excludes them.
		const seen = [...alreadyShown, ...shown.map((row) => row.id)]
			.filter((id) => id > mark - activityLagIds)
			.sort((a, b) => b - a)
			.slice(0, seenIdsCap);

		return {
			rows: shown,
			mark,
			seen,
			// Said out loud rather than left to inference. A cut list that does not say it is cut
			// reads as the whole story, and the agent would draw conclusions from it.
			truncated: fresh.length > windowSize || arrivals.length === entryFetchLimit,
		};
	}

	private async readRuns(input: {
		projectIds: ActivityProjectScope;
		cursor: InstanceContextCursor | null;
		now: Date;
		mcpVisibleOnly: boolean;
	}): Promise<RunSummary[]> {
		// Consecutive windows tile the timeline: half-open `[after, before)`, so a delta starts
		// exactly where the last one ended and a run is summarised once. Re-reading a lag window
		// instead would report the same runs twice, and the counts of two blocks disagreeing is the
		// failure the delta exists to avoid. Half-open rather than fully closed because a run
		// committing after a read, with a stop time exactly on the boundary, would otherwise be in
		// neither window — absent from the first because it had not committed, excluded from the
		// second by the bound.
		//
		// The cost is stated rather than hidden: a run whose row commits after this read but whose
		// `stoppedAt` precedes it is never summarised. Runs have no gap-tolerant cursor the way
		// entries do, because the aggregate returns counts rather than the ids to de-duplicate on.
		const stoppedAfter = input.cursor
			? new Date(Date.parse(input.cursor.runsThrough))
			: new Date(input.now.getTime() - maxAgeMs);

		return await this.executionRepository.summariseRunsForProjects({
			projectIds: input.projectIds,
			stoppedAfter,
			stoppedBefore: input.now,
			workflowLimit: runWorkflowCap,
			...(input.mcpVisibleOnly ? { mcpVisibleOnly: true } : {}),
		});
	}

	/**
	 * The projects this reader may see, and — on MCP — the subset whose credential entries it may
	 * see. `null` means nothing is in scope, which is not the same as an empty list of projects:
	 * a whole-instance reader has no project list at all.
	 *
	 * A conversation sees exactly one project: its own, which the thread was bound to and which was
	 * authorised when the thread was created. A conversation without one reads nothing. That is
	 * deliberately not "every project the user belongs to" — bare project membership is not read
	 * access, since `project:chatUser` holds neither `workflow:read` nor `credential:read`.
	 *
	 * An MCP client has no conversation, so there is nothing to bind to. It resolves the caller's
	 * own access instead. A reader with global `workflow:read` scopes to `'all-projects'` rather
	 * than to a list: enumerating would bind one parameter per project, and an instance holds one
	 * per user. Everyone else gets the scoped query unioned with their personal project, because
	 * that query returns team projects only and directly shared workflows hang off the personal one.
	 */
	private async resolveScope(
		user: User,
		scope: InstanceContextScope,
	): Promise<ResolvedScope | null> {
		// Re-checked on every read, not trusted from the binding. A thread outlives the membership
		// that authorised it — `assertThreadAccess` proves the thread is the caller's own and
		// nothing more — so a user removed from a project would otherwise keep reading it here for
		// the life of the thread, while every other read in this module refused them.
		//
		// `workflow:read` stands for the whole block: it is what the inventory and run legs expose,
		// and credential entries are gated separately below.
		if (scope.projectId !== undefined) {
			const projectId = scope.projectId;
			const allowed = await userHasScopes(user, ['workflow:read'], false, { projectId });
			if (!allowed) return null;

			if (scope.surface === 'conversation') {
				return { surface: 'conversation', projectIds: [projectId] };
			}

			const credentialProjectIds = scope.credentialGranted
				? await this.credentialReadableProjectIds(user, [projectId])
				: [];
			return { surface: 'mcp', projectIds: [projectId], credentialProjectIds };
		}

		if (scope.surface === 'conversation') return null;

		// A global reader needs no project predicate at all, which is both correct and the only
		// bounded option: `getProjectIdsWithScope` would hand back every project on the instance.
		if (hasGlobalScope(user, ['workflow:read'], { mode: 'allOf' })) {
			const credentialProjectIds: ActivityProjectScope =
				scope.credentialGranted && hasGlobalScope(user, ['credential:read'], { mode: 'allOf' })
					? 'all-projects'
					: [];
			return { surface: 'mcp', projectIds: 'all-projects', credentialProjectIds };
		}

		const [scopedIds, personalProject] = await Promise.all([
			this.projectService.getProjectIdsWithScope(user, ['workflow:read']),
			this.projectRepository.getPersonalProjectForUser(user.id),
		]);

		const projectIds = personalProject
			? [...new Set([...scopedIds, personalProject.id])]
			: scopedIds;
		if (projectIds.length === 0) return null;

		const credentialProjectIds = scope.credentialGranted
			? await this.credentialReadableProjectIds(user, projectIds)
			: [];

		return { surface: 'mcp', projectIds, credentialProjectIds };
	}

	/**
	 * Of the projects already in scope, the ones where the caller really may read credentials.
	 *
	 * The token's `credential:read` grant is not this. A grant narrows a token and any user may
	 * request it, so it cannot stand in for the permission — and the two come apart for real:
	 * a custom project role may hold `workflow:read` without `credential:read`, and its holder
	 * would otherwise read credential names and types for a project whose credentials they cannot
	 * list.
	 */
	private async credentialReadableProjectIds(user: User, projectIds: string[]): Promise<string[]> {
		const readable = await this.projectService.getProjectIdsWithScope(user, ['credential:read']);
		const readableSet = new Set(readable);

		const personalProject = await this.projectRepository.getPersonalProjectForUser(user.id);
		if (personalProject) readableSet.add(personalProject.id);

		return projectIds.filter((projectId) => readableSet.has(projectId));
	}

	/**
	 * Drops entries about workflows the instance withholds from MCP.
	 *
	 * MCP reads are filtered per workflow by `settings.availableInMCP` — `search_workflow_executions`
	 * and the workflow history, version and diff tools all enforce it — so a feed that ignored it
	 * would report the edits and runs of workflows the user has deliberately kept off this surface.
	 *
	 * An entry whose workflow no longer resolves is kept. A deleted workflow cannot be withheld
	 * from anything, and its deletion is the entry most worth carrying: dropping it to be safe
	 * would lose the one signal this surface exists to give.
	 */
	private async withoutWithheldWorkflows(
		rows: ActivityEvent[],
		scope: ResolvedScope,
	): Promise<ActivityEvent[]> {
		// Credential entries never reach the workflow-availability check, so they are filtered here
		// against the projects where the caller may actually read credentials.
		rows = rows.filter((row) => isCredentialVisible(row, scope));

		const workflowIds = [
			...new Set(
				rows.flatMap((row) =>
					row.resourceType === 'workflow' && row.resourceId ? [row.resourceId] : [],
				),
			),
		];
		if (workflowIds.length === 0) return rows;

		const availability = await this.workflowRepository.findMcpAvailabilityByIds(workflowIds);

		return rows.filter((row) => {
			if (row.resourceType !== 'workflow' || !row.resourceId) return true;
			return availability.get(row.resourceId) ?? true;
		});
	}
}

/**
 * The category a read should filter on. `undefined` means no filter; `null` means refuse the read
 * outright, because the caller asked for exactly the category they may not see.
 *
 * The caller has already rejected a category outside the vocabulary, so `requested` is either a
 * known category or absent by the time it gets here.
 */
function resolveCategory(
	requested: string | undefined,
	scope: ResolvedScope,
): ActivityEventCategory | undefined | null {
	const category = isKnownCategory(requested) ? requested : undefined;
	if (scope.surface !== 'mcp') return category;

	const seesSomeCredentials =
		scope.credentialProjectIds === 'all-projects' || scope.credentialProjectIds.length > 0;
	if (seesSomeCredentials) return category;

	if (category === 'credential') return null;
	// No category asked for, and only one of the two is visible anywhere — so name it rather than
	// reading both and filtering after.
	return category ?? 'workflow';
}

/**
 * Whether one entry's credential content is readable. Non-credential entries pass untouched; the
 * workflow-availability filter is what governs those.
 */
function isCredentialVisible(row: ActivityEvent, scope: ResolvedScope): boolean {
	if (scope.surface !== 'mcp') return true;
	if (row.category !== 'credential' && row.resourceType !== 'credential') return true;

	if (scope.credentialProjectIds === 'all-projects') return true;
	return row.projectId !== null && scope.credentialProjectIds.includes(row.projectId);
}

/**
 * How to reach the tools named in the block. The two surfaces do not share tool names, so a reader
 * told to call `activity(action="list")` over MCP is told to call something that is not there.
 */
const toolNames = {
	conversation: {
		expand: '`activity(action="expand", id=N)`',
		list: '`activity(action="list")`',
		workflows: '`workflows(action="list")`',
	},
	mcp: {
		expand: '`expand_instance_activity(id=N)`',
		list: '`get_instance_activity`',
		workflows: '`search_workflows`',
	},
} as const;

const initialPreamble = (tools: SurfaceToolNames) => [
	'What is going on in this instance. This is work that already exists and that you can pick up:',
	'when the user is vague ("fix it", "carry on", "what should I look at"), the answer is usually',
	'the most recent thing here, and often the most recent failure. Name what you think they mean',
	'and act on it rather than asking them to choose from a list they can already see.',
	'Do not narrate this back to them — unless they asked what has been happening, let it change',
	'what you do rather than what you say.',
	`Call ${tools.expand} on a bracketed id to see that entry in full along with`,
	`everything else that happened to the same resource, or ${tools.list} to look`,
	'further back than this window. An entry may name a resource that no longer exists.',
];

/**
 * An update says so explicitly. Without that, a two-entry delta reads as though nothing else ever
 * happened, and the agent would draw conclusions from a list it was never given in full.
 */
const updatePreamble = (tools: SurfaceToolNames) => [
	'What has happened since the list earlier in this conversation. Those earlier entries still',
	'stand — these are additions, not a replacement. Read them the same way: context on what the',
	'user has been doing, not a task list or something to comment on unprompted.',
	`${tools.expand} and ${tools.list} work on these ids too.`,
];

/** Named so the agent can act on one without a lookup: the id is what every tool takes. */
function renderInventory(inventory: Inventory, tools: SurfaceToolNames): string[] {
	if (inventory.total === 0) return ['Nothing has been built here yet.', ''];

	const named = inventory.workflows.map(
		(workflow) =>
			`  - "${sanitiseForBlock(workflow.name)}" (workflow:${workflow.id})${
				workflow.active ? ' [published]' : ''
			}`,
	);
	const more = inventory.total - inventory.workflows.length;

	return [
		`Workflows that already exist here: ${inventory.total}. Most recently worked on:`,
		...named,
		...(more > 0 ? [`  ... and ${more} more — ${tools.workflows} for the rest.`] : []),
		'',
	];
}

/**
 * The counts are the point: "ran 43 times, 2 failed" is a different situation from "failed", and
 * only the totals tell a workflow that is broken from one that is merely busy.
 */
function renderRuns(runs: RunSummary[], isUpdate: boolean, now: Date): string[] {
	if (runs.length === 0) return [];

	const lines = runs.map((run) => {
		const outcome =
			run.failed === 0
				? `ran ${run.total}×, all succeeded`
				: `ran ${run.total}×, ${run.failed} failed`;
		// The failure itself, not the newest run, which on a schedule that has since recovered is a
		// success. `executions` fetches the live record from this id.
		const failure = run.lastFailedExecutionId
			? `last failure execution:${run.lastFailedExecutionId}`
			: '';

		return `  - ${[
			`"${sanitiseForBlock(run.workflowName)}" (workflow:${run.workflowId})`,
			outcome,
			failure,
			formatAge(run.lastStoppedAt, now),
		]
			.filter(Boolean)
			.join(' · ')}`;
	});

	return [isUpdate ? 'Runs since then:' : 'Recent runs:', ...lines, ''];
}

function renderBlock(input: {
	entries: string[];
	entriesTruncated: boolean;
	runs: RunSummary[];
	isUpdate: boolean;
	inventory?: Inventory;
	now: Date;
	surface: ResolvedScope['surface'];
}): string {
	const tools = toolNames[input.surface];

	const prose = [
		...(input.isUpdate ? updatePreamble(tools) : initialPreamble(tools)),
		'',
		...(input.inventory ? renderInventory(input.inventory, tools) : []),
		...renderRuns(input.runs, input.isUpdate, input.now),
		...(input.entries.length > 0
			? [
					input.isUpdate ? 'Changes since then:' : 'What changed recently:',
					...input.entries,
					...(input.entriesTruncated
						? [`  ... and more than these — ${tools.list} for the rest.`]
						: []),
				]
			: []),
	].join('\n');

	// The tags are Instance AI's transport: `cleanStoredUserMessage` strips them back out of the
	// stored message. An MCP client is handed the text directly and has nothing to strip, so it
	// would only be reading a stray tag.
	return input.surface === 'mcp'
		? prose
		: `${INSTANCE_CONTEXT_OPEN_TAG}\n${prose}\n${INSTANCE_CONTEXT_CLOSE_TAG}`;
}

type SurfaceToolNames = (typeof toolNames)[keyof typeof toolNames];

const knownCategories = new Set<string>(activityEventCategories);

function isKnownCategory(category: string | undefined): category is ActivityEventCategory {
	return category !== undefined && knownCategories.has(category);
}

/** The tool's payload: the stored entry, flattened, with nothing rendered or abbreviated. */
function toActivityEntry(row: ActivityEvent, currentUserId: string): InstanceAiActivityEntry {
	return {
		id: row.id,
		at: row.createdAt.toISOString(),
		category: row.category,
		action: row.action,
		byCurrentUser: row.userId === currentUserId,
		...(row.resourceType ? { resourceType: row.resourceType } : {}),
		...(row.resourceId ? { resourceId: row.resourceId } : {}),
		...(row.resourceName ? { resourceName: row.resourceName } : {}),
		...(row.data ? { detail: row.data } : {}),
	};
}

/**
 * Names the tool that fetches the live record, rather than fetching it here: those reads already
 * exist, they carry their own permission checks, and duplicating them would drift from them.
 *
 * Named in the caller's own vocabulary,
 * because the two surfaces do not share tool names. An MCP client handed `workflows(action="get")`
 * would be told to call a tool its server does not expose.
 */
function liveRecordHint(
	row: ActivityEvent,
	surface: InstanceContextScope['surface'],
): string | undefined {
	const hints: Record<
		InstanceContextScope['surface'],
		Record<ActivityResourceType, string | undefined>
	> = {
		conversation: {
			workflow: row.resourceId
				? `workflows(action="get", workflowId="${row.resourceId}")`
				: undefined,
			credential: 'credentials(action="list")',
		},
		mcp: {
			workflow: row.resourceId ? `get_workflow_details(workflowId="${row.resourceId}")` : undefined,
			credential: 'list_credentials()',
		},
	};

	return row.resourceType ? hints[surface][row.resourceType] : undefined;
}

function toFeedEntry(row: ActivityEvent, currentUserId: string, now: Date): string {
	return [
		`[${row.id}]`,
		formatAge(row.createdAt, now),
		row.category,
		row.action,
		formatResource(row),
		formatDetail(row),
		row.userId && row.userId !== currentUserId ? 'by another user' : '',
	]
		.filter(Boolean)
		.join(' · ');
}

/**
 * Longest a single stored value may be once inside the block. `activity_event` already truncates
 * `resourceName` on write, but a workflow name reaches the inventory leg straight from its own
 * table, so the bound is applied here for every leg.
 */
const blockValueMaxLength = 128;

/**
 * Neutralises a stored value before it enters the block.
 *
 * Names are written by users and the block is prose the model reads as trusted, so a name holding a
 * newline and a closing tag ends the block early: whatever follows reads as the user's own words,
 * and on reload `cleanStoredUserMessage` strips the wrong span and shows the injected text as the
 * message. A project is the boundary here, not authorship, so the name need not be the reader's own.
 *
 * Angle brackets are escaped rather than dropped, so a name that legitimately contains one still
 * reads as itself.
 */
function sanitiseForBlock(value: string): string {
	// Control characters are replaced by code point rather than by a regex class, which the
	// `no-control-regex` rule rejects.
	const printable = Array.from(value)
		.map((character) => {
			const code = character.codePointAt(0) ?? 0;
			return code < 0x20 || code === 0x7f ? ' ' : character;
		})
		.join('');

	return printable
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/\s+/g, ' ')
		.trim()
		.slice(0, blockValueMaxLength);
}

function formatResource(row: ActivityEvent): string {
	if (!row.resourceId) return '';
	const name = row.resourceName ? `"${sanitiseForBlock(row.resourceName)}" ` : '';
	return `${name}(${row.resourceType ?? 'resource'}:${row.resourceId})`;
}

/**
 * At most two clauses: what changed, and who changed it. Every row pays for its own width, and
 * anything more than this is what `expand` is for.
 */
function formatDetail(row: ActivityEvent): string {
	const data = row.data ?? {};
	if (data.truncated === true) return 'detail too large — expand it';

	const clauses = [nodeChange(data), provenanceClause(data), versionClause(data)].filter(Boolean);
	return clauses.slice(0, 2).join(' · ');
}

/**
 * Which node types moved, not just how many. A count cannot answer "reuse what I changed by
 * hand", which is the case this detail exists for.
 */
function nodeChange(data: IDataObject): string {
	const added = readStringList(data, 'nodesAdded');
	const removed = readStringList(data, 'nodesRemoved');
	const addedTotal = readNumber(data, 'nodesAddedTotal') ?? added.length;
	const removedTotal = readNumber(data, 'nodesRemovedTotal') ?? removed.length;

	const parts = [
		...(addedTotal > 0
			? [`+${addedTotal}${added.length ? ` ${sanitiseForBlock(added.join(', '))}` : ''}`]
			: []),
		...(removedTotal > 0
			? [`−${removedTotal}${removed.length ? ` ${sanitiseForBlock(removed.join(', '))}` : ''}`]
			: []),
	];
	if (parts.length > 0) return parts.join(', ');

	const nodeCount = readNumber(data, 'nodeCount');
	return nodeCount === undefined ? '' : `${nodeCount} nodes`;
}

/** `source` is server-set per code path, so it answers "the assistant or the user" authoritatively. */
function provenanceClause(data: IDataObject): string {
	const source = readString(data, 'source');
	if (source === 'n8n-ai') return 'by the assistant';
	if (source === 'api' || source === 'n8n-mcp') return `via ${source}`;
	if (source === 'import') return 'imported';
	return '';
}

function versionClause(data: IDataObject): string {
	const versionName = readString(data, 'versionName');
	if (versionName) return `version "${sanitiseForBlock(versionName)}"`;

	const credentialType = readString(data, 'credentialType');
	return credentialType ? sanitiseForBlock(credentialType) : '';
}

/** Compact on purpose: every row pays for its own width, and the agent only needs the ordering. */
function formatAge(at: Date, now: Date): string {
	const elapsed = Math.max(0, now.getTime() - at.getTime());
	if (elapsed < Time.hours.toMilliseconds) {
		return `${Math.max(1, Math.floor(elapsed / Time.minutes.toMilliseconds))}m ago`;
	}
	if (elapsed < Time.days.toMilliseconds) {
		return `${Math.floor(elapsed / Time.hours.toMilliseconds)}h ago`;
	}
	return `${Math.floor(elapsed / Time.days.toMilliseconds)}d ago`;
}

function readString(data: IDataObject, key: string): string | undefined {
	const value = data[key];
	return typeof value === 'string' && value.length > 0 ? value : undefined;
}

function readStringList(data: IDataObject, key: string): string[] {
	const value = data[key];
	if (!Array.isArray(value)) return [];

	const items: unknown[] = value;
	return items.filter((item): item is string => typeof item === 'string');
}

function readNumber(data: IDataObject, key: string): number | undefined {
	const value = data[key];
	return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
}
