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
