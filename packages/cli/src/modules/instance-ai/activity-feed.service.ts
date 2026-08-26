import { Logger } from '@n8n/backend-common';
import { GlobalConfig } from '@n8n/config';
import { Time } from '@n8n/constants';
import { ActivityEventRepository } from '@n8n/db';
import type { ActivityEvent, ActivityEventCategory } from '@n8n/db';
import { Service } from '@n8n/di';
import type { IDataObject } from 'n8n-workflow';

import { RECENT_ACTIVITY_CLOSE_TAG, RECENT_ACTIVITY_OPEN_TAG } from './internal-messages';

/** Rows the agent sees. Wide enough to show a working session, narrow enough to stay skimmable. */
const windowSize = 40;

/** Collapsing folds many rows into one, so the read has to start with more than it will show. */
const fetchMultiplier = 4;

/** Older than this is history, not context — and the agent has tools for history. */
const maxAgeMs = 7 * Time.days.toMilliseconds;

/**
 * Distinct workflows whose runs may appear. Runs are collapsed per workflow first, so this caps
 * breadth, not repetition: without it a busy instance's schedules crowd out every edit the user
 * made, which is the signal actually worth carrying.
 */
const runEntryCap = 12;

/**
 * Thread-metadata key holding the highest entry id this thread has been shown. Stored per thread
 * rather than per user: two conversations opened side by side each need their own feed.
 */
export const LAST_INJECTED_ACTIVITY_ID = 'lastInjectedActivityId';

/** Tolerant by design — a thread predating the feed, or written by an older shape, starts over. */
export function readLastInjectedActivityId(metadata: Record<string, unknown> | undefined): number {
	const value = metadata?.[LAST_INJECTED_ACTIVITY_ID];
	return typeof value === 'number' && Number.isFinite(value) ? value : 0;
}

type FeedEntry = {
	/** Sort key and stable reference — the same id a later expand call will take. */
	id: number;
	category: ActivityEventCategory;
	line: string;
};

export type ActivityFeedBlock = {
	block: string;
	/** Highest id included, for the caller to store as the thread's high-water mark. */
	newestId: number;
};

/**
 * Renders recent instance activity as a context block for the agent.
 *
 * Deliberately returns nothing rather than an empty feed: a block saying "nothing happened" is
 * pure cost, and worse, invites the agent to comment on it.
 */
@Service()
export class ActivityFeedService {
	constructor(
		private readonly logger: Logger,
		private readonly globalConfig: GlobalConfig,
		private readonly activityEventRepository: ActivityEventRepository,
	) {
		this.logger = this.logger.scoped('instance-ai');
	}

	/**
	 * `sinceId` is the highest entry this thread was already shown. Nothing newer means nothing to
	 * say — the previous block is still in the conversation, so re-sending it would pay for the
	 * same context twice.
	 */
	async buildBlock(input: {
		userId: string;
		projectId?: string;
		sinceId: number;
		now?: Date;
	}): Promise<ActivityFeedBlock | null> {
		if (!this.globalConfig.instanceAi.activityLogEnabled) return null;

		try {
			// A thread that has seen a feed before gets only what is new. Re-sending the window
			// would leave two overlapping blocks in the conversation, and the older one's counts are
			// by then wrong — "ran 3×, all succeeded" sitting above "ran 40×, 2 failed" for the same
			// workflow is worse than no second block at all. With a delta, each entry appears once.
			const isUpdate = input.sinceId > 0;
			const rows = await this.activityEventRepository.findFeed({
				limit: windowSize * fetchMultiplier,
				...(input.projectId !== undefined ? { projectId: input.projectId } : {}),
				...(isUpdate ? { afterId: input.sinceId } : {}),
			});
			if (rows.length === 0) return null;

			const newestId = rows[0].id;
			const now = input.now ?? new Date();
			const fresh = rows.filter((row) => now.getTime() - row.createdAt.getTime() <= maxAgeMs);
			if (fresh.length === 0) return null;

			const entries = capRunEntries(collapseRuns(fresh, input.userId, now)).slice(0, windowSize);
			if (entries.length === 0) return null;

			return { block: renderBlock(entries, isUpdate), newestId };
		} catch (error) {
			// Context is an enhancement; failing to build it must not fail the user's turn.
			this.logger.debug('Failed to build the recent-activity block', { error });
			return null;
		}
	}
}

/**
 * Runs of the same workflow fold into one entry, wherever they sit in the window rather than only
 * when adjacent: two schedules on different intervals interleave, so adjacency-only collapsing
 * would leave both expanded. The folded entry takes the position of its most recent run, which is
 * where a reader expects to find it.
 */
function collapseRuns(rows: ActivityEvent[], currentUserId: string, now: Date): FeedEntry[] {
	const entries: FeedEntry[] = [];
	const runGroups = new Map<string, ActivityEvent[]>();

	for (const row of rows) {
		if (!isRun(row) || !row.resourceId) {
			entries.push(toEntry(row, currentUserId, now));
			continue;
		}
		const key = `${row.category}:${row.resourceId}`;
		const group = runGroups.get(key) ?? [];
		group.push(row);
		runGroups.set(key, group);
	}

	for (const group of runGroups.values()) {
		entries.push(
			group.length === 1 ? toEntry(group[0], currentUserId, now) : toCollapsedRunEntry(group, now),
		);
	}

	return entries.sort((a, b) => b.id - a.id);
}

function capRunEntries(entries: FeedEntry[]): FeedEntry[] {
	let runsKept = 0;
	return entries.filter((entry) => {
		if (entry.category !== 'execution' && entry.category !== 'eval') return true;
		runsKept += 1;
		return runsKept <= runEntryCap;
	});
}

const initialPreamble = [
	'Recent activity on this instance, newest first. Use it to understand what the user has been',
	'working on and what they are likely to mean — not as a task list, and not as something to',
	'comment on unprompted. The bracketed number is a stable id for the entry; the parenthesised',
	'ids are the resources themselves. An entry may refer to a resource that no longer exists.',
];

/**
 * An update says so explicitly. Without that, a two-entry delta reads as though nothing else ever
 * happened, and the agent would draw conclusions from a list it was never given in full.
 */
const updatePreamble = [
	'Activity since the list earlier in this conversation, newest first. Those earlier entries',
	'still stand — these are additions, not a replacement. Read them the same way: context on what',
	'the user has been doing, not a task list or something to comment on unprompted.',
];

function renderBlock(entries: FeedEntry[], isUpdate: boolean): string {
	const prose = [
		...(isUpdate ? updatePreamble : initialPreamble),
		'',
		...entries.map((entry) => entry.line),
	].join('\n');

	return `${RECENT_ACTIVITY_OPEN_TAG}\n${prose}\n${RECENT_ACTIVITY_CLOSE_TAG}`;
}

function isRun(row: ActivityEvent): boolean {
	return row.category === 'execution' || row.category === 'eval';
}

function toEntry(row: ActivityEvent, currentUserId: string, now: Date): FeedEntry {
	const parts = [
		`[${row.id}]`,
		formatAge(row.createdAt, now),
		row.category,
		row.action,
		formatResource(row),
		formatDetail(row),
		row.userId && row.userId !== currentUserId ? 'by another user' : '',
	].filter(Boolean);

	return { id: row.id, category: row.category, line: parts.join(' · ') };
}

/**
 * The count is the point: "ran 43 times, 2 failed" is a different situation from "failed", and
 * only the totals distinguish a workflow that is broken from one that is merely busy.
 */
function toCollapsedRunEntry(group: ActivityEvent[], now: Date): FeedEntry {
	const newest = group[0];
	const failures = group.filter((row) => row.action === 'failed');
	const summary =
		failures.length === 0
			? `ran ${group.length}×, all succeeded`
			: `ran ${group.length}×, ${failures.length} failed`;
	const failedNode = failures.length > 0 ? formatDetail(failures[0]) : '';

	const parts = [
		`[${newest.id}]`,
		formatAge(newest.createdAt, now),
		newest.category,
		summary,
		formatResource(newest),
		failedNode,
	].filter(Boolean);

	return { id: newest.id, category: newest.category, line: parts.join(' · ') };
}

function formatResource(row: ActivityEvent): string {
	if (!row.resourceId) return '';
	const name = row.resourceName ? `"${row.resourceName}" ` : '';
	return `${name}(${row.resourceType ?? 'resource'}:${row.resourceId})`;
}

/** One clause at most: whatever about this entry would otherwise need an expand call to learn. */
function formatDetail(row: ActivityEvent): string {
	const data = row.data ?? {};

	const failedNode = readString(data, 'failedNode');
	if (failedNode) return `failed at "${failedNode}"`;

	const versionName = readString(data, 'versionName');
	if (versionName) return `version "${versionName}"`;

	const nodeDelta = readNumber(data, 'nodeDelta');
	if (nodeDelta !== undefined && nodeDelta !== 0) {
		const nodes = Math.abs(nodeDelta) === 1 ? 'node' : 'nodes';
		return `${nodeDelta > 0 ? '+' : '−'}${Math.abs(nodeDelta)} ${nodes}`;
	}

	const nodeCount = readNumber(data, 'nodeCount');
	if (nodeCount !== undefined) return `${nodeCount} nodes`;

	return '';
}

/** Compact on purpose: every row pays for its own width, and the agent only needs the ordering. */
function formatAge(createdAt: Date, now: Date): string {
	const elapsed = Math.max(0, now.getTime() - createdAt.getTime());
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

function readNumber(data: IDataObject, key: string): number | undefined {
	const value = data[key];
	return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
}
