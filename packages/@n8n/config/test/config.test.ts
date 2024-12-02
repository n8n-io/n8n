import fs from 'fs';
import { mock } from 'jest-mock-extended';
import { Container } from 'typedi';

import { GlobalConfig } from '../src/index';

jest.mock('fs');
const mockFs = mock<typeof fs>();
fs.readFileSync = mockFs.readFileSync;

describe('GlobalConfig', () => {
	beforeEach(() => {
		Container.reset();
	});

	const originalEnv = process.env;
	afterEach(() => {
		process.env = originalEnv;
	});

	// deepCopy for diff to show plain objects
	// eslint-disable-next-line n8n-local-rules/no-json-parse-json-stringify
	const deepCopy = <T>(obj: T): T => JSON.parse(JSON.stringify(obj));

	const defaultConfig: GlobalConfig = {
		path: '/',
		host: 'localhost',
		port: 5678,
		listen_address: '0.0.0.0',
		protocol: 'http',
		database: {
			logging: {
				enabled: false,
				maxQueryExecutionTime: 0,
				options: 'error',
			},
			mysqldb: {
				database: 'n8n',
				host: 'localhost',
				password: '',
				port: 3306,
				user: 'root',
			},
			postgresdb: {
				database: 'n8n',
				host: 'localhost',
				password: '',
				poolSize: 2,
				port: 5432,
				schema: 'public',
				connectionTimeoutMs: 20_000,
				ssl: {
					ca: '',
					cert: '',
					enabled: false,
					key: '',
					rejectUnauthorized: true,
				},
				user: 'postgres',
			},
			sqlite: {
				database: 'database.sqlite',
				enableWAL: false,
				executeVacuumOnStartup: false,
				poolSize: 0,
			},
			tablePrefix: '',
			type: 'sqlite',
		},
		credentials: {
			defaultName: 'My credentials',
			overwrite: {
				data: '{}',
				endpoint: '',
			},
		},
		userManagement: {
			emails: {
				mode: 'smtp',
				smtp: {
					host: '',
					port: 465,
					secure: true,
					sender: '',
					startTLS: true,
					auth: {
						pass: '',
						user: '',
						privateKey: '',
						serviceClient: '',
					},
				},
				template: {
					'credentials-shared': '',
					'user-invited': '',
					'password-reset-requested': '',
					'workflow-shared': '',
				},
			},
		},
		eventBus: {
			checkUnsentInterval: 0,
			crashRecoveryMode: 'extensive',
			logWriter: {
				keepLogCount: 3,
				logBaseName: 'n8nEventLog',
				maxFileSizeInKB: 10240,
			},
		},
		externalSecrets: {
			preferGet: false,
			updateInterval: 300,
		},
		nodes: {
			communityPackages: {
				enabled: true,
				registry: 'https://registry.npmjs.org',
				reinstallMissing: false,
			},
			errorTriggerType: 'n8n-nodes-base.errorTrigger',
			include: [],
			exclude: [],
		},
		publicApi: {
			disabled: false,
			path: 'api',
			swaggerUiDisabled: false,
		},
		templates: {
			enabled: true,
			host: 'https://api.n8n.io/api/',
		},
		versionNotifications: {
			enabled: true,
			endpoint: 'https://api.n8n.io/api/versions/',
			infoUrl: 'https://docs.n8n.io/hosting/installation/updating/',
		},
		externalStorage: {
			s3: {
				host: '',
				bucket: {
					name: '',
					region: '',
				},
				credentials: {
					accessKey: '',
					accessSecret: '',
				},
			},
		},
		workflows: {
			defaultName: 'My workflow',
			callerPolicyDefaultOption: 'workflowsFromSameOwner',
		},
		endpoints: {
			metrics: {
				enable: false,
				prefix: 'n8n_',
				includeWorkflowIdLabel: false,
				includeDefaultMetrics: true,
				includeMessageEventBusMetrics: false,
				includeNodeTypeLabel: false,
				includeCacheMetrics: false,
				includeApiEndpoints: false,
				includeApiPathLabel: false,
				includeApiMethodLabel: false,
				includeCredentialTypeLabel: false,
				includeApiStatusCodeLabel: false,
				includeQueueMetrics: false,
				queueMetricsInterval: 20,
			},
			additionalNonUIRoutes: '',
			disableProductionWebhooksOnMainProcess: false,
			disableUi: false,
			form: 'form',
			formTest: 'form-test',
			formWaiting: 'form-waiting',
			payloadSizeMax: 16,
			formDataFileSizeMax: 200,
			rest: 'rest',
			webhook: 'webhook',
			webhookTest: 'webhook-test',
			webhookWaiting: 'webhook-waiting',
		},
		cache: {
			backend: 'auto',
			memory: {
				maxSize: 3145728,
				ttl: 3600000,
			},
			redis: {
				prefix: 'cache',
				ttl: 3600000,
			},
		},
		queue: {
			health: {
				active: false,
				port: 5678,
				address: '0.0.0.0',
			},
			bull: {
				redis: {
					db: 0,
					host: 'localhost',
					password: '',
					port: 6379,
					timeoutThreshold: 10_000,
					username: '',
					clusterNodes: '',
					tls: false,
				},
				gracefulShutdownTimeout: 30,
				prefix: 'bull',
				settings: {
					lockDuration: 30_000,
					lockRenewTime: 15_000,
					stalledInterval: 30_000,
					maxStalledCount: 1,
				},
			},
		},
		taskRunners: {
			enabled: false,
			mode: 'internal',
			path: '/runners',
			authToken: '',
			listenAddress: '127.0.0.1',
			maxPayload: 1024 * 1024 * 1024,
			port: 5679,
			maxOldSpaceSize: '',
			maxConcurrency: 5,
			taskTimeout: 60,
			heartbeatInterval: 30,
		},
		sentry: {
			backendDsn: '',
			frontendDsn: '',
		},
		logging: {
			level: 'info',
			outputs: ['console'],
			file: {
				fileCountMax: 100,
				fileSizeMax: 16,
				location: 'logs/n8n.log',
			},
			scopes: [],
		},
		multiMainSetup: {
			enabled: false,
			ttl: 10,
			interval: 3,
		},
		generic: {
			timezone: 'America/New_York',
			releaseChannel: 'dev',
			gracefulShutdownTimeout: 30,
		},
		license: {
			serverUrl: 'https://license.n8n.io/v1',
			autoRenewalEnabled: true,
			autoRenewOffset: 60 * 60 * 72,
			activationKey: '',
			tenantId: 1,
			cert: '',
		},
		security: {
			restrictFileAccessTo: '',
			blockFileAccessToN8nFiles: true,
			daysAbandonedWorkflow: 90,
		},
		executions: {
			pruneData: true,
			pruneDataMaxAge: 336,
			pruneDataMaxCount: 10_000,
			pruneDataHardDeleteBuffer: 1,
			pruneDataIntervals: {
				hardDelete: 15,
				softDelete: 60,
			},
		},
		diagnostics: {
			enabled: true,
			frontendConfig: '1zPn9bgWPzlQc0p8Gj1uiK6DOTn;https://telemetry.n8n.io',
			backendConfig: '1zPn7YoGC3ZXE9zLeTKLuQCB4F6;https://telemetry.n8n.io',
			posthogConfig: {
				apiKey: 'phc_4URIAm1uYfJO7j8kWSe0J8lc8IqnstRLS7Jx8NcakHo',
				apiHost: 'https://ph.n8n.io',
			},
		},
	};

	it('should use all default values when no env variables are defined', () => {
		process.env = {};
		const config = Container.get(GlobalConfig);
		expect(deepCopy(config)).toEqual(defaultConfig);
		expect(mockFs.readFileSync).not.toHaveBeenCalled();
	});

	it('should use values from env variables when defined', () => {
		process.env = {
			DB_POSTGRESDB_HOST: 'some-host',
			DB_POSTGRESDB_USER: 'n8n',
			DB_TABLE_PREFIX: 'test_',
			NODES_INCLUDE: '["n8n-nodes-base.hackerNews"]',
			DB_LOGGING_MAX_EXECUTION_TIME: '0',
			N8N_METRICS: 'TRUE',
			N8N_TEMPLATES_ENABLED: '0',
		};
		const config = Container.get(GlobalConfig);
		expect(deepCopy(config)).toEqual({
			...defaultConfig,
			database: {
				logging: defaultConfig.database.logging,
				mysqldb: defaultConfig.database.mysqldb,
				postgresdb: {
					...defaultConfig.database.postgresdb,
					host: 'some-host',
					user: 'n8n',
				},
				sqlite: defaultConfig.database.sqlite,
				tablePrefix: 'test_',
				type: 'sqlite',
			},
			endpoints: {
				...defaultConfig.endpoints,
				metrics: {
					...defaultConfig.endpoints.metrics,
					enable: true,
				},
			},
			nodes: {
				...defaultConfig.nodes,
				include: ['n8n-nodes-base.hackerNews'],
			},
			templates: {
				...defaultConfig.templates,
				enabled: false,
			},
		});
		expect(mockFs.readFileSync).not.toHaveBeenCalled();
	});

	it('should read values from files using _FILE env variables', () => {
		const passwordFile = '/path/to/postgres/password';
		process.env = {
			DB_POSTGRESDB_PASSWORD_FILE: passwordFile,
		};
		mockFs.readFileSync.calledWith(passwordFile, 'utf8').mockReturnValueOnce('password-from-file');

		const config = Container.get(GlobalConfig);
		expect(deepCopy(config)).toEqual({
			...defaultConfig,
			database: {
				...defaultConfig.database,
				postgresdb: {
					...defaultConfig.database.postgresdb,
					password: 'password-from-file',
				},
			},
		});
		expect(mockFs.readFileSync).toHaveBeenCalled();
	});
});
