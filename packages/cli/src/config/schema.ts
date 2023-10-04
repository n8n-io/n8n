import path from 'path';
import convict from 'convict';
import { UserSettings } from 'n8n-core';
import { jsonParse } from 'n8n-workflow';
import { ensureStringArray } from './utils';

convict.addFormat({
	name: 'json-string-array',
	coerce: (rawStr: string) =>
		jsonParse<string[]>(rawStr, {
			errorMessage: `Expected this value "${rawStr}" to be valid JSON`,
		}),
	validate: ensureStringArray,
});

convict.addFormat({
	name: 'comma-separated-list',
	coerce: (rawStr: string) => rawStr.split(','),
	validate: ensureStringArray,
});

export const schema = {
	database: {
		type: {
			doc: 'Type of database to use',
			format: ['sqlite', 'mariadb', 'mysqldb', 'postgresdb'] as const,
			default: 'sqlite',
			env: 'DB_TYPE',
		},
		tablePrefix: {
			doc: 'Prefix for table names',
			format: '*',
			default: '',
			env: 'DB_TABLE_PREFIX',
		},
		logging: {
			enabled: {
				doc: 'Typeorm logging enabled flag.',
				format: Boolean,
				default: false,
				env: 'DB_LOGGING_ENABLED',
			},
			options: {
				doc: 'Logging level options, default is "error". Possible values: query,error,schema,warn,info,log. To enable all logging, specify "all"',
				format: String,
				default: 'error',
				env: 'DB_LOGGING_OPTIONS',
			},
			maxQueryExecutionTime: {
				doc: 'Maximum number of milliseconds query should be executed before logger logs a warning. Set 0 to disable long running query warning',
				format: Number,
				default: 0, // 0 disables the slow-query log
				env: 'DB_LOGGING_MAX_EXECUTION_TIME',
			},
		},
		postgresdb: {
			database: {
				doc: 'PostgresDB Database',
				format: String,
				default: 'n8n',
				env: 'DB_POSTGRESDB_DATABASE',
			},
			host: {
				doc: 'PostgresDB Host',
				format: String,
				default: 'localhost',
				env: 'DB_POSTGRESDB_HOST',
			},
			password: {
				doc: 'PostgresDB Password',
				format: String,
				default: '',
				env: 'DB_POSTGRESDB_PASSWORD',
			},
			port: {
				doc: 'PostgresDB Port',
				format: Number,
				default: 5432,
				env: 'DB_POSTGRESDB_PORT',
			},
			user: {
				doc: 'PostgresDB User',
				format: String,
				default: 'root',
				env: 'DB_POSTGRESDB_USER',
			},
			schema: {
				doc: 'PostgresDB Schema',
				format: String,
				default: 'public',
				env: 'DB_POSTGRESDB_SCHEMA',
			},

			ssl: {
				ca: {
					doc: 'SSL certificate authority',
					format: String,
					default: '',
					env: 'DB_POSTGRESDB_SSL_CA',
				},
				cert: {
					doc: 'SSL certificate',
					format: String,
					default: '',
					env: 'DB_POSTGRESDB_SSL_CERT',
				},
				key: {
					doc: 'SSL key',
					format: String,
					default: '',
					env: 'DB_POSTGRESDB_SSL_KEY',
				},
				rejectUnauthorized: {
					doc: 'If unauthorized SSL connections should be rejected',
					format: 'Boolean',
					default: true,
					env: 'DB_POSTGRESDB_SSL_REJECT_UNAUTHORIZED',
				},
			},
		},
		mysqldb: {
			database: {
				doc: '[DEPRECATED] MySQL Database',
				format: String,
				default: 'n8n',
				env: 'DB_MYSQLDB_DATABASE',
			},
			host: {
				doc: 'MySQL Host',
				format: String,
				default: 'localhost',
				env: 'DB_MYSQLDB_HOST',
			},
			password: {
				doc: 'MySQL Password',
				format: String,
				default: '',
				env: 'DB_MYSQLDB_PASSWORD',
			},
			port: {
				doc: 'MySQL Port',
				format: Number,
				default: 3306,
				env: 'DB_MYSQLDB_PORT',
			},
			user: {
				doc: 'MySQL User',
				format: String,
				default: 'root',
				env: 'DB_MYSQLDB_USER',
			},
		},
		sqlite: {
			database: {
				doc: 'SQLite Database file name',
				format: String,
				default: 'database.sqlite',
				env: 'DB_SQLITE_DATABASE',
			},
			enableWAL: {
				doc: 'Enable SQLite WAL mode',
				format: Boolean,
				default: false,
				env: 'DB_SQLITE_ENABLE_WAL',
			},
			executeVacuumOnStartup: {
				doc: 'Runs VACUUM operation on startup to rebuild the database. Reduces filesize and optimizes indexes. WARNING: This is a long running blocking operation. Will increase start-up time.',
				format: Boolean,
				default: false,
				env: 'DB_SQLITE_VACUUM_ON_STARTUP',
			},
		},
	},

	credentials: {
		overwrite: {
			data: {
				// Allows to set default values for credentials which
				// get automatically prefilled and the user does not get
				// displayed and can not change.
				// Format: { CREDENTIAL_NAME: { PARAMETER: VALUE }}
				doc: 'Overwrites for credentials',
				format: '*',
				default: '{}',
				env: 'CREDENTIALS_OVERWRITE_DATA',
			},
			endpoint: {
				doc: 'Fetch credentials from API',
				format: String,
				default: '',
				env: 'CREDENTIALS_OVERWRITE_ENDPOINT',
			},
		},
		defaultName: {
			doc: 'Default name for credentials',
			format: String,
			default: 'My credentials',
			env: 'CREDENTIALS_DEFAULT_NAME',
		},
	},

	workflows: {
		defaultName: {
			doc: 'Default name for workflow',
			format: String,
			default: 'My workflow',
			env: 'WORKFLOWS_DEFAULT_NAME',
		},
		onboardingFlowDisabled: {
			doc: 'Show onboarding flow in new workflow',
			format: 'Boolean',
			default: false,
			env: 'N8N_ONBOARDING_FLOW_DISABLED',
		},
		callerPolicyDefaultOption: {
			doc: 'Default option for which workflows may call the current workflow',
			format: ['any', 'none', 'workflowsFromAList', 'workflowsFromSameOwner'] as const,
			default: 'workflowsFromSameOwner',
			env: 'N8N_WORKFLOW_CALLER_POLICY_DEFAULT_OPTION',
		},
	},

	executions: {
		// By default workflows get always executed in the main process.
		// TODO: remove this and all usage of `executions.process` when `own` mode is deleted
		process: {
			doc: 'In what process workflows should be executed.',
			format: ['main', 'own'] as const,
			default: 'main',
			env: 'EXECUTIONS_PROCESS',
		},

		mode: {
			doc: 'If it should run executions directly or via queue',
			format: ['regular', 'queue'] as const,
			default: 'regular',
			env: 'EXECUTIONS_MODE',
		},

		// A Workflow times out and gets canceled after this time (seconds).
		// If the workflow is executed in the main process a soft timeout
		// is executed (takes effect after the current node finishes).
		// If a workflow is running in its own process is a soft timeout
		// tried first, before killing the process after waiting for an
		// additional fifth of the given timeout duration.
		//
		// To deactivate timeout set it to -1
		//
		// Timeout is currently not activated by default which will change
		// in a future version.
		timeout: {
			doc: 'Max run time (seconds) before stopping the workflow execution',
			format: Number,
			default: -1,
			env: 'EXECUTIONS_TIMEOUT',
		},
		maxTimeout: {
			doc: 'Max execution time (seconds) that can be set for a workflow individually',
			format: Number,
			default: 3600,
			env: 'EXECUTIONS_TIMEOUT_MAX',
		},

		// If a workflow executes all the data gets saved by default. This
		// could be a problem when a workflow gets executed a lot and processes
		// a lot of data. To not exceed the database's capacity it is possible to
		// prune the database regularly or to not save the execution at all.
		// Depending on if the execution did succeed or error a different
		// save behaviour can be set.
		saveDataOnError: {
			doc: 'What workflow execution data to save on error',
			format: ['all', 'none'] as const,
			default: 'all',
			env: 'EXECUTIONS_DATA_SAVE_ON_ERROR',
		},
		saveDataOnSuccess: {
			doc: 'What workflow execution data to save on success',
			format: ['all', 'none'] as const,
			default: 'all',
			env: 'EXECUTIONS_DATA_SAVE_ON_SUCCESS',
		},
		saveExecutionProgress: {
			doc: 'Whether or not to save progress for each node executed',
			format: 'Boolean',
			default: false,
			env: 'EXECUTIONS_DATA_SAVE_ON_PROGRESS',
		},

		// If the executions of workflows which got started via the editor
		// should be saved. By default they will not be saved as this runs
		// are normally only for testing and debugging. This setting can
		// also be overwritten on a per workflow basis in the workflow settings
		// in the editor.
		saveDataManualExecutions: {
			doc: 'Save data of executions when started manually via editor',
			format: 'Boolean',
			default: true,
			env: 'EXECUTIONS_DATA_SAVE_MANUAL_EXECUTIONS',
		},

		// To not exceed the database's capacity and keep its size moderate
		// the execution data gets pruned regularly (default: 1 hour interval).
		// All saved execution data older than the max age will be deleted.
		// Pruning is currently not activated by default, which will change in
		// a future version.
		pruneData: {
			doc: 'Delete data of past executions on a rolling basis',
			format: 'Boolean',
			default: true,
			env: 'EXECUTIONS_DATA_PRUNE',
		},
		pruneDataMaxAge: {
			doc: 'How old (hours) the finished execution data has to be to get deleted',
			format: Number,
			default: 336,
			env: 'EXECUTIONS_DATA_MAX_AGE',
		},

		// Additional pruning option to delete executions if total count exceeds the configured max.
		// Deletes the oldest entries first
		// Set to 0 for No limit
		pruneDataMaxCount: {
			doc: "Maximum number of finished executions to keep in DB. Doesn't necessarily prune exactly to max number. 0 = no limit",
			format: Number,
			default: 10000,
			env: 'EXECUTIONS_DATA_PRUNE_MAX_COUNT',
		},
	},

	queue: {
		health: {
			active: {
				doc: 'If health checks should be enabled',
				format: 'Boolean',
				default: false,
				env: 'QUEUE_HEALTH_CHECK_ACTIVE',
			},
			port: {
				doc: 'Port to serve health check on if activated',
				format: Number,
				default: 5678,
				env: 'QUEUE_HEALTH_CHECK_PORT',
			},
		},
		bull: {
			prefix: {
				doc: 'Prefix for all bull queue keys',
				format: String,
				default: 'bull',
				env: 'QUEUE_BULL_PREFIX',
			},
			redis: {
				db: {
					doc: 'Redis DB',
					format: Number,
					default: 0,
					env: 'QUEUE_BULL_REDIS_DB',
				},
				host: {
					doc: 'Redis Host',
					format: String,
					default: 'localhost',
					env: 'QUEUE_BULL_REDIS_HOST',
				},
				password: {
					doc: 'Redis Password',
					format: String,
					default: '',
					env: 'QUEUE_BULL_REDIS_PASSWORD',
				},
				port: {
					doc: 'Redis Port',
					format: Number,
					default: 6379,
					env: 'QUEUE_BULL_REDIS_PORT',
				},
				timeoutThreshold: {
					doc: 'Redis timeout threshold',
					format: Number,
					default: 10000,
					env: 'QUEUE_BULL_REDIS_TIMEOUT_THRESHOLD',
				},
				username: {
					doc: 'Redis Username (needs Redis >= 6)',
					format: String,
					default: '',
					env: 'QUEUE_BULL_REDIS_USERNAME',
				},
				clusterNodes: {
					doc: 'Redis Cluster startup nodes (comma separated list of host:port pairs)',
					format: String,
					default: '',
					env: 'QUEUE_BULL_REDIS_CLUSTER_NODES',
				},
				tls: {
					format: 'Boolean',
					default: false,
					env: 'QUEUE_BULL_REDIS_TLS',
					doc: 'Enable TLS on Redis connections. Default: false',
				},
			},
			queueRecoveryInterval: {
				doc: 'If > 0 enables an active polling to the queue that can recover for Redis crashes. Given in seconds; 0 is disabled. May increase Redis traffic significantly.',
				format: Number,
				default: 60,
				env: 'QUEUE_RECOVERY_INTERVAL',
			},
			gracefulShutdownTimeout: {
				doc: 'How long should n8n wait for running executions before exiting worker process',
				format: Number,
				default: 30,
				env: 'QUEUE_WORKER_TIMEOUT',
			},
		},
	},

	generic: {
		// The timezone to use. Is important for nodes like "Cron" which start the
		// workflow automatically at a specified time. This setting can also be
		// overwritten on a per workflow basis in the workflow settings in the
		// editor.
		timezone: {
			doc: 'The timezone to use',
			format: '*',
			default: 'America/New_York',
			env: 'GENERIC_TIMEZONE',
		},

		instanceType: {
			doc: 'Type of n8n instance',
			format: ['main', 'webhook', 'worker'] as const,
			default: 'main',
		},

		releaseChannel: {
			doc: 'N8N release channel',
			format: ['stable', 'beta', 'nightly', 'dev'] as const,
			default: 'dev',
			env: 'N8N_RELEASE_TYPE',
		},
	},

	// How n8n can be reached (Editor & REST-API)
	path: {
		format: String,
		default: '/',
		arg: 'path',
		env: 'N8N_PATH',
		doc: 'Path n8n is deployed to',
	},
	host: {
		format: String,
		default: 'localhost',
		arg: 'host',
		env: 'N8N_HOST',
		doc: 'Host name n8n can be reached',
	},
	port: {
		format: Number,
		default: 5678,
		arg: 'port',
		env: 'N8N_PORT',
		doc: 'HTTP port n8n can be reached',
	},
	listen_address: {
		format: String,
		default: '0.0.0.0',
		env: 'N8N_LISTEN_ADDRESS',
		doc: 'IP address n8n should listen on',
	},
	protocol: {
		format: ['http', 'https'] as const,
		default: 'http',
		env: 'N8N_PROTOCOL',
		doc: 'HTTP Protocol via which n8n can be reached',
	},
	ssl_key: {
		format: String,
		default: '',
		env: 'N8N_SSL_KEY',
		doc: 'SSL Key for HTTPS Protocol',
	},
	ssl_cert: {
		format: String,
		default: '',
		env: 'N8N_SSL_CERT',
		doc: 'SSL Cert for HTTPS Protocol',
	},
	editorBaseUrl: {
		format: String,
		default: '',
		env: 'N8N_EDITOR_BASE_URL',
		doc: 'Public URL where the editor is accessible. Also used for emails sent from n8n.',
	},

	security: {
		restrictFileAccessTo: {
			doc: 'If set only files in that directories can be accessed. Multiple directories can be separated by semicolon (";").',
			format: String,
			default: '',
			env: 'N8N_RESTRICT_FILE_ACCESS_TO',
		},
		blockFileAccessToN8nFiles: {
			doc: 'If set to true it will block access to all files in the ".n8n" directory and user defined config files.',
			format: Boolean,
			default: true,
			env: 'N8N_BLOCK_FILE_ACCESS_TO_N8N_FILES',
		},
		audit: {
			daysAbandonedWorkflow: {
				doc: 'Days for a workflow to be considered abandoned if not executed',
				format: Number,
				default: 90,
				env: 'N8N_SECURITY_AUDIT_DAYS_ABANDONED_WORKFLOW',
			},
		},
		excludeEndpoints: {
			doc: 'Additional endpoints to exclude auth checks. Multiple endpoints can be separated by colon (":")',
			format: String,
			default: '',
			env: 'N8N_AUTH_EXCLUDE_ENDPOINTS',
		},
	},

	endpoints: {
		payloadSizeMax: {
			format: Number,
			default: 16,
			env: 'N8N_PAYLOAD_SIZE_MAX',
			doc: 'Maximum payload size in MB.',
		},
		metrics: {
			enable: {
				format: 'Boolean',
				default: false,
				env: 'N8N_METRICS',
				doc: 'Enable /metrics endpoint. Default: false',
			},
			prefix: {
				format: String,
				default: 'n8n_',
				env: 'N8N_METRICS_PREFIX',
				doc: 'An optional prefix for metric names. Default: n8n_',
			},
			includeDefaultMetrics: {
				format: Boolean,
				default: true,
				env: 'N8N_METRICS_INCLUDE_DEFAULT_METRICS',
				doc: 'Whether to expose default system and node.js metrics. Default: true',
			},
			includeWorkflowIdLabel: {
				format: Boolean,
				default: false,
				env: 'N8N_METRICS_INCLUDE_WORKFLOW_ID_LABEL',
				doc: 'Whether to include a label for the workflow ID on workflow metrics. Default: false',
			},
			includeNodeTypeLabel: {
				format: Boolean,
				default: false,
				env: 'N8N_METRICS_INCLUDE_NODE_TYPE_LABEL',
				doc: 'Whether to include a label for the node type on node metrics. Default: false',
			},
			includeCredentialTypeLabel: {
				format: Boolean,
				default: false,
				env: 'N8N_METRICS_INCLUDE_CREDENTIAL_TYPE_LABEL',
				doc: 'Whether to include a label for the credential type on credential metrics. Default: false',
			},
			includeApiEndpoints: {
				format: Boolean,
				default: false,
				env: 'N8N_METRICS_INCLUDE_API_ENDPOINTS',
				doc: 'Whether to expose metrics for API endpoints. Default: false',
			},
			includeApiPathLabel: {
				format: Boolean,
				default: false,
				env: 'N8N_METRICS_INCLUDE_API_PATH_LABEL',
				doc: 'Whether to include a label for the path of API invocations. Default: false',
			},
			includeApiMethodLabel: {
				format: Boolean,
				default: false,
				env: 'N8N_METRICS_INCLUDE_API_METHOD_LABEL',
				doc: 'Whether to include a label for the HTTP method (GET, POST, ...) of API invocations. Default: false',
			},
			includeApiStatusCodeLabel: {
				format: Boolean,
				default: false,
				env: 'N8N_METRICS_INCLUDE_API_STATUS_CODE_LABEL',
				doc: 'Whether to include a label for the HTTP status code (200, 404, ...) of API invocations. Default: false',
			},
			includeCacheMetrics: {
				format: Boolean,
				default: false,
				env: 'N8N_METRICS_INCLUDE_CACHE_METRICS',
				doc: 'Whether to include metrics for cache hits and misses. Default: false',
			},
			includeMessageEventBusMetrics: {
				format: Boolean,
				default: true,
				env: 'N8N_METRICS_INCLUDE_MESSAGE_EVENT_BUS_METRICS',
				doc: 'Whether to include metrics for events. Default: false',
			},
		},
		rest: {
			format: String,
			default: 'rest',
			env: 'N8N_ENDPOINT_REST',
			doc: 'Path for rest endpoint',
		},
		webhook: {
			format: String,
			default: 'webhook',
			env: 'N8N_ENDPOINT_WEBHOOK',
			doc: 'Path for webhook endpoint',
		},
		webhookWaiting: {
			format: String,
			default: 'webhook-waiting',
			env: 'N8N_ENDPOINT_WEBHOOK_WAIT',
			doc: 'Path for waiting-webhook endpoint',
		},
		webhookTest: {
			format: String,
			default: 'webhook-test',
			env: 'N8N_ENDPOINT_WEBHOOK_TEST',
			doc: 'Path for test-webhook endpoint',
		},
		disableUi: {
			format: Boolean,
			default: false,
			env: 'N8N_DISABLE_UI',
			doc: 'Disable N8N UI (Frontend).',
		},
		disableProductionWebhooksOnMainProcess: {
			format: Boolean,
			default: false,
			env: 'N8N_DISABLE_PRODUCTION_MAIN_PROCESS',
			doc: 'Disable production webhooks from main process. This helps ensures no http traffic load to main process when using webhook-specific processes.',
		},
		skipWebhooksDeregistrationOnShutdown: {
			/**
			 * Longer explanation: n8n de-registers webhooks on shutdown / deactivation
			 * and registers on startup / activation. If we skip
			 * deactivation on shutdown, webhooks will remain active on 3rd party services.
			 * We don't have to worry about startup as it always
			 * checks if webhooks already exist.
			 * If users want to upgrade n8n, it is possible to run
			 * two instances simultaneously without downtime, similar
			 * to blue/green deployment.
			 * WARNING: Trigger nodes (like Cron) will cause duplication
			 * of work, so be aware when using.
			 */
			doc: 'Deregister webhooks on external services only when workflows are deactivated.',
			format: Boolean,
			default: false,
			env: 'N8N_SKIP_WEBHOOK_DEREGISTRATION_SHUTDOWN',
		},
	},

	publicApi: {
		disabled: {
			format: Boolean,
			default: false,
			env: 'N8N_PUBLIC_API_DISABLED',
			doc: 'Whether to disable the Public API',
		},
		path: {
			format: String,
			default: 'api',
			env: 'N8N_PUBLIC_API_ENDPOINT',
			doc: 'Path for the public api endpoints',
		},
		swaggerUi: {
			disabled: {
				format: Boolean,
				default: false,
				env: 'N8N_PUBLIC_API_SWAGGERUI_DISABLED',
				doc: 'Whether to disable the Swagger UI for the Public API',
			},
		},
	},

	workflowTagsDisabled: {
		format: Boolean,
		default: false,
		env: 'N8N_WORKFLOW_TAGS_DISABLED',
		doc: 'Disable workflow tags.',
	},

	userManagement: {
		jwtSecret: {
			doc: 'Set a specific JWT secret (optional - n8n can generate one)', // Generated @ start.ts
			format: String,
			default: '',
			env: 'N8N_USER_MANAGEMENT_JWT_SECRET',
		},
		isInstanceOwnerSetUp: {
			// n8n loads this setting from DB on startup
			doc: "Whether the instance owner's account has been set up",
			format: Boolean,
			default: false,
		},
		emails: {
			mode: {
				doc: 'How to send emails',
				format: ['', 'smtp'] as const,
				default: 'smtp',
				env: 'N8N_EMAIL_MODE',
			},
			smtp: {
				host: {
					doc: 'SMTP server host',
					format: String, // e.g. 'smtp.gmail.com'
					default: '',
					env: 'N8N_SMTP_HOST',
				},
				port: {
					doc: 'SMTP server port',
					format: Number,
					default: 465,
					env: 'N8N_SMTP_PORT',
				},
				secure: {
					doc: 'Whether or not to use SSL for SMTP',
					format: Boolean,
					default: true,
					env: 'N8N_SMTP_SSL',
				},
				auth: {
					user: {
						doc: 'SMTP login username',
						format: String, // e.g.'you@gmail.com'
						default: '',
						env: 'N8N_SMTP_USER',
					},
					pass: {
						doc: 'SMTP login password',
						format: String,
						default: '',
						env: 'N8N_SMTP_PASS',
					},
				},
				sender: {
					doc: 'How to display sender name',
					format: String,
					default: '',
					env: 'N8N_SMTP_SENDER',
				},
			},
			templates: {
				invite: {
					doc: 'Overrides default HTML template for inviting new people (use full path)',
					format: String,
					default: '',
					env: 'N8N_UM_EMAIL_TEMPLATES_INVITE',
				},
				passwordReset: {
					doc: 'Overrides default HTML template for resetting password (use full path)',
					format: String,
					default: '',
					env: 'N8N_UM_EMAIL_TEMPLATES_PWRESET',
				},
			},
		},
		authenticationMethod: {
			doc: 'How to authenticate users (e.g. "email", "ldap", "saml")',
			format: ['email', 'ldap', 'saml'] as const,
			default: 'email',
		},
	},

	externalFrontendHooksUrls: {
		doc: 'URLs to external frontend hooks files, ; separated',
		format: String,
		default: '',
		env: 'EXTERNAL_FRONTEND_HOOKS_URLS',
	},

	externalHookFiles: {
		doc: 'Files containing external hooks. Multiple files can be separated by colon (":")',
		format: String,
		default: '',
		env: 'EXTERNAL_HOOK_FILES',
	},

	nodes: {
		include: {
			doc: 'Nodes to load',
			format: 'json-string-array',
			default: undefined,
			env: 'NODES_INCLUDE',
		},
		exclude: {
			doc: 'Nodes not to load',
			format: 'json-string-array',
			default: undefined,
			env: 'NODES_EXCLUDE',
		},
		errorTriggerType: {
			doc: 'Node Type to use as Error Trigger',
			format: String,
			default: 'n8n-nodes-base.errorTrigger',
			env: 'NODES_ERROR_TRIGGER_TYPE',
		},
		communityPackages: {
			enabled: {
				doc: 'Allows you to disable the usage of community packages for nodes',
				format: Boolean,
				default: true,
				env: 'N8N_COMMUNITY_PACKAGES_ENABLED',
			},
		},
		packagesMissing: {
			// Used to have a persistent list of packages
			doc: 'Contains a comma separated list of packages that failed to load during startup',
			format: String,
			default: '',
		},
	},

	logs: {
		level: {
			doc: 'Log output level',
			format: ['error', 'warn', 'info', 'verbose', 'debug', 'silent'] as const,
			default: 'info',
			env: 'N8N_LOG_LEVEL',
		},
		output: {
			doc: 'Where to output logs. Options are: console, file. Multiple can be separated by comma (",")',
			format: String,
			default: 'console',
			env: 'N8N_LOG_OUTPUT',
		},
		file: {
			fileCountMax: {
				doc: 'Maximum number of files to keep.',
				format: Number,
				default: 100,
				env: 'N8N_LOG_FILE_COUNT_MAX',
			},
			fileSizeMax: {
				doc: 'Maximum size for each log file in MB.',
				format: Number,
				default: 16,
				env: 'N8N_LOG_FILE_SIZE_MAX',
			},
			location: {
				doc: 'Log file location; only used if log output is set to file.',
				format: String,
				default: path.join(UserSettings.getUserN8nFolderPath(), 'logs/n8n.log'),
				env: 'N8N_LOG_FILE_LOCATION',
			},
		},
	},

	versionNotifications: {
		enabled: {
			doc: 'Whether feature is enabled to request notifications about new versions and security updates.',
			format: Boolean,
			default: true,
			env: 'N8N_VERSION_NOTIFICATIONS_ENABLED',
		},
		endpoint: {
			doc: 'Endpoint to retrieve version information from.',
			format: String,
			default: 'https://api.n8n.io/api/versions/',
			env: 'N8N_VERSION_NOTIFICATIONS_ENDPOINT',
		},
		infoUrl: {
			doc: "Url in New Versions Panel with more information on updating one's instance.",
			format: String,
			default: 'https://docs.n8n.io/getting-started/installation/updating.html',
			env: 'N8N_VERSION_NOTIFICATIONS_INFO_URL',
		},
	},

	templates: {
		enabled: {
			doc: 'Whether templates feature is enabled to load workflow templates.',
			format: Boolean,
			default: true,
			env: 'N8N_TEMPLATES_ENABLED',
		},
		host: {
			doc: 'Endpoint host to retrieve workflow templates from endpoints.',
			format: String,
			default: 'https://api.n8n.io/api/',
			env: 'N8N_TEMPLATES_HOST',
		},
	},

	push: {
		backend: {
			format: ['sse', 'websocket'] as const,
			default: 'websocket',
			env: 'N8N_PUSH_BACKEND',
			doc: 'Backend to use for push notifications',
		},
	},

	binaryDataManager: {
		availableModes: {
			format: 'comma-separated-list',
			default: 'filesystem',
			env: 'N8N_AVAILABLE_BINARY_DATA_MODES',
			doc: 'Available modes of binary data storage, as comma separated strings',
		},
		mode: {
			format: ['default', 'filesystem'] as const,
			default: 'default',
			env: 'N8N_DEFAULT_BINARY_DATA_MODE',
			doc: 'Storage mode for binary data',
		},
		localStoragePath: {
			format: String,
			default: path.join(UserSettings.getUserN8nFolderPath(), 'binaryData'),
			env: 'N8N_BINARY_DATA_STORAGE_PATH',
			doc: 'Path for binary data storage in "filesystem" mode',
		},
	},

	deployment: {
		type: {
			format: String,
			default: 'default',
			env: 'N8N_DEPLOYMENT_TYPE',
		},
	},

	mfa: {
		enabled: {
			format: Boolean,
			default: true,
			doc: 'Whether to enable MFA feature in instance.',
			env: 'N8N_MFA_ENABLED',
		},
	},

	sso: {
		justInTimeProvisioning: {
			format: Boolean,
			default: true,
			doc: 'Whether to automatically create users when they login via SSO.',
		},
		redirectLoginToSso: {
			format: Boolean,
			default: true,
			doc: 'Whether to automatically redirect users from login dialog to initialize SSO flow.',
		},
		saml: {
			loginEnabled: {
				format: Boolean,
				default: false,
				doc: 'Whether to enable SAML SSO.',
			},
			loginLabel: {
				format: String,
				default: '',
			},
		},
		ldap: {
			loginEnabled: {
				format: Boolean,
				default: false,
			},
			loginLabel: {
				format: String,
				default: '',
			},
		},
	},

	hiringBanner: {
		enabled: {
			doc: 'Whether hiring banner in browser console is enabled.',
			format: Boolean,
			default: true,
			env: 'N8N_HIRING_BANNER_ENABLED',
		},
	},

	personalization: {
		enabled: {
			doc: 'Whether personalization is enabled.',
			format: Boolean,
			default: true,
			env: 'N8N_PERSONALIZATION_ENABLED',
		},
	},

	diagnostics: {
		enabled: {
			doc: 'Whether diagnostic mode is enabled.',
			format: Boolean,
			default: true,
			env: 'N8N_DIAGNOSTICS_ENABLED',
		},
		config: {
			posthog: {
				apiKey: {
					doc: 'API key for PostHog',
					format: String,
					default: 'phc_4URIAm1uYfJO7j8kWSe0J8lc8IqnstRLS7Jx8NcakHo',
					env: 'N8N_DIAGNOSTICS_POSTHOG_API_KEY',
				},
				apiHost: {
					doc: 'API host for PostHog',
					format: String,
					default: 'https://ph.n8n.io',
					env: 'N8N_DIAGNOSTICS_POSTHOG_API_HOST',
				},
				disableSessionRecording: {
					doc: 'Disable posthog session recording',
					format: Boolean,
					default: true,
					env: 'N8N_DIAGNOSTICS_POSTHOG_DISABLE_RECORDING',
				},
			},
			sentry: {
				dsn: {
					doc: 'Data source name for error tracking on Sentry',
					format: String,
					default: '',
					env: 'N8N_SENTRY_DSN',
				},
			},
			frontend: {
				doc: 'Diagnostics config for frontend.',
				format: String,
				default: '1zPn9bgWPzlQc0p8Gj1uiK6DOTn;https://telemetry.n8n.io',
				env: 'N8N_DIAGNOSTICS_CONFIG_FRONTEND',
			},
			backend: {
				doc: 'Diagnostics config for backend.',
				format: String,
				default: '1zPn7YoGC3ZXE9zLeTKLuQCB4F6;https://telemetry.n8n.io/v1/batch',
				env: 'N8N_DIAGNOSTICS_CONFIG_BACKEND',
			},
		},
	},

	defaultLocale: {
		doc: 'Default locale for the UI',
		format: String,
		default: 'en',
		env: 'N8N_DEFAULT_LOCALE',
	},

	onboardingCallPrompt: {
		enabled: {
			doc: 'Whether onboarding call prompt feature is available',
			format: Boolean,
			default: true,
			env: 'N8N_ONBOARDING_CALL_PROMPTS_ENABLED',
		},
	},

	license: {
		serverUrl: {
			format: String,
			default: 'https://license.n8n.io/v1',
			env: 'N8N_LICENSE_SERVER_URL',
			doc: 'License server url to retrieve license.',
		},
		autoRenewEnabled: {
			format: Boolean,
			default: true,
			env: 'N8N_LICENSE_AUTO_RENEW_ENABLED',
			doc: 'Whether auto renewal for licenses is enabled.',
		},
		autoRenewOffset: {
			format: Number,
			default: 60 * 60 * 72, // 72 hours
			env: 'N8N_LICENSE_AUTO_RENEW_OFFSET',
			doc: 'How many seconds before expiry a license should get automatically renewed. ',
		},
		activationKey: {
			format: String,
			default: '',
			env: 'N8N_LICENSE_ACTIVATION_KEY',
			doc: 'Activation key to initialize license',
		},
		tenantId: {
			format: Number,
			default: 1,
			env: 'N8N_LICENSE_TENANT_ID',
			doc: 'Tenant id used by the license manager',
		},
		cert: {
			format: String,
			default: '',
			env: 'N8N_LICENSE_CERT',
			doc: 'Ephemeral license certificate',
		},
	},

	hideUsagePage: {
		format: Boolean,
		default: false,
		env: 'N8N_HIDE_USAGE_PAGE',
		doc: 'Hide or show the usage page',
	},

	eventBus: {
		checkUnsentInterval: {
			doc: 'How often (in ms) to check for unsent event messages. Can in rare cases cause a message to be sent twice. 0=disabled',
			format: Number,
			default: 0,
			env: 'N8N_EVENTBUS_CHECKUNSENTINTERVAL',
		},
		logWriter: {
			keepLogCount: {
				doc: 'How many event log files to keep.',
				format: Number,
				default: 3,
				env: 'N8N_EVENTBUS_LOGWRITER_KEEPLOGCOUNT',
			},
			maxFileSizeInKB: {
				doc: 'Maximum size of an event log file before a new one is started.',
				format: Number,
				default: 10240, // 10MB
				env: 'N8N_EVENTBUS_LOGWRITER_MAXFILESIZEINKB',
			},
			logBaseName: {
				doc: 'Basename of the event log file.',
				format: String,
				default: 'n8nEventLog',
				env: 'N8N_EVENTBUS_LOGWRITER_LOGBASENAME',
			},
		},
		crashRecoveryMode: {
			doc: 'Should n8n try to recover execution details after a crash, or just mark pending executions as crashed',
			format: ['simple', 'extensive'] as const,
			default: 'extensive',
			env: 'N8N_EVENTBUS_RECOVERY_MODE',
		},
	},

	redis: {
		prefix: {
			doc: 'Prefix for all n8n related keys',
			format: String,
			default: 'n8n',
			env: 'N8N_REDIS_KEY_PREFIX',
		},
		queueModeId: {
			doc: 'Unique ID for this n8n instance, is usually set automatically by n8n during startup',
			format: String,
			default: '',
		},
	},

	cache: {
		enabled: {
			doc: 'Whether caching is enabled',
			format: Boolean,
			default: true,
			env: 'N8N_CACHE_ENABLED',
		},
		backend: {
			doc: 'Backend to use for caching',
			format: ['memory', 'redis', 'auto'] as const,
			default: 'auto',
			env: 'N8N_CACHE_BACKEND',
		},
		memory: {
			maxSize: {
				doc: 'Maximum size of memory cache in bytes',
				format: Number,
				default: 3 * 1024 * 1024, // 3 MB
				env: 'N8N_CACHE_MEMORY_MAX_SIZE',
			},
			ttl: {
				doc: 'Time to live for cached items in memory (in ms)',
				format: Number,
				default: 3600 * 1000, // 1 hour
				env: 'N8N_CACHE_MEMORY_TTL',
			},
		},
		redis: {
			prefix: {
				doc: 'Prefix for all cache keys',
				format: String,
				default: 'cache',
				env: 'N8N_CACHE_REDIS_KEY_PREFIX',
			},
			ttl: {
				doc: 'Time to live for cached items in redis (in ms), 0 for no TTL',
				format: Number,
				default: 3600 * 1000, // 1 hour
				env: 'N8N_CACHE_REDIS_TTL',
			},
		},
	},

	ai: {
		enabled: {
			doc: 'Whether AI features are enabled',
			format: Boolean,
			default: false,
			env: 'N8N_AI_ENABLED',
		},
	},

	expression: {
		evaluator: {
			doc: 'Expression evaluator to use',
			format: ['tmpl', 'tournament'] as const,
			default: 'tournament',
			env: 'N8N_EXPRESSION_EVALUATOR',
		},
		reportDifference: {
			doc: 'Whether to report differences in the evaluator outputs',
			format: Boolean,
			default: false,
			env: 'N8N_EXPRESSION_REPORT_DIFFERENCE',
		},
	},

	sourceControl: {
		defaultKeyPairType: {
			doc: 'Default SSH key type to use when generating SSH keys',
			format: ['rsa', 'ed25519'] as const,
			default: 'ed25519',
			env: 'N8N_SOURCECONTROL_DEFAULT_SSH_KEY_TYPE',
		},
	},

	workflowHistory: {
		enabled: {
			doc: 'Whether to save workflow history versions',
			format: Boolean,
			default: true,
			env: 'N8N_WORKFLOW_HISTORY_ENABLED',
		},

		pruneTime: {
			doc: 'Time (in hours) to keep workflow history versions for',
			format: Number,
			default: -1,
			env: 'N8N_WORKFLOW_HISTORY_PRUNE_TIME',
		},
	},
};
