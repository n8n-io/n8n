import type {
	OperatorLogFilter,
	OperatorLogRecord,
	OperatorLogSearchHost,
	OperatorLogSearchResult,
} from '@n8n/api-types';
import { Logger } from '@n8n/backend-common';
import { ExecutionsConfig } from '@n8n/config';
import { OnPubSubEvent, OnShutdown } from '@n8n/decorators';
import { Service } from '@n8n/di';
import { randomUUID } from 'node:crypto';
import { InstanceSettings } from 'n8n-core';

import { Publisher } from '@/scaling/pubsub/publisher.service';

import { OperatorConsoleConfig } from '../operator-console.config';
import {
	DEFAULT_SEARCH_TIMEOUT_MS,
	OPERATOR_CONSOLE_SCOPE,
	SEARCH_RESPONSE_MAX_BYTES,
} from '../operator-console.constants';
import { capRecords } from '../producer/search-responder.service';
import { LogFileSource } from '../sources/log-file.source';

export type DistributedSearchOptions = {
	filter: OperatorLogFilter;
	/** Max records in the merged result, and the per-host cap on the way there. */
	limit: number;
	/** How long to wait for the slowest host. Defaults to 3s. */
	timeoutMs?: number;
	/**
	 * Hosts the caller believes exist, typically from `LogSource.hosts()`. Used
	 * for two things: resolving as soon as everyone has answered rather than
	 * always burning the full deadline, and naming who did not answer.
	 */
	expectedHostIds?: string[];
};

type HostAnswer = OperatorLogSearchHost & { records: OperatorLogRecord[] };

type PendingSearch = {
	answers: Map<string, HostAnswer>;
	/** Hosts still owed an answer. Emptied means we can stop waiting. */
	awaiting: Set<string>;
	settle: () => void;
};

/**
 * Distributed grep over deep history: every host searches its own rotated
 * `n8n.log` and the requesting main merges the answers.
 *
 * Mains only. Outside queue mode this is not a degraded path — it is the same
 * feature with one host, and it returns the same shape without touching Redis.
 */
@Service()
export class DistributedSearchService {
	private readonly isQueueMode: boolean;

	/** In-flight searches this main started, by request id. */
	private readonly pending = new Map<string, PendingSearch>();

	constructor(
		private readonly logger: Logger,
		private readonly instanceSettings: InstanceSettings,
		private readonly publisher: Publisher,
		private readonly config: OperatorConsoleConfig,
		private readonly history: LogFileSource,
		executionsConfig: ExecutionsConfig,
	) {
		this.logger = this.logger.scoped(OPERATOR_CONSOLE_SCOPE);
		this.isQueueMode = executionsConfig.mode === 'queue';
	}

	async search(options: DistributedSearchOptions): Promise<OperatorLogSearchResult> {
		const { filter, limit, timeoutMs = DEFAULT_SEARCH_TIMEOUT_MS, expectedHostIds = [] } = options;

		// Run our own search first: we never receive our own command, and doing it
		// up front overlaps it with the other hosts' round trip.
		const answers = new Map<string, HostAnswer>();
		const local = await this.searchLocally(filter, limit);
		answers.set(local.hostId, local);

		if (!this.isQueueMode) return this.merge(answers, [], limit);

		const awaiting = new Set(expectedHostIds.filter((hostId) => hostId !== local.hostId));

		await this.fanOut({ filter, limit, timeoutMs, answers, awaiting });

		return this.merge(answers, [...awaiting], limit);
	}

	@OnPubSubEvent('response-to-search-logs', { instanceType: 'main' })
	handleSearchResponse(payload: {
		requestId: string;
		hostId: string;
		records: OperatorLogRecord[];
		truncated: boolean;
	}) {
		const search = this.pending.get(payload.requestId);

		// Every main sees every answer, so an unknown id is either a sibling main's
		// search or one of ours that already settled. Both are non-events.
		if (!search) return;

		search.answers.set(payload.hostId, {
			hostId: payload.hostId,
			matched: payload.records.length,
			truncated: payload.truncated,
			records: payload.records,
		});

		search.awaiting.delete(payload.hostId);

		// Nothing left to wait for — don't spend the rest of the deadline.
		if (search.awaiting.size === 0) search.settle();
	}

	@OnShutdown()
	shutdown() {
		for (const search of [...this.pending.values()]) search.settle();
	}

	// #region Internals

	/**
	 * Broadcast the search and collect answers until everyone we expected has
	 * replied or the deadline passes. Resolves either way — a slow host is
	 * reported, never waited out.
	 */
	private async fanOut(args: {
		filter: OperatorLogFilter;
		limit: number;
		timeoutMs: number;
		answers: Map<string, HostAnswer>;
		awaiting: Set<string>;
	}) {
		const { filter, limit, timeoutMs, answers, awaiting } = args;
		const requestId = randomUUID();

		await new Promise<void>((resolve) => {
			const settle = () => {
				// Deleting under the id is the guard against settling twice: a late
				// answer finds no entry, and the timer's own call is a no-op.
				if (!this.pending.delete(requestId)) return;

				clearTimeout(timer);
				resolve();
			};

			const timer = setTimeout(settle, timeoutMs);
			timer.unref(); // a search must never hold the process open

			this.pending.set(requestId, { answers, awaiting, settle });

			this.publisher
				.publishCommand({ command: 'search-logs', payload: { requestId, filter, limit } })
				.catch((error: unknown) => {
					// Nobody will answer, so waiting out the deadline is pure latency.
					this.logger.warn('Failed to broadcast an operator console log search', { error });
					settle();
				});
		});
	}

	private async searchLocally(filter: OperatorLogFilter, limit: number): Promise<HostAnswer> {
		const { hostId } = this.instanceSettings;

		if (!this.config.history) return { hostId, matched: 0, truncated: false, records: [] };

		try {
			// One over the limit, so "there is more" is observed rather than inferred.
			const { records } = await this.history.read({
				filter,
				limit: limit + 1,
				direction: 'backward',
			});

			const capped = capRecords(records, limit, SEARCH_RESPONSE_MAX_BYTES);

			return {
				hostId,
				matched: capped.records.length,
				truncated: capped.truncated,
				records: capped.records,
			};
		} catch (error) {
			this.logger.warn('Failed to search local log history', { error });

			return { hostId, matched: 0, truncated: false, records: [] };
		}
	}

	/**
	 * Merge every host's answer into one time-ordered page. There is no global
	 * ordering across hosts, so `ts` is the only sensible merge key; `hostId` and
	 * `seq` break ties so the result is at least stable.
	 */
	private merge(
		answers: Map<string, HostAnswer>,
		missingHostIds: string[],
		limit: number,
	): OperatorLogSearchResult {
		const all = [...answers.values()].flatMap((answer) => answer.records);

		all.sort(
			(a, b) => a.ts.localeCompare(b.ts) || a.hostId.localeCompare(b.hostId) || a.seq - b.seq,
		);

		const records = all.slice(-limit);
		const hosts = [...answers.values()].map(({ hostId, matched, truncated }) => ({
			hostId,
			matched,
			truncated,
		}));

		return {
			records,
			hosts,
			respondedHostIds: hosts.map((host) => host.hostId),
			missingHostIds,
			timedOut: missingHostIds.length > 0,
			truncated: records.length < all.length || hosts.some((host) => host.truncated),
		};
	}

	// #endregion
}
