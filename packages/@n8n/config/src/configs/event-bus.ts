import { Config, Env, Nested } from '../decorators';

@Config
class LogWriterConfig {
	/** Number of event log files to keep */
	@Env('N8N_EVENTBUS_LOGWRITER_KEEPLOGCOUNT')
	readonly keepLogCount: number = 3;

	/** Max size (in KB) of an event log file before a new one is started */
	@Env('N8N_EVENTBUS_LOGWRITER_MAXFILESIZEINKB')
	readonly maxFileSizeInKB: number = 10240; // 10 MB

	/** Basename of event log file */
	@Env('N8N_EVENTBUS_LOGWRITER_LOGBASENAME')
	readonly logBaseName: string = 'n8nEventLog';
}

@Config
export class EventBusConfig {
	/** How often (in ms) to check for unsent event messages. Can in rare cases cause a message to be sent twice. `0` to disable */
	@Env('N8N_EVENTBUS_CHECKUNSENTINTERVAL')
	readonly checkUnsentInterval: number = 0;

	/** Endpoint to retrieve n8n version information from */
	@Nested
	readonly logWriter: LogWriterConfig;

	/** Whether to recover execution details after a crash or only mark status executions as crashed. */
	@Env('N8N_EVENTBUS_RECOVERY_MODE')
	readonly crashRecoveryMode: 'simple' | 'extensive' = 'extensive';
}
