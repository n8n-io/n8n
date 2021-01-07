import * as convict from 'convict';
import * as dotenv from 'dotenv';

dotenv.config();

const config = convict({

	database: {
		type: {
			doc: 'Type of database to use',
			format: ['sqlite', 'mariadb', 'mongodb', 'mysqldb', 'postgresdb'],
			default: 'sqlite',
			env: 'DB_TYPE',
		},
		mongodb: {
			connectionUrl: {
				doc: 'MongoDB Connection URL',
				format: '*',
				default: 'mongodb://user:password@localhost:27017/database',
				env: 'DB_MONGODB_CONNECTION_URL',
			},
		},
		tablePrefix: {
			doc: 'Prefix for table names',
			format: '*',
			default: '',
			env: 'DB_TABLE_PREFIX',
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
				doc: 'MySQL Database',
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
				// Format: { CREDENTIAL_NAME: { PARAMTER: VALUE }}
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
	},

	executions: {

		// By default workflows get always executed in their own process.
		// If this option gets set to "main" it will run them in the
		// main-process instead.
		process: {
			doc: 'In what process workflows should be executed',
			format: ['main', 'own'],
			default: 'own',
			env: 'EXECUTIONS_PROCESS',
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
			format: ['all', 'none'],
			default: 'all',
			env: 'EXECUTIONS_DATA_SAVE_ON_ERROR',
		},
		saveDataOnSuccess: {
			doc: 'What workflow execution data to save on success',
			format: ['all', 'none'],
			default: 'all',
			env: 'EXECUTIONS_DATA_SAVE_ON_SUCCESS',
		},

		// If the executions of workflows which got started via the editor
		// should be saved. By default they will not be saved as this runs
		// are normally only for testing and debugging. This setting can
		// also be overwritten on a per workflow basis in the workflow settings
		// in the editor.
		saveDataManualExecutions: {
			doc: 'Save data of executions when started manually via editor',
			format: 'Boolean',
			default: false,
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
			default: false,
			env: 'EXECUTIONS_DATA_PRUNE',
		},
		pruneDataMaxAge: {
			doc: 'How old (hours) the execution data has to be to get deleted',
			format: Number,
			default: 336,
			env: 'EXECUTIONS_DATA_MAX_AGE',
		},
		pruneDataTimeout: {
			doc: 'Timeout (seconds) after execution data has been pruned',
			format: Number,
			default: 3600,
			env: 'EXECUTIONS_DATA_PRUNE_TIMEOUT',
		},
	},

	generic: {
		// The timezone to use. Is important for nodes like "Cron" which start the
		// workflow automatically at a specified time. This setting can also be
		// overwritten on a per worfklow basis in the workflow settings in the
		// editor.
		timezone: {
			doc: 'The timezone to use',
			format: '*',
			default: 'America/New_York',
			env: 'GENERIC_TIMEZONE',
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
		format: ['http', 'https'],
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

	security: {
		excludeEndpoints: {
			doc: 'Additional endpoints to exclude auth checks. Multiple endpoints can be separated by colon (":")',
			format: String,
			default: '',
			env: 'N8N_AUTH_EXCLUDE_ENDPOINTS',
		},
		basicAuth: {
			active: {
				format: 'Boolean',
				default: false,
				env: 'N8N_BASIC_AUTH_ACTIVE',
				doc: 'If basic auth should be activated for editor and REST-API',
			},
			user: {
				format: String,
				default: '',
				env: 'N8N_BASIC_AUTH_USER',
				doc: 'The name of the basic auth user',
			},
			password: {
				format: String,
				default: '',
				env: 'N8N_BASIC_AUTH_PASSWORD',
				doc: 'The password of the basic auth user',
			},
			hash: {
				format: 'Boolean',
				default: false,
				env: 'N8N_BASIC_AUTH_HASH',
				doc: 'If password for basic auth is hashed',
			},
		},
		jwtAuth: {
			active: {
				format: 'Boolean',
				default: false,
				env: 'N8N_JWT_AUTH_ACTIVE',
				doc: 'If JWT auth should be activated for editor and REST-API',
			},
			jwtHeader: {
				format: String,
				default: '',
				env: 'N8N_JWT_AUTH_HEADER',
				doc: 'The request header containing a signed JWT',
			},
			jwtHeaderValuePrefix: {
				format: String,
				default: '',
				env: 'N8N_JWT_AUTH_HEADER_VALUE_PREFIX',
				doc: 'The request header value prefix to strip (optional)',
			},
			jwksUri: {
				format: String,
				default: '',
				env: 'N8N_JWKS_URI',
				doc: 'The URI to fetch JWK Set for JWT authentication',
			},
			jwtIssuer: {
				format: String,
				default: '',
				env: 'N8N_JWT_ISSUER',
				doc: 'JWT issuer to expect (optional)',
			},
			jwtNamespace: {
				format: String,
				default: '',
				env: 'N8N_JWT_NAMESPACE',
				doc: 'JWT namespace to expect (optional)',
			},
			jwtAllowedTenantKey: {
				format: String,
				default: '',
				env: 'N8N_JWT_ALLOWED_TENANT_KEY',
				doc: 'JWT tenant key name to inspect within JWT namespace (optional)',
			},
			jwtAllowedTenant: {
				format: String,
				default: '',
				env: 'N8N_JWT_ALLOWED_TENANT',
				doc: 'JWT tenant to allow (optional)',
			},
		},
	},

	endpoints: {
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
		webhookTest: {
			format: String,
			default: 'webhook-test',
			env: 'N8N_ENDPOINT_WEBHOOK_TEST',
			doc: 'Path for test-webhook endpoint',
		},
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
			format: function check(rawValue) {
				if (rawValue === '') {
					return;
				}
				try {
					const values = JSON.parse(rawValue);
					if (!Array.isArray(values)) {
						throw new Error();
					}

					for (const value of values) {
						if (typeof value !== 'string') {
							throw new Error();
						}
					}
				} catch (error) {
					throw new TypeError(`The Nodes to include is not a valid Array of strings.`);
				}
			},
			default: undefined,
			env: 'NODES_INCLUDE',
		},
		exclude: {
			doc: 'Nodes not to load',
			format: function check(rawValue) {
				try {
					const values = JSON.parse(rawValue);
					if (!Array.isArray(values)) {
						throw new Error();
					}

					for (const value of values) {
						if (typeof value !== 'string') {
							throw new Error();
						}
					}

				} catch (error) {
					throw new TypeError(`The Nodes to exclude is not a valid Array of strings.`);
				}
			},
			default: '[]',
			env: 'NODES_EXCLUDE',
		},
		errorTriggerType: {
			doc: 'Node Type to use as Error Trigger',
			format: String,
			default: 'n8n-nodes-base.errorTrigger',
			env: 'NODES_ERROR_TRIGGER_TYPE',
		},
	},

});

// Overwrite default configuration with settings which got defined in
// optional configuration files
if (process.env.N8N_CONFIG_FILES !== undefined) {
	const configFiles = process.env.N8N_CONFIG_FILES.split(',');
	console.log(`\nLoading configuration overwrites from:\n - ${configFiles.join('\n - ')}\n`);

	config.loadFile(configFiles);
}

config.validate({
	allowed: 'strict',
});

export = config;
