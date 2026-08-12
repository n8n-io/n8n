import { Service } from '@n8n/di';
import type {
	InstanceAiLogQueryPort,
	LogQueryContextOptions,
	LogQueryReadOptions,
	RedactedLogPage,
} from '@n8n/instance-ai';

import { redactRecord } from '../capture/redactor';
import { OperatorConsoleConfig } from '../operator-console.config';
import { CompositeLogSource } from '../sources/composite-log.source';

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
	) {}

	get maxSnapshotLines(): number {
		return this.config.aiSnapshotMaxLines;
	}

	async read({ filter, limit, cursor }: LogQueryReadOptions): Promise<RedactedLogPage> {
		const page = await this.source.read({ filter, limit, since: cursor });

		// The source may overshoot `limit` to avoid splitting a stream entry, but
		// the port promises never to exceed it — the tool sizes its snapshot cap
		// on this. Keep the newest, which is what a log reader wants.
		return this.attest({ ...page, records: page.records.slice(-limit) });
	}

	async readContext({
		hostId,
		seq,
		before,
		after,
	}: LogQueryContextOptions): Promise<RedactedLogPage> {
		const filter = { hostIds: [hostId] };

		// A cursor is exclusive, so anchor `before` at the hit itself and add the
		// hit back from the forward read.
		const [older, newer] = await Promise.all([
			this.source.read({ filter, limit: before + 1, since: cursorFor(seq), direction: 'backward' }),
			this.source.read({ filter, limit: after, since: cursorFor(seq), direction: 'forward' }),
		]);

		const records = [...older.records, ...newer.records].filter(
			(record, index, all) => all.findIndex((other) => other.seq === record.seq) === index,
		);

		return this.attest({ records, nextCursor: newer.nextCursor, gap: older.gap });
	}

	private attest(page: Omit<RedactedLogPage, 'redaction'>): RedactedLogPage {
		return {
			...page,
			records: page.records.map(redactRecord),
			redaction: { applied: true, redactor: REDACTOR_ID },
		};
	}
}

/**
 * `readContext` addresses a record by `(hostId, seq)`, but cursors are opaque
 * per source. The composite's live tier encodes the ring-buffer `seq` directly,
 * which is what the AI's hits carry, so a bare number is the right cursor here.
 */
function cursorFor(seq: number): string {
	return String(seq);
}
