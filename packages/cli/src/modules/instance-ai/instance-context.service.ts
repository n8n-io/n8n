import { Logger } from '@n8n/backend-common';
import { Time } from '@n8n/constants';
import {
	ActivityEventRepository,
	activityEventCategories,
	ExecutionRepository,
	WorkflowRepository,
} from '@n8n/db';
import type { ActivityEvent, ActivityEventCategory, ActivityResourceType, User } from '@n8n/db';
import { Service } from '@n8n/di';
import { isRecord } from '@n8n/utils/is-record';
import type { InstanceAiActivityEntry, InstanceAiActivityExpansion } from '@n8n/instance-ai';
import type {
	InstanceContextAbsenceReason,
	InstanceContextInjection,
	InstanceContextLegs,
} from '@n8n/api-types';
import type { IDataObject } from 'n8n-workflow';

import { userHasScopes } from '@/permissions.ee/check-access';

import { INSTANCE_CONTEXT_CLOSE_TAG, INSTANCE_CONTEXT_OPEN_TAG } from './internal-messages';

/**
 * Every tunable in one place, because they trade off against each other: widening the window and
 * raising the run cap both buy context with tokens on every turn of every conversation.
 */

/** Entries the agent sees. Wide enough to show a working session, narrow enough to stay skimmable. */
const windowSize = 40;

/** Collapsing and age-filtering both discard rows, so the read starts with more than it will show. */
const fetchMultiplier = 4;

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
 * Shown ids a delta remembers, so it cannot offer one twice. A sequence value is allocated
 * outside its transaction, so a delta re-reads between the cursor's floor and its mark to catch
 * a late commit; the floor is the highest id a turn cut, which stops that re-read draining a
 * backlog a window at a time.
 */
const seenIdsCap = 200;

/**
 * Rows one delta reads. Derived from `windowSize` rather than set by hand: it has to stay above
 * the window so a turn can tell "this is all there is" from "this is the first page", and the
 * multiple leaves room for the age filter to discard rows and still fill a window.
 */
const entryFetchLimit = windowSize * fetchMultiplier;

/** Thread-metadata key holding what this thread has already been shown. */
export const INSTANCE_CONTEXT_CURSOR = 'instanceContext';

export type InstanceContextCursor = {
	/** Highest activity entry id read. */
	activityMark: number;
	/** Highest entry id a turn cut. Nothing at or below it is offered again. */
	activityFloor: number;
	/**
	 * The categories the turns behind this cursor were allowed to read. A floor advanced by a
	 * narrower scope would otherwise hide, for good, the rows a later widening makes readable.
	 */
	activityCategories: ActivityEventCategory[];
	/**
	 * Entry ids already shown. Kept independently of the floor, which moves down again whenever
	 * the scope widens — so these have to outlive it to stop a reopened window repeating itself.
	 */
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

	const { activityMark, activityFloor, activityCategories, activitySeen, runsThrough } = value;
	if (typeof activityMark !== 'number' || !Number.isFinite(activityMark)) return null;
	if (typeof activityFloor !== 'number' || !Number.isFinite(activityFloor)) return null;
	if (!Array.isArray(activityCategories)) return null;
	if (typeof runsThrough !== 'string' || Number.isNaN(Date.parse(runsThrough))) return null;

	return {
		activityMark,
		activityFloor,
		activityCategories: activityCategories.filter(isKnownCategory),
		activitySeen: Array.isArray(activitySeen)
			? activitySeen.filter((id): id is number => typeof id === 'number' && Number.isFinite(id))
			: [],
		runsThrough,
	};
}

/**
 * Lowers the floor when the scope widens, so rows the narrower scope hid become offerable again.
 *
 * It reopens more than it needs to: the floor is one number for every category, so dropping it
 * also reopens rows in the categories that were readable all along, some of which were shown. The
 * shown ids are what stops those repeating, which is why they are not trimmed to the floor.
 */
function cursorForScope(
	cursor: InstanceContextCursor | null,
	scope: ActivityReadScope,
): InstanceContextCursor | null {
	if (cursor === null) return null;

	const widened = scope.categories.some(
		(category) => !cursor.activityCategories.includes(category),
	);
	if (!widened) return cursor;

	// Only the floor: keeping the mark, the shown ids and `runsThrough` stops the inventory and
	// the run window repeating for a change that says nothing about either.
	return { ...cursor, activityFloor: 0, activityCategories: scope.categories };
}

type RunSummary = {
	workflowId: string;
	workflowName: string;
	total: number;
	failed: number;
	lastStoppedAt: Date;
	lastFailedExecutionId: string | null;
};

/** What one caller may read: which projects, and which categories inside them. */
type ActivityReadScope = {
	projectIds: string[];
	categories: ActivityEventCategory[];
};

type Inventory = { total: number; workflows: Array<{ id: string; name: string; active: boolean }> };

/**
 * What a turn was handed, or why it was handed nothing.
 *
 * A bare `null` cannot answer that second half, and the difference is the whole point of
 * showing this to anyone: an agent that was told nothing because the feature was off did
 * not ignore anything, while one that was told nothing because there was nothing to tell
 * was working with all there was. Those read identically until the reason is carried.
 */
export type InstanceContextResult =
	| {
			state: 'injected';
			block: string;
			cursor: InstanceContextCursor;
			legs: InstanceContextLegs;
			/** An addition to a block this thread already saw, rather than a full window. */
			isUpdate: boolean;
	  }
	| { state: 'absent'; reason: InstanceContextAbsenceReason };

/**
 * Restates a build result as the shape the trace and telemetry both report, so neither
 * derives its own view of what the turn was handed.
 */
export function toContextInjection(result: InstanceContextResult): InstanceContextInjection {
	if (result.state === 'absent') return { state: 'absent', reason: result.reason };

	return {
		state: 'injected',
		isUpdate: result.isUpdate,
		legs: result.legs,
		chars: result.block.length,
	};
}

/**
 * Whether an outcome is worth a row in the trace. Only a turn that was handed something, plus a
 * read that broke: a row saying nothing was read is noise on every turn of a quiet project. Every
 * arm still reaches telemetry, which is where the comparison lives. Typed against the reason union
 * so a reason added later has to decide rather than default to untraced.
 */
const TRACED_ABSENCE_REASONS: Record<InstanceContextAbsenceReason, boolean> = {
	failed: true,
	empty: false,
	disabled: false,
	'machine-follow-up': false,
};

export function shouldTraceContextInjection(injection: InstanceContextInjection): boolean {
	return injection.state === 'injected' || TRACED_ABSENCE_REASONS[injection.reason];
}

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
		private readonly activityEventRepository: ActivityEventRepository,
		private readonly executionRepository: ExecutionRepository,
		private readonly workflowRepository: WorkflowRepository,
	) {
		this.logger = this.logger.scoped('instance-ai');
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
		projectId?: string;
		cursor: InstanceContextCursor | null;
		/**
		 * The agent continuing its own task — a checkpoint or a planned build — rather than a
		 * person saying something. Nobody is reading intent on those turns, so the block would be
		 * paid for unread. Checked before any read, so a skipped turn costs nothing.
		 */
		isMachineFollowUp?: boolean;
		/**
		 * The per-user rollout gate, already resolved by the caller. Passed in rather than
		 * read off config here so one turn resolves it once: a second read could disagree
		 * with the one that decided whether the `activity` tool exists, leaving the agent
		 * told about entries it has no way to open.
		 */
		enabled: boolean;
		now?: Date;
	}): Promise<InstanceContextResult> {
		if (!input.enabled) return { state: 'absent', reason: 'disabled' };
		if (input.isMachineFollowUp) return { state: 'absent', reason: 'machine-follow-up' };

		try {
			const now = input.now ?? new Date();
			const scope = await this.readableScope(input.user, input.projectId);
			const { projectIds } = scope;

			// Every leg is project-scoped, and a run has no acting user, so project is the only
			// boundary available. Nothing in scope means nothing to show, never something wider.
			if (projectIds.length === 0) return { state: 'absent', reason: 'empty' };

			const cursor = cursorForScope(input.cursor, scope);
			const isUpdate = cursor !== null;

			const [entries, runs, inventory] = await Promise.all([
				this.readEntries({ scope, cursor, now }),
				this.readRuns({ projectIds, cursor, now }),
				// Only on the opening block. A delta skips it: the estate has not changed in a way
				// the earlier block failed to cover.
				isUpdate
					? Promise.resolve(undefined)
					: this.workflowRepository.findRecentForProjects(projectIds, inventorySize),
			]);

			// An instance can hold plenty of work and have had nothing happen to it lately — a fresh
			// clone, or a quiet fortnight. That is exactly the case that most needs "here is what
			// exists", so the block stands on any one leg and only genuine emptiness suppresses it.
			if (entries.rows.length === 0 && runs.length === 0 && !inventory?.total) {
				return { state: 'absent', reason: 'empty' };
			}

			return {
				state: 'injected',
				isUpdate,
				block: renderBlock({
					entries: entries.rows.map((row) => toFeedEntry(row, input.user.id, now)),
					entriesTruncated: entries.truncated,
					runs,
					isUpdate,
					inventory,
					now,
				}),
				cursor: {
					activityMark: entries.mark,
					activityFloor: entries.floor,
					activityCategories: scope.categories,
					activitySeen: entries.seen,
					runsThrough: now.toISOString(),
				},
				// Counted from what was rendered, not from what was read: the caps and the age
				// filter both discard rows, so the fetched totals would overstate the block.
				legs: {
					inventory: inventory?.workflows.length ?? 0,
					events: entries.rows.length,
					runs: runs.length,
				},
			};
		} catch (error) {
			// Context is an enhancement; failing to build it must not fail the user's turn.
			// Reported as its own reason: neither `disabled` nor `empty` is true here, and
			// calling a broken read "nothing happened" would send someone debugging a bad
			// answer to look at a quiet instance rather than at this log line.
			this.logger.warn('Failed to build the instance-context block', { error });
			return { state: 'absent', reason: 'failed' };
		}
	}

	/** Backs `activity(action="list")` — the same log, without the window's caps. */
	async list(input: {
		user: User;
		projectId?: string;
		limit: number;
		category?: string;
		resourceId?: string;
		beforeId?: number;
	}): Promise<InstanceAiActivityEntry[]> {
		// A category the vocabulary does not hold matches nothing. Dropping the filter instead would
		// answer a narrowing request by widening it to the whole feed.
		if (input.category !== undefined && !isKnownCategory(input.category)) return [];

		const { projectIds, categories } = await this.readableScope(input.user, input.projectId);
		if (projectIds.length === 0) return [];

		// A category the caller may not read is refused rather than dropped, for the same reason
		// an unknown one is: answering a narrowing request by widening it is the wrong failure.
		if (input.category !== undefined && !categories.includes(input.category)) return [];

		const rows = await this.activityEventRepository.findFeed({
			limit: input.limit,
			projectIds,
			categories,
			...(input.category !== undefined ? { category: input.category } : {}),
			...(input.resourceId !== undefined ? { resourceId: input.resourceId } : {}),
			...(input.beforeId !== undefined ? { beforeId: input.beforeId } : {}),
		});
		return rows.map((row) => toActivityEntry(row, input.user.id));
	}

	/**
	 * Backs `activity(action="expand")`. Returns nothing for an entry outside the caller's scope,
	 * exactly as it does for one that was pruned — an id is a guess the agent may get wrong, and
	 * the two cases must be indistinguishable from outside.
	 */
	async expand(input: {
		id: number;
		user: User;
		projectId?: string;
	}): Promise<InstanceAiActivityExpansion | null> {
		const { projectIds, categories } = await this.readableScope(input.user, input.projectId);
		if (projectIds.length === 0) return null;

		const row = await this.activityEventRepository.findEntry({
			id: input.id,
			projectIds,
			categories,
		});
		if (!row) return null;

		const history =
			row.resourceType && row.resourceId
				? await this.activityEventRepository.findByResource({
						resourceType: row.resourceType,
						resourceId: row.resourceId,
						projectIds,
						limit: resourceHistoryLimit,
					})
				: [];

		const hint = liveRecordHint(row);

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
		scope: ActivityReadScope;
		cursor: InstanceContextCursor | null;
		now: Date;
	}): Promise<{
		rows: ActivityEvent[];
		mark: number;
		floor: number;
		seen: number[];
		truncated: boolean;
	}> {
		// Newest first, and on a delta only what arrived above the mark.
		let arrivals = await this.activityEventRepository.findFeed({
			limit: entryFetchLimit,
			...input.scope,
			...(input.cursor ? { afterId: input.cursor.activityMark } : {}),
		});

		// Read separately from the arrivals above: one capped query would let a busy turn fill the
		// page and push the late commit out.
		//
		// Limited by `seenIdsCap`, not by `entryFetchLimit`: the band is newest-first, so a
		// smaller limit drops its oldest end — exactly where a late commit's low id sits. Turns
		// that cut nothing leave the floor put while the mark runs on, so the band spans far more
		// ids than one window. Reading it to the de-duplication budget is the widest this can go
		// and still promise not to repeat: past `seenIdsCap` the shown ids are forgotten, and a
		// re-read would offer them a second time. A commit later than that many rows is lost, and
		// that is the price of the budget rather than an oversight.
		let cursor = input.cursor;
		const band = cursor
			? await this.activityEventRepository.findFeed({
					limit: seenIdsCap,
					...input.scope,
					afterId: cursor.activityFloor,
					beforeId: cursor.activityMark,
				})
			: [];

		// A mark can outlive the id space it was taken from. `ActivityEvent.id` is a rowid alias on
		// SQLite, so emptying the table — which age-based retention does to an instance quiet for
		// longer than its window — restarts the sequence, and the rows written next land at or
		// below a mark a live thread still holds. Neither leg can reach them: arrivals start above
		// the mark, and the band stops below it.
		//
		// Both legs coming back empty is the signature, and the timestamp is what makes it one. By
		// id alone a renumbered feed and a quiet one are identical, so the question asked here is
		// "is the newest row newer than the last block?" rather than "is its id lower?". That also
		// keeps the two cases this must not fire on out of it: a narrowed scope still sees its own
		// older rows, and a late commit inside the band leaves the band non-empty.
		if (cursor !== null && arrivals.length === 0 && band.length === 0) {
			const newest = await this.activityEventRepository.findNewestEntry(input.scope);
			if (newest && newest.createdAt.getTime() > Date.parse(cursor.runsThrough)) {
				// Only the id-based bounds. `runsThrough` is a timestamp and the inventory does not
				// depend on ids, so the rest of the block stays a delta rather than repeating a
				// week of run summaries over a renumbering the reader never saw. The shown ids go
				// with the mark: they name rows from the old sequence, and holding them would
				// suppress new rows that reuse those numbers.
				cursor = null;
				arrivals = await this.activityEventRepository.findFeed({
					limit: entryFetchLimit,
					...input.scope,
				});
			}
		}

		// Both are newest-first and every arrival outranks every band row, so this stays ordered.
		const rows = [...arrivals, ...band];

		const alreadyShown = new Set(cursor?.activitySeen ?? []);
		const fresh = rows.filter(
			(row) =>
				!alreadyShown.has(row.id) && input.now.getTime() - row.createdAt.getTime() <= maxAgeMs,
		);

		const shown = fresh.slice(0, windowSize);
		const mark = rows.reduce(
			(highest, row) => Math.max(highest, row.id),
			cursor?.activityMark ?? 0,
		);
		// The highest row this turn cut — newest-first, so it is the first past the window. A turn
		// that cut nothing keeps its inherited floor.
		const cut = fresh[windowSize];
		const floor = cut ? cut.id : (cursor?.activityFloor ?? 0);

		// What was shown, not what was read. Deliberately not trimmed to the floor: the floor only
		// excludes rows while it stays where it is, and `cursorForScope` lowers it when the scope
		// widens — so ids dropped for sitting below it would come back offerable, having already
		// been shown. The cap is the one authority on what a delta remembers.
		//
		// Keeping them is close to free: the sort is descending, so a below-floor id is always
		// evicted before an above-floor one and can only occupy a slot the cap was not using.
		const seen = [...alreadyShown, ...shown.map((row) => row.id)]
			.sort((a, b) => b - a)
			.slice(0, seenIdsCap);

		return {
			rows: shown,
			mark,
			floor,
			seen,
			// Said out loud rather than left to inference. A cut list that does not say it is cut
			// reads as the whole story, and the agent would draw conclusions from it.
			truncated: fresh.length > windowSize || arrivals.length === entryFetchLimit,
		};
	}

	private async readRuns(input: {
		projectIds: string[];
		cursor: InstanceContextCursor | null;
		now: Date;
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
		});
	}

	/**
	 * The one project this reader may see: the conversation's own, which the thread is bound to
	 * and which was authorised when the thread was created. A conversation without one reads
	 * nothing.
	 *
	 * Deliberately not "every project the user belongs to". That would be a second scoping path
	 * beside `SharedWorkflowRepository.buildSharedWorkflowIdsSubquery`, which the rest of the
	 * codebase reads through, and a second path is the likeliest thing here to drift into a leak.
	 * Bare project membership is also not read access — `project:chatUser` holds neither
	 * `workflow:read` nor `credential:read`.
	 */
	private async readableScope(user: User, projectId?: string): Promise<ActivityReadScope> {
		if (projectId === undefined) return { projectIds: [], categories: [] };

		// Re-checked every turn, not trusted from the binding. A thread outlives the membership that
		// authorised it — `assertThreadAccess` proves the thread is the caller's own and nothing more
		// — so a user removed from a project would otherwise keep reading it here for the life of the
		// thread, while every other read in this module refused them.
		//
		// Asked separately because a project grants the two independently: a role without
		// `credential:read` must not read a credential's name and type here.
		const [workflows, credentials] = await Promise.all([
			userHasScopes(user, ['workflow:read'], false, { projectId }),
			userHasScopes(user, ['credential:read'], false, { projectId }),
		]);
		if (!workflows) return { projectIds: [], categories: [] };

		return {
			projectIds: [projectId],
			categories: credentials ? ['workflow', 'credential'] : ['workflow'],
		};
	}
}

const initialPreamble = [
	'What is going on in this project. Every section below is this project alone, not the whole',
	'instance. This is work that already exists and that you can pick up:',
	'when the user is vague ("fix it", "carry on", "what should I look at"), the answer is usually',
	'the most recent thing here, and often the most recent failure. Name what you think they mean',
	'and act on it rather than asking them to choose from a list they can already see.',
	'Do not narrate this back to them — unless they asked what has been happening, let it change',
	'what you do rather than what you say.',
	'Call `activity(action="expand", id=N)` on a bracketed id to see that entry in full along with',
	'everything else that happened to the same resource, or `activity(action="list")` to look',
	'further back than this window. An entry may name a resource that was since deleted, or that',
	'moved to another project — the entry records where the work happened, so it stays here.',
];

/**
 * An update says so explicitly. Without that, a two-entry delta reads as though nothing else ever
 * happened, and the agent would draw conclusions from a list it was never given in full.
 */
const updatePreamble = [
	'What has happened since the list earlier in this conversation. Those earlier entries still',
	'stand — these are additions, not a replacement. Read them the same way: context on what the',
	'user has been doing, not a task list or something to comment on unprompted.',
	'`activity(action="expand", id=N)` and `activity(action="list")` work on these ids too.',
];

/** Named so the agent can act on one without a lookup: the id is what every tool takes. */
function renderInventory(inventory: Inventory): string[] {
	// Names the scope, and states what is there now rather than what was never written: an empty
	// inventory always sits above a leg that does show work.
	if (inventory.total === 0) return ['Workflows in this project: none right now.', ''];

	const named = inventory.workflows.map(
		(workflow) =>
			`  - "${sanitiseForBlock(workflow.name)}" (workflow:${workflow.id})${
				workflow.active ? ' [published]' : ''
			}`,
	);
	const more = inventory.total - inventory.workflows.length;

	return [
		`Workflows in this project: ${inventory.total}. Most recently worked on:`,
		...named,
		...(more > 0 ? [`  ... and ${more} more — \`workflows(action="list")\` for the rest.`] : []),
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
}): string {
	const prose = [
		...(input.isUpdate ? updatePreamble : initialPreamble),
		'',
		...(input.inventory ? renderInventory(input.inventory) : []),
		...renderRuns(input.runs, input.isUpdate, input.now),
		...(input.entries.length > 0
			? [
					input.isUpdate ? 'Changes since then:' : 'What changed recently:',
					...input.entries,
					...(input.entriesTruncated
						? ['  ... and more than these — `activity(action="list")` for the rest.']
						: []),
				]
			: []),
	].join('\n');

	return `${INSTANCE_CONTEXT_OPEN_TAG}\n${prose}\n${INSTANCE_CONTEXT_CLOSE_TAG}`;
}

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
 */
function liveRecordHint(row: ActivityEvent): string | undefined {
	const resourceTypeHints: Record<ActivityResourceType, string | undefined> = {
		workflow: row.resourceId
			? `workflows(action="get", workflowId="${row.resourceId}")`
			: undefined,
		credential: 'credentials(action="list")',
	};

	return row.resourceType ? resourceTypeHints[row.resourceType] : undefined;
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
