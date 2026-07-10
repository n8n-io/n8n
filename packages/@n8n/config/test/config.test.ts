import { Container } from '@n8n/di';
import { tmpdir } from 'node:os';
import path from 'node:path';
import type { MockInstance } from 'vitest';

import type { DatabaseConfig } from '../src/index';
import { GlobalConfig, SSRF_DEFAULT_BLOCKED_IP_RANGES } from '../src/index';

const { readFileSyncMock } = vi.hoisted(() => ({
	readFileSyncMock: vi.fn(),
}));

vi.mock('node:fs', () => ({
	readFileSync: readFileSyncMock,
}));

// `restoreMocks` restores spies before each test, so this is re-established in beforeEach.
let consoleWarnMock: MockInstance;

// Ignore the sanitize function from the GlobalConfig nested types
type ConfigShape<T> = T extends ReadonlyArray<infer U>
	? Array<ConfigShape<U>>
	: T extends object
		? {
				[K in keyof T as K extends 'sanitize'
					? never
					: T[K] extends (...args: unknown[]) => unknown
						? never
						: K]: ConfigShape<T[K]>;
			}
		: T;

type GlobalConfigShape = ConfigShape<GlobalConfig>;

describe('GlobalConfig', () => {
	beforeEach(() => {
		Container.reset();
		vi.clearAllMocks();
		consoleWarnMock = vi.spyOn(console, 'warn').mockImplementation(() => {});
	});

	const originalEnv = process.env;
	afterEach(() => {
		process.env = originalEnv;
	});

	const defaultConfig = {
		path: '/',
		host: 'localhost',
		port: 5678,
		listen_address: '::',
		protocol: 'http',
		auth: {
			cookie: {
				samesite: 'lax',
				secure: true,
			},
			oauthBrowserBinding: false,
		},
		defaultLocale: 'en',
		hideUsagePage: false,
		deployment: {
			type: 'default',
		},
		mfa: {
			enabled: true,
		},
		hiringBanner: {
			enabled: true,
		},
		personalization: {
			enabled: true,
		},
		proxy_hops: 0,
		ssl_key: '',
		ssl_cert: '',
		canvasOnly: false,
		editorBaseUrl: '',
		webhookUrl: '',
		dataTable: {
			maxSize: 200 * 1024 * 1024,
			sizeCheckCacheDuration: 5 * 1000,
			cleanupIntervalMs: 60 * 1000,
			fileMaxAgeMs: 2 * 60 * 1000,
			uploadDir: path.join(tmpdir(), 'n8nDataTableUploads'),
		},
		database: {
			logging: {
				enabled: false,
				maxQueryExecutionTime: 0,
				options: 'error',
			},
			postgresdb: {
				database: 'n8n',
				host: 'localhost',
				password: '',
				poolSize: 2,
				port: 5432,
				schema: 'public',
				connectionTimeoutMs: 20_000,
				destroyTimeoutMs: 10_000,
				idleTimeoutMs: 30_000,
				statementTimeoutMs: 5 * 60 * 1000,
				maxConnectionLifetimeMs: 60 * 60 * 1000,
				keepAlive: true,
				keepAliveInitialDelayMs: 10_000,
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
				executeVacuumOnStartup: false,
				poolSize: 3,
			},
			tablePrefix: '',
			type: 'sqlite',
			pingIntervalSeconds: 2,
			pingTimeoutMs: 5_000,
			pingMaxFailuresBeforeRecovery: 3,
			minRecoveryBackoffMs: 1_000,
			maxRecoveryBackoffMs: 30_000,
			connectionAcquisitionTimeoutMs: 30_000,
			startupConnectMaxRetries: 5,
		} as DatabaseConfig,
		credentials: {
			defaultName: 'My credentials',
			overwrite: {
				data: '{}',
				endpoint: '',
				endpointAuthToken: '',
				persistence: false,
				skipTypes: [],
			},
		},
		userManagement: {
			inviteLinksEmailOnly: false,
			jwtSecret: '',
			jwtSessionDurationHours: 168,
			jwtRefreshTimeoutHours: 0,
			password: {
				minLength: 8,
			},
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
					'workflow-deactivated': '',
					'workflow-failure': '',
					'workflow-shared': '',
					'project-shared': '',
					'api-key-revoked': '',
				},
			},
		},
		eventBus: {
			checkUnsentInterval: 0,
			crashRecoveryMode: 'extensive',
			logWriter: {
				keepLogCount: 3,
				logBaseName: 'n8nEventLog',
				logFullPath: '',
				maxFileSizeInKB: 10240,
				maxMessagesPerParse: 10_000,
				maxTotalMessagesPerFile: 500_000,
			},
		},
		externalHooks: {
			separator: ':',
			files: [],
		},
		nodes: {
			errorTriggerType: 'n8n-nodes-base.errorTrigger',
			include: [],
			exclude: ['n8n-nodes-base.executeCommand', 'n8n-nodes-base.localFileTrigger'],
			pythonEnabled: true,
			mergeSqlSandboxMemoryLimitMb: 64,
		},
		publicApi: {
			disabled: false,
			path: 'api',
			swaggerUiDisabled: false,
		},
		templates: {
			enabled: true,
			host: 'https://api.n8n.io/api/',
			dynamicTemplatesHost: 'https://dynamic-templates.n8n.io/templates',
		},
		versionNotifications: {
			enabled: true,
			endpoint: 'https://api.n8n.io/api/versions/',
			whatsNewEnabled: true,
			whatsNewEndpoint: 'https://api.n8n.io/api/whats-new',
			infoUrl: 'https://docs.n8n.io/hosting/installation/updating/',
		},
		dynamicBanners: {
			endpoint: 'https://api.n8n.io/api/banners',
			enabled: true,
		},
		workflows: {
			defaultName: 'My workflow',
			callerPolicyDefaultOption: 'workflowsFromSameOwner',
			activationBatchSize: 1,
			indexingBatchSize: 10,
			useWorkflowPublicationService: false,
			publicationOutboxPollIntervalMs: 15_000,
			publicationOutboxLeaseSeconds: 120,
			workflowPublicationConcurrency: 5,
			publicationOutboxCompletedRetentionHours: 1,
			publicationOutboxFailedRetentionHours: 168,
			publicationOutboxCleanupIntervalSeconds: 1200,
			publicationOutboxCleanupBatchSize: 1000,
			autosaveDisabled: false,
		},
		endpoints: {
			metrics: {
				enable: false,
				prefix: 'n8n_',
				includeWorkflowIdLabel: false,
				includeWorkflowNameLabel: false,
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
				includeWorkflowExecutionDuration: true,
				queueMetricsInterval: 20,
				includeSchedulerMetrics: false,
				schedulerMetricsInterval: 20,
				activeWorkflowCountInterval: 60,
				includeWorkflowStatistics: false,
				workflowStatisticsInterval: 300,
				includeExecutionDataMetrics: false,
				includeSsrfMetrics: false,
				includeDnsCacheMetrics: false,
				includeWebhookMetrics: false,
				includeFormMetrics: false,
				includeWorkflowInfoMetrics: false,
				workflowInfoMetricInterval: 60,
				includeDbPoolMetrics: false,
				includeWorkflowPublicationMetrics: false,
				workflowPublicationMetricInterval: 60,
			},
			additionalNonUIRoutes: '',
			disableProductionWebhooksOnMainProcess: false,
			disableUi: false,
			form: 'form',
			formTest: 'form-test',
			formWaiting: 'form-waiting',
			mcp: 'mcp',
			mcpAppsEnabled: false,
			mcpBuilderEnabled: true,
			mcpMaxRegisteredClients: 5000,
			mcpTest: 'mcp-test',
			payloadSizeMax: 16,
			formDataFileSizeMax: 200,
			rest: 'rest',
			webhook: 'webhook',
			webhookTest: 'webhook-test',
			webhookWaiting: 'webhook-waiting',
			health: '/healthz',
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
		chatTrigger: {
			disablePublicChat: false,
		},
		compressionNode: {
			maxDecompressedSize: 2 * 1024 * 1024 * 1024,
			maxZipEntries: 5000,
		},
		mcpClient: {
			cacheTtl: 300000,
			cacheMaxSize: 500,
		},
		mcpServer: {
			sessionIdleTtl: 900000,
			sessionSweepInterval: 300000,
		},
		chatHub: {
			executionContextTtl: 3600,
			maxBufferedChunks: 1000,
			streamStateTtl: 300,
		},
		instanceAi: {
			model: 'anthropic/claude-opus-4-8',
			modelUrl: '',
			modelApiKey: '',
			mcpServers: '',
			localGatewayDisabled: false,
			browserUseEnabled: true,
			observerMessageTokens: 30_000,
			reflectorObservationTokens: 40_000,
			sandboxEnabled: false,
			sandboxProvider: 'n8n-sandbox',
			sandboxImage: 'daytonaio/sandbox:0.5.0',
			sandboxSnapshot: '',
			daytonaApiUrl: '',
			daytonaApiKey: '',
			n8nSandboxServiceUrl: '',
			n8nSandboxServiceApiKey: '',
			sandboxTimeout: 300000,
			sandboxNamePrefix: '',
			sandboxEphemeral: false,
			sandboxAutoStopMinutes: 15,
			sandboxAutoArchiveMinutes: 60,
			sandboxAutoDeleteMinutes: 10_080,
			daytonaTokenRefreshSkewMs: 300_000,
			builderSandboxTtlMs: 900_000,
			braveSearchApiKey: '',
			searxngUrl: '',
			gatewayApiKey: '',
			threadTtlDays: 30,
			pruneInterval: 3_600_000,
			snapshotRetention: 86_400_000,
			checkpointGcRetention: 604_800_000,
			confirmationTimeout: 86_400_000,
			outputRedactionEnabled: true,
			outputRedactionSecrets: true,
			outputRedactionPii: 'credit-card',
			outputRedactionPlaceholder: '[REDACTED]',
			runDebugEnabled: false,
			thinkingEnabled: true,
		},
		queue: {
			health: {
				active: false,
				port: 5678,
				address: '::',
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
					tlsConfig: {
						serverName: '',
						rejectUnauthorized: true,
					},
					dualStack: false,
					slotsRefreshInterval: 5_000,
					slotsRefreshTimeout: 1_000,
					dnsResolveStrategy: 'LOOKUP',
					keepAlive: false,
					keepAliveDelay: 5000,
					keepAliveInterval: 5000,
					reconnectOnFailover: true,
				},
				gracefulShutdownTimeout: 30,
				prefix: 'bull',
				settings: {
					lockDuration: 60_000,
					lockRenewTime: 10_000,
					stalledInterval: 30_000,
				},
			},
		},
		taskRunners: {
			mode: 'internal',
			path: '/runners',
			authToken: '',
			listenAddress: '127.0.0.1',
			maxPayload: 1024 * 1024 * 1024,
			port: 5679,
			maxOldSpaceSize: '',
			maxConcurrency: 10,
			taskTimeout: 300,
			taskRequestTimeout: 60,
			heartbeatInterval: 30,
			grantTokenTtl: 30,
			insecureMode: false,
		},
		sentry: {
			backendDsn: '',
			frontendDsn: '',
			environment: '',
			deploymentName: '',
			profilesSampleRate: 0,
			tracesSampleRate: 0,
			tracesSlowSpanThresholdMs: 1000,
			webhookTracesSampleRate: 0.05,
			eventLoopBlockDetectionEnabled: false,
			eventLoopBlockThreshold: 500,
			eventLoopBlockMaxEventsPerHour: 5,
		},
		logging: {
			level: 'info',
			format: 'text',
			outputs: ['console'],
			file: {
				fileCountMax: 100,
				fileSizeMax: 16,
				location: 'logs/n8n.log',
			},
			scopes: [],
			cron: {
				activeInterval: 0,
			},
		},
		multiMainSetup: {
			enabled: false,
			ttl: 10,
			interval: 3,
		},
		scheduler: {
			enabled: false,
			materializationWindowSeconds: 60,
			sweepIntervalSeconds: 10,
			sweepTimeoutSeconds: 60,
			executorIntervalSeconds: 5,
			executorTimeoutSeconds: 60,
			claimBatchSize: 100,
			reaperIntervalSeconds: 30,
			reaperBatchSize: 100,
			reaperTimeoutSeconds: 60,
			leaseDurationSeconds: 60,
			retentionSeconds: 86400,
			failedRetentionSeconds: 604800,
			retentionIntervalSeconds: 3600,
			retentionTimeoutSeconds: 300,
			jitterRatio: 0.1,
			minIntervalSeconds: 0,
			maxConcurrentPasses: 10,
		},
		evaluation: {
			collectionsEnabled: false,
		},
		generic: {
			timezone: 'America/New_York',
			releaseChannel: 'dev',
			gracefulShutdownTimeout: 30,
		},
		license: {
			serverUrl: 'https://license.n8n.io/v1',
			autoRenewalEnabled: true,
			detachFloatingOnShutdown: true,
			activationKey: '',
			tenantId: 1,
			cert: '',
		},
		security: {
			restrictFileAccessTo: '~/.n8n-files',
			blockFileAccessToN8nFiles: true,
			blockFilePatterns: '^(.*\\/)*\\.git(\\/.*)*$',
			daysAbandonedWorkflow: 90,
			contentSecurityPolicy: '{}',
			contentSecurityPolicyReportOnly: false,
			crossOriginOpenerPolicy: 'same-origin-allow-popups',
			disableWebhookHtmlSandboxing: false,
			disableFormHtmlSandboxing: false,
			disableBareRepos: true,
			awsSystemCredentialsAccess: false,
			awsSystemCredentialsSdkSources: 'all',
			enableGitNodeHooks: false,
			enableGitNodeAllConfigKeys: false,
		},
		executions: {
			mode: 'regular',
			timeout: -1,
			maxTimeout: 3600,
			pruneData: true,
			pruneDataMaxAge: 336,
			pruneDataMaxCount: 10_000,
			pruneDataHardDeleteBuffer: 1,
			pruneDataIntervals: {
				hardDelete: 15,
				softDelete: 60,
			},
			concurrency: {
				productionLimit: -1,
				evaluationLimit: -1,
			},
			queueRecovery: {
				interval: 180,
				batchSize: 100,
			},
			queueRetention: {
				keepLastCompleted: 0,
				keepLastFailed: 0,
			},
			recovery: {
				maxLastExecutions: 3,
				workflowDeactivationEnabled: false,
			},
			saveDataOnError: 'all',
			saveDataOnSuccess: 'all',
			saveExecutionProgress: false,
			saveDataManualExecutions: true,
			maxDisplaySize: 100 * 1024 * 1024,
		},
		diagnostics: {
			enabled: true,
			frontendConfig: '1zPn9bgWPzlQc0p8Gj1uiK6DOTn;https://telemetry.n8n.io',
			backendConfig: '1zPn7YoGC3ZXE9zLeTKLuQCB4F6;https://telemetry.n8n.io',
			posthogConfig: {
				apiKey: 'phc_kMstNfAgBcBkWSh6KdsgN09heqqNe5VNmalHP1Ni9Q4',
				apiHost: 'https://ph.n8n.io',
			},
		},
		aiAssistant: {
			baseUrl: '',
		},
		aiBuilder: {
			apiKey: '',
		},
		collaboration: {
			crdt: 'off',
		},
		tags: {
			disabled: false,
		},
		workflowHistory: {
			pruneTime: -1,
		},
		sso: {
			justInTimeProvisioning: true,
			redirectLoginToSso: true,
			saml: {
				loginEnabled: false,
				loginLabel: '',
			},
			oidc: {
				loginEnabled: false,
			},
			ldap: {
				loginEnabled: false,
				loginLabel: '',
			},
			provisioning: {
				scopesProvisionInstanceRole: false,
				scopesProvisionProjectRoles: false,
				scopesName: 'n8n',
				scopesInstanceRoleClaimName: 'n8n_instance_role',
				scopesProjectsRolesClaimName: 'n8n_projects',
				scopesUseExpressionMapping: false,
			},
		},
		ssrfProtection: {
			enabled: false,
			blockedIpRanges: [...SSRF_DEFAULT_BLOCKED_IP_RANGES],
			allowedIpRanges: [],
			allowedHostnames: [],
			blockedHostnames: [],
			dnsCacheMaxSize: 1024 * 1024,
		},
		httpRequest: {
			enforceGlobalUserAgent: false,
			globalUserAgentValue: '',
			responseBodyReadTimeout: 300000,
		},
		redis: {
			prefix: 'n8n',
		},
		externalFrontendHooksUrls: '',
		// @ts-expect-error structuredClone ignores properties defined as a getter
		ai: {
			enabled: false,
			timeout: 3600000,
			allowSendingParameterValues: true,
			maxAgentPassthroughBinarySizeBytes: 50 * 1024 * 1024,
		},
		workflowHistoryCompaction: {
			batchDelayMs: 1_000,
			batchSize: 100,
			optimizingMinimumAgeHours: 0.25,
			optimizingTimeWindowHours: 2,
			trimmingMinimumAgeDays: 6,
			trimmingTimeWindowDays: 2,
			trimOnStartUp: false,
		},
		expressionEngine: {
			engine: 'legacy',
			poolSize: 1,
			maxCodeCacheSize: 1024,
			bridgeTimeout: 5000,
			bridgeMemoryLimit: 128,
			observabilityEnabled: true,
			tracesEnabled: true,
			slowEvaluationThresholdMs: 50,
			tracesSampleRate: 0.0,
		},
		instanceSettingsLoader: {
			ownerManagedByEnv: false,
			ownerEmail: '',
			ownerFirstName: 'Instance',
			ownerLastName: 'Owner',
			ownerPasswordHash: '',
			ssoManagedByEnv: false,
			oidcClientId: '',
			oidcClientSecret: '',
			oidcDiscoveryEndpoint: '',
			oidcLoginEnabled: false,
			oidcPrompt: 'select_account',
			oidcAcrValues: '',
			ssoUserRoleProvisioning: 'disabled',
			securityPolicyManagedByEnv: false,
			mfaEnforcedEnabled: false,
			personalSpacePublishingEnabled: true,
			personalSpaceSharingEnabled: true,
			samlMetadata: '',
			samlMetadataUrl: '',
			samlLoginEnabled: false,
			logStreamingManagedByEnv: false,
			logStreamingDestinations: '',
			mcpManagedByEnv: false,
			mcpAccessEnabled: false,
			communityPackagesManagedByEnv: false,
			communityPackages: '',
		},
		agents: {
			checkpointTtlSeconds: 345600,
			modules: [],
			sandboxEnabled: false,
			sandboxProvider: '',
			sandboxImage: 'daytonaio/sandbox:0.5.0',
			sandboxSnapshot: '',
			sandboxTimeout: 300000,
			sandboxEphemeral: false,
			daytonaApiUrl: '',
			daytonaApiKey: '',
		},
	} satisfies GlobalConfigShape;

	it('should use all default values when no env variables are defined', () => {
		process.env = {};
		const config = Container.get(GlobalConfig);
		// Makes sure the objects are structurally equal while respecting getters,
		// which `toEqual` and `toBe` does not do.
		expect(defaultConfig).toMatchObject(config);
		expect(config).toMatchObject(defaultConfig);
		expect(readFileSyncMock).not.toHaveBeenCalled();
	});

	it('should parse N8N_AGENTS_AI_SANDBOX_EPHEMERAL from env variables', () => {
		process.env = {
			N8N_AGENTS_AI_SANDBOX_EPHEMERAL: 'true',
		};
		const config = Container.get(GlobalConfig);

		expect(config.agents.sandboxEphemeral).toBe(true);
	});

	it('should parse N8N_AGENTS_AI_SANDBOX_SNAPSHOT from env variables', () => {
		process.env = {
			N8N_AGENTS_AI_SANDBOX_SNAPSHOT: 'n8n/agent-knowledge:1.2.3',
		};
		const config = Container.get(GlobalConfig);

		expect(config.agents.sandboxSnapshot).toBe('n8n/agent-knowledge:1.2.3');
	});

	it('should use values from env variables when defined', () => {
		process.env = {
			DB_POSTGRESDB_HOST: 'some-host',
			DB_POSTGRESDB_USER: 'n8n',
			DB_POSTGRESDB_IDLE_CONNECTION_TIMEOUT: '10000',
			DB_TABLE_PREFIX: 'test_',
			DB_PING_INTERVAL_SECONDS: '2',
			NODES_INCLUDE: '["n8n-nodes-base.hackerNews"]',
			DB_LOGGING_MAX_EXECUTION_TIME: '0',
			N8N_METRICS: 'TRUE',
			N8N_TEMPLATES_ENABLED: '0',
			N8N_DYNAMIC_BANNERS_ENDPOINT: 'https://localhost:5678/api/banners',
			N8N_DYNAMIC_BANNERS_ENABLED: 'false',
			N8N_PASSWORD_MIN_LENGTH: '12',
			N8N_ENFORCE_GLOBAL_USER_AGENT: 'true',
			N8N_GLOBAL_USER_AGENT_VALUE: 'AcmeCorp/1.0',
			N8N_AGENTS_AI_SANDBOX_EPHEMERAL: 'true',
			N8N_AGENTS_AI_SANDBOX_SNAPSHOT: 'n8n/agent-knowledge:1.2.3',
		};
		const config = Container.get(GlobalConfig);

		expect(structuredClone(config)).toEqual({
			...defaultConfig,
			database: {
				logging: defaultConfig.database.logging,
				postgresdb: {
					...defaultConfig.database.postgresdb,
					host: 'some-host',
					user: 'n8n',
					idleTimeoutMs: 10_000,
				},
				sqlite: defaultConfig.database.sqlite,
				tablePrefix: 'test_',
				type: 'sqlite',
				pingIntervalSeconds: 2,
				pingTimeoutMs: 5_000,
				pingMaxFailuresBeforeRecovery: 3,
				minRecoveryBackoffMs: 1_000,
				maxRecoveryBackoffMs: 30_000,
				connectionAcquisitionTimeoutMs: 30_000,
				startupConnectMaxRetries: 5,
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
			dynamicBanners: {
				endpoint: 'https://localhost:5678/api/banners',
				enabled: false,
			},
			userManagement: {
				...defaultConfig.userManagement,
				password: {
					minLength: 12,
				},
			},
			httpRequest: {
				enforceGlobalUserAgent: true,
				globalUserAgentValue: 'AcmeCorp/1.0',
				responseBodyReadTimeout: 300000,
			},
			agents: {
				...defaultConfig.agents,
				sandboxEphemeral: true,
				sandboxSnapshot: 'n8n/agent-knowledge:1.2.3',
			},
		});
		expect(readFileSyncMock).not.toHaveBeenCalled();
	});

	it('should read values from files using _FILE env variables', () => {
		const passwordFile = '/path/to/postgres/password';
		process.env = {
			DB_POSTGRESDB_PASSWORD_FILE: passwordFile,
		};
		readFileSyncMock.mockReturnValueOnce('password-from-file');

		const config = Container.get(GlobalConfig);
		const expected = {
			...defaultConfig,
			database: {
				...defaultConfig.database,
				postgresdb: {
					...defaultConfig.database.postgresdb,
					password: 'password-from-file',
				},
			},
		};
		// Makes sure the objects are structurally equal while respecting getters,
		// which `toEqual` and `toBe` does not do.
		expect(config).toMatchObject(expected);
		expect(expected).toMatchObject(config);
		expect(readFileSyncMock).toHaveBeenCalled();
	});

	it('should warn when _FILE env variable value contains whitespace', () => {
		const passwordFile = '/path/to/postgres/password';
		process.env = {
			DB_POSTGRESDB_PASSWORD_FILE: passwordFile,
		};
		readFileSyncMock.mockReturnValueOnce('password-from-file\n');

		const config = Container.get(GlobalConfig);
		expect(config.database.postgresdb.password).toBe('password-from-file');
		expect(consoleWarnMock).toHaveBeenCalledWith(
			expect.stringContaining(
				'DB_POSTGRESDB_PASSWORD_FILE contains leading or trailing whitespace',
			),
		);
	});

	it('should handle invalid numbers', () => {
		process.env = {
			DB_LOGGING_MAX_EXECUTION_TIME: 'abcd',
		};
		const config = Container.get(GlobalConfig);
		expect(config.database.logging.maxQueryExecutionTime).toEqual(0);
		expect(consoleWarnMock).toHaveBeenCalledWith(
			'Invalid number value for DB_LOGGING_MAX_EXECUTION_TIME: abcd',
		);
	});

	describe('database recovery config validation', () => {
		it('should reject DB_PING_MAX_FAILURES_BEFORE_RECOVERY below 1 and fall back to the default', () => {
			process.env = { DB_PING_MAX_FAILURES_BEFORE_RECOVERY: '0' };
			const config = Container.get(GlobalConfig);
			expect(config.database.pingMaxFailuresBeforeRecovery).toBe(3);
			expect(consoleWarnMock).toHaveBeenCalledWith(
				expect.stringContaining('DB_PING_MAX_FAILURES_BEFORE_RECOVERY'),
			);
		});

		it('should reject an empty DB_PING_MAX_FAILURES_BEFORE_RECOVERY (coerces to 0, not NaN)', () => {
			process.env = { DB_PING_MAX_FAILURES_BEFORE_RECOVERY: '' };
			const config = Container.get(GlobalConfig);
			expect(config.database.pingMaxFailuresBeforeRecovery).toBe(3);
		});

		it('should reject DB_RECOVERY_BACKOFF_MIN_MS of 0 and fall back to the default', () => {
			process.env = { DB_RECOVERY_BACKOFF_MIN_MS: '0' };
			const config = Container.get(GlobalConfig);
			expect(config.database.minRecoveryBackoffMs).toBe(1000);
			expect(consoleWarnMock).toHaveBeenCalledWith(
				expect.stringContaining('DB_RECOVERY_BACKOFF_MIN_MS'),
			);
		});

		it('should reject a negative DB_RECOVERY_BACKOFF_MAX_MS and fall back to the default', () => {
			process.env = { DB_RECOVERY_BACKOFF_MAX_MS: '-5' };
			const config = Container.get(GlobalConfig);
			expect(config.database.maxRecoveryBackoffMs).toBe(30000);
		});

		it('should accept 0 for DB_CONNECTION_ACQUISITION_TIMEOUT_MS (wait indefinitely)', () => {
			process.env = { DB_CONNECTION_ACQUISITION_TIMEOUT_MS: '0' };
			const config = Container.get(GlobalConfig);
			expect(config.database.connectionAcquisitionTimeoutMs).toBe(0);
		});

		it('should reject a negative DB_CONNECTION_ACQUISITION_TIMEOUT_MS and fall back to the default', () => {
			process.env = { DB_CONNECTION_ACQUISITION_TIMEOUT_MS: '-1' };
			const config = Container.get(GlobalConfig);
			expect(config.database.connectionAcquisitionTimeoutMs).toBe(30000);
		});

		it('should accept valid recovery overrides', () => {
			process.env = {
				DB_PING_MAX_FAILURES_BEFORE_RECOVERY: '5',
				DB_RECOVERY_BACKOFF_MIN_MS: '500',
				DB_RECOVERY_BACKOFF_MAX_MS: '60000',
				DB_CONNECTION_ACQUISITION_TIMEOUT_MS: '10000',
			};
			const config = Container.get(GlobalConfig);
			expect(config.database.pingMaxFailuresBeforeRecovery).toBe(5);
			expect(config.database.minRecoveryBackoffMs).toBe(500);
			expect(config.database.maxRecoveryBackoffMs).toBe(60000);
			expect(config.database.connectionAcquisitionTimeoutMs).toBe(10000);
		});
	});

	describe('workflow publication outbox cleanup config validation', () => {
		it('should reject a cleanup interval of 0 and fall back to the default', () => {
			process.env = { N8N_WORKFLOW_PUBLICATION_OUTBOX_CLEANUP_INTERVAL_SECONDS: '0' };
			const config = Container.get(GlobalConfig);
			expect(config.workflows.publicationOutboxCleanupIntervalSeconds).toBe(1200);
			expect(consoleWarnMock).toHaveBeenCalledWith(
				expect.stringContaining('N8N_WORKFLOW_PUBLICATION_OUTBOX_CLEANUP_INTERVAL_SECONDS'),
			);
		});

		it('should accept a positive cleanup interval', () => {
			process.env = { N8N_WORKFLOW_PUBLICATION_OUTBOX_CLEANUP_INTERVAL_SECONDS: '60' };
			const config = Container.get(GlobalConfig);
			expect(config.workflows.publicationOutboxCleanupIntervalSeconds).toBe(60);
		});

		it('should reject a cleanup batch size of 0 and fall back to the default', () => {
			process.env = { N8N_WORKFLOW_PUBLICATION_OUTBOX_CLEANUP_BATCH_SIZE: '0' };
			const config = Container.get(GlobalConfig);
			expect(config.workflows.publicationOutboxCleanupBatchSize).toBe(1000);
			expect(consoleWarnMock).toHaveBeenCalledWith(
				expect.stringContaining('N8N_WORKFLOW_PUBLICATION_OUTBOX_CLEANUP_BATCH_SIZE'),
			);
		});

		it('should accept a positive cleanup batch size', () => {
			process.env = { N8N_WORKFLOW_PUBLICATION_OUTBOX_CLEANUP_BATCH_SIZE: '50' };
			const config = Container.get(GlobalConfig);
			expect(config.workflows.publicationOutboxCleanupBatchSize).toBe(50);
		});

		it('should reject a consumer concurrency of 0 and fall back to the default', () => {
			process.env = { N8N_WORKFLOW_PUBLICATION_CONCURRENCY: '0' };
			const config = Container.get(GlobalConfig);
			expect(config.workflows.workflowPublicationConcurrency).toBe(5);
			expect(consoleWarnMock).toHaveBeenCalledWith(
				expect.stringContaining('N8N_WORKFLOW_PUBLICATION_CONCURRENCY'),
			);
		});

		it('should accept a positive consumer concurrency', () => {
			process.env = { N8N_WORKFLOW_PUBLICATION_CONCURRENCY: '3' };
			const config = Container.get(GlobalConfig);
			expect(config.workflows.workflowPublicationConcurrency).toBe(3);
		});
	});

	it('should clamp password min length to valid range', () => {
		process.env = { N8N_PASSWORD_MIN_LENGTH: '100' };
		const config = Container.get(GlobalConfig);
		expect(config.userManagement.password.minLength).toEqual(64);
	});

	it('should floor password min length at 8', () => {
		process.env = { N8N_PASSWORD_MIN_LENGTH: '2' };
		const config = Container.get(GlobalConfig);
		expect(config.userManagement.password.minLength).toEqual(8);
	});

	describe('string unions', () => {
		it('on invalid value, should warn and fall back to default value', () => {
			process.env = {
				N8N_RUNNERS_MODE: 'non-existing-mode',
				DB_TYPE: 'postgresdb',
			};

			const globalConfig = Container.get(GlobalConfig);
			expect(globalConfig.taskRunners.mode).toEqual('internal');
			expect(consoleWarnMock).toHaveBeenCalledWith(
				expect.stringContaining(
					"Invalid value for N8N_RUNNERS_MODE - Invalid enum value. Expected 'internal' | 'external', received 'non-existing-mode'. Falling back to default value.",
				),
			);

			expect(globalConfig.database.type).toEqual('postgresdb');
		});

		it('should validate crossOriginOpenerPolicy enum values', () => {
			process.env = {
				N8N_CROSS_ORIGIN_OPENER_POLICY: 'same-origin',
			};

			const globalConfig = Container.get(GlobalConfig);
			expect(globalConfig.security.crossOriginOpenerPolicy).toEqual('same-origin');
		});

		it('should warn and fall back to default for invalid crossOriginOpenerPolicy', () => {
			process.env = {
				N8N_CROSS_ORIGIN_OPENER_POLICY: 'invalid-policy',
			};

			const globalConfig = Container.get(GlobalConfig);
			expect(globalConfig.security.crossOriginOpenerPolicy).toEqual('same-origin-allow-popups');
		});
	});

	describe('health endpoint transformation', () => {
		it('should add leading slash if not present', () => {
			process.env = {
				N8N_ENDPOINT_HEALTH: 'healthz',
			};

			const config = Container.get(GlobalConfig);
			expect(config.endpoints.health).toEqual('/healthz');
		});

		it('should keep leading slash if already present', () => {
			process.env = {
				N8N_ENDPOINT_HEALTH: '/custom-health',
			};

			const config = Container.get(GlobalConfig);
			expect(config.endpoints.health).toEqual('/custom-health');
		});

		it('should add leading slash to paths with multiple segments', () => {
			process.env = {
				N8N_ENDPOINT_HEALTH: 'api/v1/health',
			};

			const config = Container.get(GlobalConfig);
			expect(config.endpoints.health).toEqual('/api/v1/health');
		});
	});
});
