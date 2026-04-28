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
	 * Safety tripwire: per-file cap on concurrently unconfirmed messages held in memory
	 * during startup log parsing. Aborts the file if exceeded, to prevent OOM on legacy
	 * logs with many orphaned messages. Tune up if healthy workloads hit false positives.
	 */
	@Env('N8N_EVENTBUS_LOGWRITER_MAXMESSAGESPERPARSE')
	maxMessagesPerParse: number = 10_000;

	/**
	 * Absolute ceiling on total lines processed from a single event log file during
	 * parsing, across all return modes (including 'all'). Skipped/invalid lines count
	 * toward this total, bounding worst-case memory on malformed files.
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
