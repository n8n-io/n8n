import { z } from 'zod';

import { Config, Env, Nested } from '../decorators';

@Config
class LogWriterConfig {
	/** Number of event log files to retain; older files are rotated out. */
	@Env('N8N_EVENTBUS_LOGWRITER_KEEPLOGCOUNT')
	keepLogCount: number = 3;

	/** Maximum size in KB of a single event log file before rotation. Default: 10 MB. */
	@Env('N8N_EVENTBUS_LOGWRITER_MAXFILESIZEINKB')
	maxFileSizeInKB: number = 10240; // 10 MB

	/** Base filename for event log files (extension and rotation suffix are added). */
	@Env('N8N_EVENTBUS_LOGWRITER_LOGBASENAME')
	logBaseName: string = 'n8nEventLog';

	/**
	 * Absolute path to the primary event log file (must end in `.log`). When set,
	 * used verbatim with no process-type suffix; the operator owns per-pod
	 * uniqueness (e.g. via Kubernetes Downward API or per-pod PVC). Parent
	 * directory is auto-created. Rotation siblings (e.g. `myEventLog-1.log`,
	 * `myEventLog-2.log`, …, derived from the configured `logFullPath`) and the
	 * `.recoveryInProgress` marker colocate with this path. Empty (default)
	 * preserves the legacy `${N8N_USER_FOLDER}/n8nEventLog[-worker|-webhook-processor]`
	 * behavior.
	 */
	@Env('N8N_EVENTBUS_LOGWRITER_LOGFULLPATH')
	logFullPath: string = '';

	/**
	 * Safety tripwire: per-file cap on concurrently unconfirmed messages held in memory
	 * during startup log parsing. Aborts the file if exceeded, to prevent OOM on legacy
	 * logs with many orphaned messages. Tune up if healthy workloads hit false positives.
	 */
	@Env('N8N_EVENTBUS_LOGWRITER_MAXMESSAGESPERPARSE')
	maxMessagesPerParse: number = 10_000;

	/**
	 * Maximum number of messages and malformed lines that n8n reads from one event log
	 * file. Confirmations and repeated copies of a message don't count. n8n stops reading
	 * the file at this limit, to keep memory use bounded.
	 */
	@Env('N8N_EVENTBUS_LOGWRITER_MAXTOTALMESSAGESPERFILE')
	maxTotalMessagesPerFile: number = 500_000;
}

const recoveryModeSchema = z.enum(['simple', 'extensive']);
type RecoveryMode = z.infer<typeof recoveryModeSchema>;

@Config
export class EventBusConfig {
	/** Interval in milliseconds to check for and resend unsent event-bus messages. Set to 0 to disable (may rarely allow duplicate sends when non-zero). */
	@Env('N8N_EVENTBUS_CHECKUNSENTINTERVAL')
	checkUnsentInterval: number = 0;

	/** Endpoint to retrieve n8n version information from */
	@Nested
	logWriter: LogWriterConfig;

	/** After a crash: `extensive` recovers full execution details; `simple` only marks executions as crashed. */
	@Env('N8N_EVENTBUS_RECOVERY_MODE', recoveryModeSchema)
	crashRecoveryMode: RecoveryMode = 'extensive';
}
