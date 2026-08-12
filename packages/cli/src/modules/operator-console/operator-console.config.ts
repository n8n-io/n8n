import { Config, Env } from '@n8n/config';

@Config
export class OperatorConsoleConfig {
	/**
	 * Tee raw `process.stdout` and `process.stderr` in addition to the winston
	 * transport. Catches what never reaches the `Logger`: `console.log` from Code
	 * nodes, third-party library noise, V8 warnings.
	 */
	@Env('N8N_OPERATOR_CONSOLE_CAPTURE_STDOUT')
	captureStdout: boolean = true;

	/** Log lines retained in memory per host. */
	@Env('N8N_OPERATOR_CONSOLE_BUFFER_SIZE')
	bufferSize: number = 5000;

	/** Longer lines are cut and flagged `truncated`. */
	@Env('N8N_OPERATOR_CONSOLE_MAX_LINE_BYTES')
	maxLineBytes: number = 8192;

	/** Max lines/sec admitted per host. Excess is dropped and counted. */
	@Env('N8N_OPERATOR_CONSOLE_RATE_LIMIT')
	rateLimit: number = 2000;

	/**
	 * Redact records at ring-buffer entry. Note this does not cover history read
	 * from `n8n.log`, which is written by the untouched winston file transport
	 * and must be redacted on read instead.
	 */
	@Env('N8N_OPERATOR_CONSOLE_REDACT')
	redact: boolean = true;

	/**
	 * Read deep history from the winston file transport, attaching it if
	 * `N8N_LOG_OUTPUT` omits `file`. Size, rotation and location are governed by
	 * the existing `N8N_LOG_FILE_*` vars.
	 */
	@Env('N8N_OPERATOR_CONSOLE_HISTORY')
	history: boolean = true;

	/** Batch flush interval, applied independently at each hop. */
	@Env('N8N_OPERATOR_CONSOLE_BATCH_INTERVAL_MS')
	batchIntervalMs: number = 200;

	/** Batch flush size, applied independently at each hop. */
	@Env('N8N_OPERATOR_CONSOLE_BATCH_MAX_BYTES')
	batchMaxBytes: number = 65536;

	/** Redis Stream `MAXLEN ~`. Sets the cross-host history window. Queue mode only. */
	@Env('N8N_OPERATOR_CONSOLE_STREAM_MAX_LEN')
	streamMaxLen: number = 50000;

	/**
	 * Producers stop publishing this long after the last heartbeat, so a closed
	 * tab or a dead main silences the stream on its own. Queue mode only.
	 */
	@Env('N8N_OPERATOR_CONSOLE_LEASE_TTL_MS')
	leaseTtlMs: number = 30000;

	/** Expose the `logs` tool to Instance AI. */
	@Env('N8N_OPERATOR_CONSOLE_AI_TOOL')
	aiTool: boolean = true;

	/** Cap on lines materialized into an AI sandbox snapshot. */
	@Env('N8N_OPERATOR_CONSOLE_AI_SNAPSHOT_MAX_LINES')
	aiSnapshotMaxLines: number = 5000;
}
