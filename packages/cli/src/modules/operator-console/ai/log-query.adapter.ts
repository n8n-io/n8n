import { Service } from '@n8n/di';
import { UserError } from 'n8n-workflow';
import type { OperatorLogFilter, OperatorLogRecord } from '@n8n/api-types';
import { ExecutionsConfig } from '@n8n/config';
import type {
	InstanceAiLogQueryPort,
	LogQueryContextOptions,
	LogQueryReadOptions,
	RedactedLogPage,
} from '@n8n/instance-ai';

import { redactRecord } from '../capture/redactor';
import { DistributedSearchService } from '../consumer/distributed-search.service';
import { OperatorConsoleConfig } from '../operator-console.config';
import { CompositeLogSource } from '../sources/composite-log.source';

/** Extra records fetched per page so a window is usually satisfied in one read. */
const CONTEXT_PAGE_PADDING = 200;

/** Bounds the walk backwards; a hit older than this is reported as unreachable. */
const MAX_CONTEXT_PAGES = 8;

/** Names the redactor in the attestation, so a page can be traced to its source. */
const REDACTOR_ID = 'operator-console:adapter-on-read';

/**
 * Bridges the Instance AI `logs` tool to the console's `LogSource`.
 *
 * The instance-ai package cannot import from `packages/cli`, so it declares a
 * port and this implements it.
 *
 * **Every record leaving here is redacted, unconditionally.** Live records were
 * already redacted at ring-buffer entry, but history comes from `n8n.log`,
 * which the untouched winston transport writes in the clear. Rather than
 * reason per-tier about which path a record took, we redact everything on the
 * way out: this is the one consumer that ships log content off-instance to a
 * model provider, and it is cheap relative to that. Redaction is idempotent.
 */
@Service()
export class InstanceAiLogQueryAdapter implements InstanceAiLogQueryPort {
	constructor(
		private readonly source: CompositeLogSource,
		private readonly config: OperatorConsoleConfig,
		private readonly distributedSearch: DistributedSearchService,
		private readonly executionsConfig: ExecutionsConfig,
	) {}

	/** Only queue mode has other hosts; a single main is already the whole view. */
	private get isQueueMode(): boolean {
		return this.executionsConfig.mode === 'queue';
	}

	get maxSnapshotLines(): number {
		return this.config.aiSnapshotMaxLines;
	}

	async read({ filter, limit, cursor }: LogQueryReadOptions): Promise<RedactedLogPage> {
		// Fan out across the deployment when there is a deployment to fan out to.
		// Without this the agent sees only this main's view: the cross-host stream
		// window plus this host's own `n8n.log`. An execution that failed on a
		// worker an hour ago is invisible — which is the exact question this tool
		// exists to answer. Paging stays on the local composite, since a
		// scatter-gather has no stable cursor to resume from.
		if (this.isQueueMode && cursor === undefined) {
			return await this.readAcrossHosts(filter, limit);
		}

		const page = await this.source.read({ filter, limit, since: cursor });

		// The source may overshoot `limit` to avoid splitting a stream entry, but
		// the port promises never to exceed it — the tool sizes its snapshot cap
		// on this. Keep the newest, which is what a log reader wants.
		return this.attest({ ...page, records: page.records.slice(-limit) });
	}

	private async readAcrossHosts(
		filter: OperatorLogFilter,
		limit: number,
	): Promise<RedactedLogPage> {
		const hosts = await this.source.hosts();

		const result = await this.distributedSearch.search({
			filter,
			limit,
			expectedHostIds: hosts.map((host) => host.hostId),
		});

		return this.attest({
			records: result.records.slice(-limit),
			nextCursor: '',
			// A capped result is the same kind of incompleteness a `gap` reports:
			// there is more than what came back.
			gap: result.truncated,
			missingHostIds: result.missingHostIds,
		});
	}

	/**
	 * Walks back from the newest records on `hostId` until the hit's timestamp is
	 * covered, then slices a window around it.
	 *
	 * Addressed by time because `seq` cannot address a record across tiers — the
	 * ring buffer, the cross-host stream and the rotated files each number lines
	 * their own way. Paging rather than filtering because `OperatorLogFilter` has
	 * no time range yet; adding one would let every source do this in a single
	 * read, and is the right follow-up.
	 */
	async readContext({
		hostId,
		ts,
		before,
		after,
	}: LogQueryContextOptions): Promise<RedactedLogPage> {
		const target = Date.parse(ts);
		if (Number.isNaN(target)) {
			throw new UserError(`Invalid timestamp for log context: "${ts}"`);
		}

		const filter = { hostIds: [hostId] };
		const pageSize = before + after + CONTEXT_PAGE_PADDING;

		const collected: OperatorLogRecord[] = [];
		let cursor: string | undefined;
		let gap = false;

		for (let page = 0; page < MAX_CONTEXT_PAGES; page++) {
			const result = await this.source.read({
				filter,
				limit: pageSize,
				since: cursor,
				direction: 'backward',
			});

			if (result.records.length === 0) break;

			// Pages arrive newest-first as whole blocks, each older than the last.
			collected.unshift(...result.records);
			gap = gap || result.gap;

			const oldestInPage = Date.parse(result.records[0].ts);
			if (Number.isFinite(oldestInPage) && oldestInPage <= target) break;

			if (!result.nextCursor) break;
			cursor = result.nextCursor;
		}

		const hitIndex = collected.findIndex((record) => Date.parse(record.ts) >= target);
		if (hitIndex === -1) {
			// Everything retained for this host predates the hit.
			return this.attest({ records: [], nextCursor: '', gap: true });
		}

		// Nothing at or before the hit means the hit itself has been evicted and
		// what follows is merely the nearest surviving lines. Still worth
		// returning, but the caller must not read it as the hit's surroundings.
		const reachedHit = collected.some((record) => Date.parse(record.ts) <= target);

		const records = collected.slice(Math.max(0, hitIndex - before), hitIndex + after + 1);

		return this.attest({ records, nextCursor: '', gap: gap || !reachedHit });
	}

	private attest(page: Omit<RedactedLogPage, 'redaction'>): RedactedLogPage {
		return {
			...page,
			records: page.records.map(redactRecord),
			redaction: { applied: true, redactor: REDACTOR_ID },
		};
	}
}
