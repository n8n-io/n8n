import { z } from 'zod';

import { Config, Env, Nested } from '../decorators';

const recoveryModeSchema = z.enum(['simple', 'extensive']);
type RecoveryMode = z.infer<typeof recoveryModeSchema>;

const syslogProtocolSchema = z.enum(['udp', 'tcp', 'tls']);
type SyslogProtocol = z.infer<typeof syslogProtocolSchema>;

@Config
class SyslogConfig {
	/** Enable automatic syslog destination creation from environment variables */
	@Env('N8N_EVENTBUS_LOGWRITER_SYSLOG_ENABLED')
	enabled: boolean = false;

	/** Syslog server hostname or IP address */
	@Env('N8N_EVENTBUS_LOGWRITER_SYSLOG_HOST')
	host: string = '';

	/** Syslog server port */
	@Env('N8N_EVENTBUS_LOGWRITER_SYSLOG_PORT')
	port: number = 514;

	/** Syslog protocol */
	@Env('N8N_EVENTBUS_LOGWRITER_SYSLOG_PROTOCOL', syslogProtocolSchema)
	protocol: SyslogProtocol = 'udp';

	/** Syslog facility (0-23) */
	@Env('N8N_EVENTBUS_LOGWRITER_SYSLOG_FACILITY')
	facility: number = 16; // Local use facility 0

	/** Application name for syslog messages */
	@Env('N8N_EVENTBUS_LOGWRITER_SYSLOG_APP_NAME')
	appName: string = 'n8n';

	/** Hostname for syslog messages */
	@Env('N8N_EVENTBUS_LOGWRITER_SYSLOG_HOSTNAME')
	hostname: string = '';
}

@Config
class LogWriterConfig {
	/** Number of event log files to keep */
	@Env('N8N_EVENTBUS_LOGWRITER_KEEPLOGCOUNT')
	keepLogCount: number = 3;

	/** Max size (in KB) of an event log file before a new one is started */
	@Env('N8N_EVENTBUS_LOGWRITER_MAXFILESIZEINKB')
	maxFileSizeInKB: number = 10240; // 10 MB

	/** Basename of event log file */
	@Env('N8N_EVENTBUS_LOGWRITER_LOGBASENAME')
	logBaseName: string = 'n8nEventLog';

	/** Syslog destination configuration from environment variables */
	@Nested
	syslog: SyslogConfig;
}

@Config
export class EventBusConfig {
	/** How often (in ms) to check for unsent event messages. Can in rare cases cause a message to be sent twice. `0` to disable */
	@Env('N8N_EVENTBUS_CHECKUNSENTINTERVAL')
	checkUnsentInterval: number = 0;

	/** Log writer configuration including syslog destination settings */
	@Nested
	logWriter: LogWriterConfig;

	/** Whether to recover execution details after a crash or only mark status executions as crashed. */
	@Env('N8N_EVENTBUS_RECOVERY_MODE', recoveryModeSchema)
	crashRecoveryMode: RecoveryMode = 'extensive';
}
