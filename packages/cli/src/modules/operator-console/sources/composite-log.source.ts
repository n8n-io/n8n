import type {
	OperatorLogBatch,
	OperatorLogFilter,
	OperatorLogHost,
	OperatorLogReadResult,
} from '@n8n/api-types';
import { GlobalConfig } from '@n8n/config';
import { Service } from '@n8n/di';

import { LogFileSource } from './log-file.source';
import type { LogReadOptions, LogSource, Unsubscribe } from './log-source';
import { RedisStreamSource } from './redis-stream.source';
import { RingBufferSource } from './ring-buffer.source';

const LIVE = 'live:';
const HISTORY = 'hist:';

/**
 * The one `LogSource` everything above this layer talks to, so no caller has to
 * know whether the instance runs with Redis.
 *
 * Two tiers:
 * - **live** — the Redis Stream in queue mode, otherwise the local ring buffer.
 * - **history** — the rotated `n8n.log` set, which reaches further back and
 *   survives a restart.
 *
 * A single read is served by exactly one tier. Mixing them in one response
 * would duplicate the lines that exist in both, and deduplicating log lines is
 * guesswork — the same message can legitimately repeat. Instead the cursor is
 * namespaced, so the client walks off the end of the live tier and continues in
 * history with an explicit `origin: 'file'` boundary it can render.
 */
@Service()
export class CompositeLogSource implements LogSource {
	constructor(
		private readonly ringBuffer: RingBufferSource,
		private readonly redisStream: RedisStreamSource,
		private readonly history: LogFileSource,
		private readonly globalConfig: GlobalConfig,
	) {}

	/** Redis only exists in queue mode; regular mode has a single process. */
	private get live(): LogSource {
		return this.globalConfig.executions.mode === 'queue' ? this.redisStream : this.ringBuffer;
	}

	async read(options: LogReadOptions): Promise<OperatorLogReadResult> {
		const { since, direction = 'backward' } = options;

		if (since?.startsWith(HISTORY)) {
			return this.tag(
				HISTORY,
				await this.history.read({ ...options, since: strip(since, HISTORY) }),
			);
		}

		const live = await this.live.read({ ...options, since: strip(since, LIVE) });
		if (live.records.length > 0) return this.tag(LIVE, live);

		// Live tier had nothing to offer — either it is empty (a freshly started
		// instance) or we have paged off its oldest end. Either way history is the
		// only place left to look, so fall through rather than return a blank pane.
		if (direction === 'forward') return this.tag(LIVE, live);

		const history = await this.history.read({ ...options, since: undefined });

		return this.tag(HISTORY, { ...history, gap: history.gap || live.gap });
	}

	subscribe(filter: OperatorLogFilter, onBatch: (batch: OperatorLogBatch) => void): Unsubscribe {
		return this.live.subscribe(filter, onBatch);
	}

	async hosts(): Promise<OperatorLogHost[]> {
		const [live, history] = await Promise.all([this.live.hosts(), this.history.hosts()]);

		// The local host appears in both tiers; the live entry wins as its
		// `lastSeenAt` is real rather than synthesised.
		const byId = new Map(history.map((host) => [host.hostId, host]));
		for (const host of live) byId.set(host.hostId, host);

		return [...byId.values()];
	}

	private tag(prefix: string, result: OperatorLogReadResult): OperatorLogReadResult {
		return {
			...result,
			nextCursor: result.nextCursor ? `${prefix}${result.nextCursor}` : result.nextCursor,
		};
	}
}

function strip(cursor: string | undefined, prefix: string): string | undefined {
	if (cursor === undefined) return undefined;
	return cursor.startsWith(prefix) ? cursor.slice(prefix.length) : cursor;
}
