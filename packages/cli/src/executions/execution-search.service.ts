import type { ExecutionSearchMatch, ExecutionSearchPage } from '@n8n/api-types';
import { ExecutionRedactionServiceProxy, isRedactableExecution } from '@n8n/backend-services';
import { ExecutionsConfig } from '@n8n/config';
import type { ExecutionSummaries, User } from '@n8n/db';
import { ExecutionRepository } from '@n8n/db';
import { Service } from '@n8n/di';
import { TooManyRequestsError } from '@n8n/errors';
import type { ExecutionSummary } from 'n8n-workflow';

import { encodeExecutionCursor, type ExecutionCursor } from './execution-cursor';
import { CorruptedExecutionDataError } from './execution-data/corrupted-execution-data.error';
import { MissingExecutionDataError } from './execution-data/missing-execution-data.error';
import type { DataFragment } from './execution-data/types';
import { ExecutionPersistence } from './execution-persistence';
import {
	findSearchMatch,
	toAsciiLowerCase,
	type ExecutionSearchCriteria,
} from './execution-search-match';

type Candidate = ExecutionSummaries.SearchCandidate;

/** The time that one request can use to search. The editor continues with the cursor. */
const TIME_BUDGET_MS = 3000;

/**
 * A scan holds a database connection while the database compares text, and the default
 * Postgres pool has two connections. One scan for each process keeps the other free.
 */
const MAX_CONCURRENT_SCANS = 1;

const CANDIDATE_PAGE_SIZE = 500;

/** The size that we assume for an execution from before n8n recorded `jsonSizeBytes`. */
const UNKNOWN_SIZE_BYTES = 256 * 1024;

/**
 * Limits of the group of executions that one filter step examines. The time check
 * runs between steps, so these limits bound how far a request can exceed its time.
 * A blob step reads each bundle into memory, so its limits are lower.
 */
const DB_CHUNK = { rows: 500, bytes: 64 * 1024 * 1024 };
const BLOB_CHUNK = { rows: 25, bytes: 32 * 1024 * 1024 };

/**
 * Finds executions by the data of their nodes. No index of this data exists, so the
 * search reads the stored run data from the newest execution to the oldest, one
 * time-limited step for each request.
 */
@Service()
export class ExecutionSearchService {
	private activeScans = 0;

	constructor(
		private readonly executionRepository: ExecutionRepository,
		private readonly executionPersistence: ExecutionPersistence,
		private readonly executionRedactionServiceProxy: ExecutionRedactionServiceProxy,
		private readonly executionsConfig: ExecutionsConfig,
	) {}

	/**
	 * Search the executions that satisfy `query`, from the cursor position down, until
	 * there are `query.range.limit` matches, the time is up, or no executions remain.
	 *
	 * @param query Must carry the user and the sharing options. They limit the search
	 * to executions that the user can read.
	 */
	async search(
		query: ExecutionSummaries.RangeQuery,
		criteria: ExecutionSearchCriteria,
		cursor?: ExecutionCursor,
	): Promise<ExecutionSearchPage<ExecutionSummary>> {
		const { user } = query;
		if (!user) return { results: [], nextCursor: null, searchedCount: 0, searchedBackTo: null };

		if (this.activeScans >= MAX_CONCURRENT_SCANS) {
			throw new TooManyRequestsError('Another search is in progress. Try again in a moment.');
		}

		this.activeScans++;
		try {
			return await this.scan(query, criteria, user, cursor);
		} finally {
			this.activeScans--;
		}
	}

	private async scan(
		query: ExecutionSummaries.RangeQuery,
		criteria: ExecutionSearchCriteria,
		user: User,
		cursor?: ExecutionCursor,
	): Promise<ExecutionSearchPage<ExecutionSummary>> {
		const deadline = Date.now() + TIME_BUDGET_MS;
		const { limit } = query.range;
		const fragments = this.toFragments(criteria);
		const matches = new Map<string, ExecutionSearchMatch>();

		let page: Candidate[] = [];
		let last: Candidate | undefined;
		let beforeId = cursor?.v1?.id;
		let searchedCount = 0;

		scan: for (;;) {
			// Newest first by ID: an ID is a stable position, the start time is not.
			page = await this.executionRepository.findSearchCandidates({
				...query,
				order: undefined,
				range: { limit: CANDIDATE_PAGE_SIZE, beforeId },
			});

			for (const chunk of this.toChunks(page)) {
				const hits = await this.executionPersistence.findIdsWithDataContaining(
					chunk.map(({ id, workflowId, storedAt }) => ({ executionId: id, workflowId, storedAt })),
					fragments,
				);

				for (const candidate of chunk) {
					if (hits.has(candidate.id)) {
						// To examine a hit is the slow part. Stop before it when the time is up, but
						// not before the first execution, or a slow instance never moves on.
						if (searchedCount > 0 && Date.now() >= deadline) break scan;

						const match = await this.examine(candidate, criteria, user);
						if (match) matches.set(candidate.id, match);
					}

					last = candidate;
					searchedCount++;
					if (matches.size >= limit) break scan;
				}

				if (Date.now() >= deadline) break scan;
			}

			if (page.length < CANDIDATE_PAGE_SIZE) break;
			beforeId = last?.id;
		}

		// The history ends in a page that is not full. The search is complete when it
		// also examined the last execution of that page.
		const lastOfPage = page.at(-1);
		const reachedEnd =
			page.length < CANDIDATE_PAGE_SIZE && (!lastOfPage || lastOfPage.id === last?.id);

		const summaries = await this.executionRepository.findSummariesByIds(query, [...matches.keys()]);

		return {
			results: summaries.flatMap((summary) => {
				const match = matches.get(summary.id);
				return match ? [{ ...summary, match }] : [];
			}),
			nextCursor:
				reachedEnd || !last
					? null
					: encodeExecutionCursor({ version: 1, v1: { id: last.id, timestamp: last.startedAt } }),
			searchedCount,
			searchedBackTo: last?.startedAt ?? null,
		};
	}

	/**
	 * The search as text fragments of the stored JSON. Every execution that matches the
	 * search contains them all, but not the reverse: the stored JSON also holds data that
	 * the search ignores or that redaction removes.
	 */
	private toFragments({ text, nodeName }: ExecutionSearchCriteria): DataFragment[] {
		const fragments: DataFragment[] = [];

		// Run data is an object keyed by node name, so a node that ran is a key in the JSON.
		if (nodeName !== undefined) {
			fragments.push({ text: `${JSON.stringify(nodeName)}:`, ignoreAsciiCase: false });
		}
		if (text !== undefined) {
			const escaped = JSON.stringify(text).slice(1, -1);
			fragments.push({ text: toAsciiLowerCase(escaped), ignoreAsciiCase: true });
		}

		return fragments;
	}

	/** Split a page into groups for the filter step. The sequence of the executions does not change. */
	private toChunks(page: Candidate[]): Candidate[][] {
		const chunks: Candidate[][] = [];
		let chunk: Candidate[] = [];
		let bytes = 0;

		for (const candidate of page) {
			const limits = candidate.storedAt === 'db' ? DB_CHUNK : BLOB_CHUNK;
			const size = candidate.jsonSizeBytes || UNKNOWN_SIZE_BYTES;
			const isFull =
				chunk.length > 0 &&
				((chunk[0].storedAt === 'db') !== (candidate.storedAt === 'db') ||
					chunk.length >= limits.rows ||
					bytes + size > limits.bytes);

			if (isFull) {
				chunks.push(chunk);
				chunk = [];
				bytes = 0;
			}
			chunk.push(candidate);
			bytes += size;
		}
		if (chunk.length > 0) chunks.push(chunk);

		return chunks;
	}

	/**
	 * Load an execution as its reader sees it and find the match in it. The search must
	 * not match data that redaction hides from this user.
	 */
	private async examine(
		candidate: Candidate,
		criteria: ExecutionSearchCriteria,
		user: User,
	): Promise<ExecutionSearchMatch | undefined> {
		let execution;
		try {
			execution = await this.executionPersistence.findOneInWorkflows(
				candidate.id,
				[candidate.workflowId],
				{ includeAnnotation: false, maxDataSizeBytes: this.executionsConfig.maxDisplaySize },
			);
		} catch (error) {
			if (
				error instanceof MissingExecutionDataError ||
				error instanceof CorruptedExecutionDataError
			) {
				return undefined;
			}
			throw error;
		}

		if (!execution || !isRedactableExecution(execution) || !execution.data) return undefined;

		const visible = await this.executionRedactionServiceProxy.processExecution(execution, { user });

		const match = findSearchMatch(visible.data.resultData?.runData, criteria);
		if (!match) return undefined;

		const nodeId = execution.workflowData.nodes?.find((node) => node.name === match.nodeName)?.id;

		return nodeId ? { ...match, nodeId } : match;
	}
}
