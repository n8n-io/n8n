import type { OperatorLogFilter, OperatorLogRecord } from '@n8n/api-types';
import { Logger } from '@n8n/backend-common';
import { ExecutionsConfig } from '@n8n/config';
import { OnPubSubEvent } from '@n8n/decorators';
import { Service } from '@n8n/di';
import { InstanceSettings } from 'n8n-core';

import { Publisher } from '@/scaling/pubsub/publisher.service';

import { OperatorConsoleConfig } from '../operator-console.config';
import { OPERATOR_CONSOLE_SCOPE, SEARCH_RESPONSE_MAX_BYTES } from '../operator-console.constants';
import { LogFileSource } from '../sources/log-file.source';

/**
 * Answers `search-logs` on behalf of this host.
 *
 * Runs on every instance type, because that is the whole point: past the
 * cross-host stream's `MAXLEN` window, deep history is each host's own
 * `~/.n8n/logs/n8n.log` and nobody else can read it. A worker that stays silent
 * is a worker whose logs simply do not exist as far as the console is concerned.
 *
 * The requesting main does *not* get its own command back (`search-logs` is not
 * a self-send command) — it searches locally and merges itself in.
 */
@Service()
export class SearchResponderService {
	private readonly isQueueMode: boolean;

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

	@OnPubSubEvent('search-logs')
	async handleSearchLogs({
		requestId,
		filter,
		limit,
	}: {
		requestId: string;
		filter: OperatorLogFilter;
		limit: number;
	}) {
		// Outside queue mode there is no pubsub client to answer on, and no other
		// host to answer for. Defensive: the command cannot reach us there.
		if (!this.isQueueMode) return;

		const { records, truncated } = await this.collect(filter, limit);

		try {
			await this.publisher.publishWorkerResponse({
				senderId: this.instanceSettings.hostId,
				response: 'response-to-search-logs',
				payload: { requestId, hostId: this.instanceSettings.hostId, records, truncated },
			});
		} catch (error) {
			// The requester will report us as a non-responder, which is the honest
			// outcome. Failing to answer must never take a worker down.
			this.logger.warn('Failed to answer an operator console log search', { error, requestId });
		}
	}

	private async collect(filter: OperatorLogFilter, limit: number) {
		// With history off there is no file transport to read, so this host has
		// nothing to contribute. Answer empty rather than going silent: "nothing
		// here" and "never replied" must stay distinguishable to the caller.
		if (!this.config.history) return { records: [], truncated: false };

		try {
			// One over the limit, so "there is more" is an observation rather than a
			// guess from having returned exactly `limit` records.
			const { records } = await this.history.read({
				filter,
				limit: limit + 1,
				direction: 'backward',
			});

			return capRecords(records, limit, SEARCH_RESPONSE_MAX_BYTES);
		} catch (error) {
			this.logger.warn('Failed to search local log history', { error });

			return { records: [], truncated: false };
		}
	}
}

/**
 * Trim a host's answer to what it is allowed to put on the wire, keeping the
 * newest records — a search over logs is nearly always looking forwards from
 * "what just happened", and the caller is told when we cut.
 *
 * `records` is expected oldest-first, as `direction: 'backward'` returns it.
 */
export function capRecords(
	records: OperatorLogRecord[],
	limit: number,
	maxBytes: number,
): { records: OperatorLogRecord[]; truncated: boolean } {
	const kept: OperatorLogRecord[] = [];
	let bytes = 0;

	for (let i = records.length - 1; i >= 0 && kept.length < limit; i--) {
		bytes += JSON.stringify(records[i]).length;

		// Always keep at least one record: an oversized single line should still be
		// seen, and it is bounded by the capture layer's max line length anyway.
		if (bytes > maxBytes && kept.length > 0) break;

		kept.unshift(records[i]);
	}

	return { records: kept, truncated: kept.length < records.length };
}
