import { Logger } from '@n8n/backend-common';
import { GlobalConfig } from '@n8n/config';
import { Time } from '@n8n/constants';
import {
	ActivityEventRepository,
	activityEventCategories,
	ExecutionRepository,
	WorkflowRepository,
} from '@n8n/db';
import type { ActivityEvent, ActivityEventCategory, ActivityResourceType } from '@n8n/db';
import { Service } from '@n8n/di';
import { isRecord } from '@n8n/utils/is-record';
import type { InstanceAiActivityEntry, InstanceAiActivityExpansion } from '@n8n/instance-ai';
import type { IDataObject } from 'n8n-workflow';

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
 * How far back a delta re-reads runs. Absorbs clock skew between writers and the gap between a
 * run finishing and its row committing.
 */
const runLagMs = 2 * Time.minutes.toMilliseconds;

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
		userId: string;
		projectId?: string;
		cursor: InstanceContextCursor | null;
		/**
		 * The agent continuing its own task — a checkpoint or a planned build — rather than a
		 * person saying something. Nobody is reading intent on those turns, so the block would be
		 * paid for unread. Checked before any read, so a skipped turn costs nothing.
		 */
		isMachineFollowUp?: boolean;
		now?: Date;
	}): Promise<InstanceContextBlock | null> {
		if (!this.enabled || input.isMachineFollowUp) return null;

		try {
			const now = input.now ?? new Date();
			const isUpdate = input.cursor !== null;
			const projectIds = this.visibleProjectIds(input.projectId);

			// Every leg is project-scoped, and a run has no acting user, so project is the only
			// boundary available. Nothing in scope means nothing to show, never something wider.
			if (projectIds.length === 0) return null;

			const [entries, runs, inventory] = await Promise.all([
				this.readEntries({ projectIds, cursor: input.cursor, now }),
				this.readRuns({ projectIds, cursor: input.cursor, now }),
				// Only on the opening block. A delta skips it: the estate has not changed in a way
				// the earlier block failed to cover.
				isUpdate
					? Promise.resolve(undefined)
					: this.workflowRepository.findRecentForProjects(projectIds, inventorySize),
			]);

			// An instance can hold plenty of work and have had nothing happen to it lately — a fresh
			// clone, or a quiet fortnight. That is exactly the case that most needs "here is what
			// exists", so the block stands on any one leg and only genuine emptiness suppresses it.
			if (entries.rows.length === 0 && runs.length === 0 && !inventory?.total) return null;

			return {
				block: renderBlock({
					entries: entries.rows.map((row) => toFeedEntry(row, input.userId, now)),
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

	/** Backs `activity(action="list")` — the same log, without the window's caps. */
	async list(input: {
		userId: string;
		projectId?: string;
		limit: number;
		category?: string;
		resourceId?: string;
		beforeId?: number;
	}): Promise<InstanceAiActivityEntry[]> {
		// A category the vocabulary does not hold matches nothing. Dropping the filter instead would
		// answer a narrowing request by widening it to the whole feed.
		if (input.category !== undefined && !isKnownCategory(input.category)) return [];

		const projectIds = this.visibleProjectIds(input.projectId);
		const rows = await this.activityEventRepository.findFeed({
			limit: input.limit,
			projectIds,
			...(input.category !== undefined ? { category: input.category } : {}),
			...(input.resourceId !== undefined ? { resourceId: input.resourceId } : {}),
			...(input.beforeId !== undefined ? { beforeId: input.beforeId } : {}),
		});
		return rows.map((row) => toActivityEntry(row, input.userId));
	}

	/**
	 * Backs `activity(action="expand")`. Returns nothing for an entry outside the caller's scope,
	 * exactly as it does for one that was pruned — an id is a guess the agent may get wrong, and
	 * the two cases must be indistinguishable from outside.
	 */
	async expand(input: {
		id: number;
		userId: string;
		projectId?: string;
	}): Promise<InstanceAiActivityExpansion | null> {
		const projectIds = this.visibleProjectIds(input.projectId);
		const row = await this.activityEventRepository.findEntry({ id: input.id, projectIds });
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
			entry: toActivityEntry(row, input.userId),
			resourceHistory: history
				.filter((other) => other.id !== row.id)
				.map((other) => toActivityEntry(other, input.userId)),
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
		projectIds: string[];
		cursor: InstanceContextCursor | null;
		now: Date;
	}): Promise<{ rows: ActivityEvent[]; mark: number; seen: number[]; truncated: boolean }> {
		const cursor = input.cursor;
		const floor = cursor ? Math.max(0, cursor.activityMark - activityLagIds) : undefined;

		const rows = await this.activityEventRepository.findFeed({
			limit: entryFetchLimit,
			projectIds: input.projectIds,
			...(floor !== undefined ? { afterId: floor } : {}),
		});

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
			truncated: fresh.length > windowSize || rows.length === entryFetchLimit,
		};
	}

	private async readRuns(input: {
		projectIds: string[];
		cursor: InstanceContextCursor | null;
		now: Date;
	}): Promise<RunSummary[]> {
		const stoppedAfter = input.cursor
			? new Date(Date.parse(input.cursor.runsThrough) - runLagMs)
			: new Date(input.now.getTime() - maxAgeMs);

		return await this.executionRepository.summariseRunsForProjects({
			projectIds: input.projectIds,
			stoppedAfter,
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
	private visibleProjectIds(projectId?: string): string[] {
		return projectId === undefined ? [] : [projectId];
	}
}

const initialPreamble = [
	'What is going on in this instance. This is work that already exists and that you can pick up:',
	'when the user is vague ("fix it", "carry on", "what should I look at"), the answer is usually',
	'the most recent thing here, and often the most recent failure. Name what you think they mean',
	'and act on it rather than asking them to choose from a list they can already see.',
	'Do not narrate this back to them — unless they asked what has been happening, let it change',
	'what you do rather than what you say.',
	'Call `activity(action="expand", id=N)` on a bracketed id to see that entry in full along with',
	'everything else that happened to the same resource, or `activity(action="list")` to look',
	'further back than this window. An entry may name a resource that no longer exists.',
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
