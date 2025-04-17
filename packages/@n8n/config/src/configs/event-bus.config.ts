import { z } from 'zod';

import { Config, Env, Nested } from '../decorators';

@Config
class LogWriterConfig {
	/* of event log files to keep */
	@Env('N8N_EVENTBUS_LOGWRITER_KEEPLOGCOUNT')
	keepLogCount: number = 3;

	/** Max size (in KB) of an event log file before a new one is started */
	@Env('N8N_EVENTBUS_LOGWRITER_MAXFILESIZEINKB')
	maxFileSizeInKB: number = 10240; // 10 MB

	/** Basename of event log file */
	@Env('N8N_EVENTBUS_LOGWRITER_LOGBASENAME')
	logBaseName: string = 'n8nEventLog';
}

const recoveryModeSchema = z.enum(['simple', 'extensive']);
type RecoveryMode = z.infer<typeof recoveryModeSchema>;

@Config
export class EventBusConfig {
	/** How often (in ms) to check for unsent event messages. Can in rare cases cause a message to be sent twice. `0` to disable */
	@Env('N8N_EVENTBUS_CHECKUNSENTINTERVAL')
	checkUnsentInterval: number = 0;

	/** Endpoint to retrieve n8n version information from */
	@Nested
	logWriter: LogWriterConfig;

	/** Whether to recover execution details after a crash or only mark status executions as crashed. */
	@Env('N8N_EVENTBUS_RECOVERY_MODE', recoveryModeSchema)
	crashRecoveryMode: RecoveryMode = 'extensive';
}
