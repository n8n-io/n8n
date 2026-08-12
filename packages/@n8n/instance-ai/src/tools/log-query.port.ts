/**
 * Log query port — the narrow contract the `logs` tool needs from the host.
 *
 * The real log surface (`LogSource`, ring buffer, Redis stream, `n8n.log`)
 * lives in the `operator-console` module in `packages/cli`, which this package
 * cannot import. The cli-side adapter implements this interface and the host
 * wires it onto `InstanceAiContext.logQueryService`. Presence of that field is
 * what exposes the tool (see `N8N_OPERATOR_CONSOLE_AI_TOOL`).
 *
 * ┌──────────────────────────────────────────────────────────────────────────┐
 * │ SECURITY CONTRACT — READ BEFORE IMPLEMENTING THIS INTERFACE              │
 * │                                                                          │
 * │ Every record returned by this port is shipped verbatim to an LLM         │
 * │ provider: `search` and `context` put records straight into the model's   │
 * │ context, and `snapshot` writes them into the AI sandbox as a file the    │
 * │ model then reads. This port is therefore an EGRESS BOUNDARY.             │
 * │                                                                          │
 * │ Implementations MUST return records that are already redacted.           │
 * │                                                                          │
 * │ The live capture path redacts at ring-buffer entry, but file-backed      │
 * │ history does NOT: `~/.n8n/logs/n8n.log` is written by the untouched      │
 * │ winston file transport and is UNREDACTED AT REST. Any adapter that       │
 * │ serves records from the file source must redact ON READ. An adapter that │
 * │ only tests the live path will look correct while history quietly leaks   │
 * │ URLs, headers, tokens and credential-shaped material to the provider.    │
 * │                                                                          │
 * │ The contract is enforced two ways, deliberately:                         │
 * │   1. Type level — `RedactedLogPage.redaction.applied` is the literal     │
 * │      `true`, so an implementation cannot compile without asserting it.   │
 * │   2. Runtime — the tool calls `assertRedactedLogPage()` on every page    │
 * │      before anything reaches the model, and fails closed if the          │
 * │      attestation is missing (e.g. an adapter written in plain JS).       │
 * │                                                                          │
 * │ Do not satisfy the attestation by hand-writing `{ applied: true }` next  │
 * │ to a raw read. Set it where the redactor actually ran.                   │
 * └──────────────────────────────────────────────────────────────────────────┘
 */
import type { OperatorLogFilter, OperatorLogReadResult } from '@n8n/api-types';
import { isRecord } from '@n8n/utils/is-record';
import { UnexpectedError } from 'n8n-workflow';

/**
 * Statement, made by the adapter, that the redactor ran over every record in
 * the page it accompanies. Required on every page — see the contract above.
 */
export type LogRedactionAttestation = {
	/** Literal `true`. There is no "these records did not need redacting" case. */
	applied: true;
	/**
	 * Identifier of the redactor that produced these records, e.g.
	 * `'operator-console:ring-buffer-entry'` or `'operator-console:file-source-on-read'`.
	 * Non-empty; surfaced in diagnostics so a leak can be traced to a source.
	 */
	redactor: string;
};

/** A page of log records that the adapter has attested as redacted. */
export type RedactedLogPage = OperatorLogReadResult & {
	redaction: LogRedactionAttestation;
};

export interface LogQueryReadOptions {
	filter: OperatorLogFilter;
	/** Hard upper bound on returned records. Implementations may return fewer, never more. */
	limit: number;
	/** Opaque cursor from a previous page's `nextCursor`. Omit to start from the newest window. */
	cursor?: string;
	abortSignal?: AbortSignal;
}

export interface LogQueryContextOptions {
	hostId: string;
	/** Per-host sequence number of the hit to centre the window on. */
	seq: number;
	/** Records to include before `seq`. */
	before: number;
	/** Records to include after `seq`. */
	after: number;
	abortSignal?: AbortSignal;
}

export interface InstanceAiLogQueryPort {
	/**
	 * Upper bound the host places on a single snapshot
	 * (`N8N_OPERATOR_CONSOLE_AI_SNAPSHOT_MAX_LINES`). The tool clamps the model's
	 * requested `maxLines` to this. Omit to accept the tool's own default cap.
	 */
	readonly maxSnapshotLines?: number;

	/** Filtered read. Returns REDACTED records — see the contract at the top of this file. */
	read(options: LogQueryReadOptions): Promise<RedactedLogPage>;

	/**
	 * Neighbouring lines around a single hit, on one host. Separate from `read`
	 * because the `(hostId, seq)` window is not expressible through the opaque
	 * cursor. Returns REDACTED records — see the contract at the top of this file.
	 */
	readContext(options: LogQueryContextOptions): Promise<RedactedLogPage>;
}

function hasRedactionAttestation(value: unknown): boolean {
	return (
		isRecord(value) &&
		value.applied === true &&
		typeof value.redactor === 'string' &&
		value.redactor.length > 0
	);
}

/**
 * Fail-closed guard for the egress boundary. Called on every page before its
 * records reach the model, so a JS-side adapter that skips redaction errors out
 * instead of leaking. A thrown error here is an adapter bug, not user input.
 */
export function assertRedactedLogPage(page: RedactedLogPage, action: string): void {
	if (hasRedactionAttestation(page.redaction)) return;

	throw new UnexpectedError(
		`Log query port returned a page without a redaction attestation (logs action "${action}"). ` +
			'Records read from file-backed history are unredacted at rest and must be redacted on read ' +
			'before they can be sent to the model. Refusing to return log content.',
	);
}
