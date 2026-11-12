// Import zod alias support before importing Start command
import '@/zod-alias-support';

import type { Logger } from '@n8n/backend-common';
import { uninstallGlobalProxyAgent } from '@n8n/backend-network/testing';
import { mockInstance } from '@n8n/backend-test-utils';
import type { ExecutionsConfig } from '@n8n/config';
import {
	AuthRolesService,
	DbConnection,
	DeploymentKeyRepository,
	type ExecutionRepository,
} from '@n8n/db';
import { Container } from '@n8n/di';
import { McpServer } from '@n8n/n8n-nodes-langchain/mcp/core';
import { InstanceSettings, BinaryDataConfig, ErrorReporter } from 'n8n-core';
import type { IWorkflowExecutionDataProcess } from 'n8n-workflow';
import http from 'node:http';
import https from 'node:https';

import { MultiMainSetup } from '@/scaling/multi-main-setup.ee';
import { Start } from '../start';
import { WaitTracker } from '@/wait-tracker';
import type { MockInstance } from 'vitest';
import { mock } from 'vitest-mock-extended';

import type { AbstractServer } from '@/abstract-server';
import { ActiveExecutions } from '@/active-executions';
import { ActiveWorkflowManager } from '@/active-workflow-manager';
import { AuthHandlerRegistry } from '@/auth/auth-handler.registry';
import type { ConcurrencyControlService } from '@/concurrency/concurrency-control.service';
import { CredentialsOverwrites } from '@/credentials-overwrites';
import { DeprecationService } from '@/deprecation/deprecation.service';
import { FeatureNotLicensedError } from '@/errors/feature-not-licensed.error';
import { MessageEventBus } from '@/eventbus/message-event-bus/message-event-bus';
import { ActivityEventRelay } from '@/events/relays/activity.event-relay';
import { TelemetryEventRelay } from '@/events/relays/telemetry.event-relay';
import { WorkflowFailureNotificationEventRelay } from '@/events/relays/workflow-failure-notification.event-relay';
import type { UnsavedManualExecutionService } from '@/execution-lifecycle/unsaved-manual-execution.service';
import type { ExecutionPersistence } from '@/executions/execution-persistence';
import { License } from '@/license';
import { LoadNodesAndCredentials } from '@/load-nodes-and-credentials';
import { CommunityPackagesConfig } from '@/modules/community-packages/community-packages.config';
import { CommunityPackagesService } from '@/modules/community-packages/community-packages.service';
import { OtelService } from '@/modules/otel/otel.service';
import { NodeTypes } from '@/node-types';
import { PollJobProvider } from '@/scheduling/poll-trigger-node/poll-job-provider';
import {
	type EventService,
	JwtService,
	NodeTypesProxy,
	PostHogClient,
	Publisher,
	RoleCacheService,
	Subscriber,
} from '@n8n/backend-services';
import { ShutdownService } from '@/shutdown/shutdown.service';
import { TaskRunnerModule } from '@/task-runners/task-runner-module';

const authRolesService = mockInstance(AuthRolesService);
authRolesService.init.mockResolvedValue(undefined);

const roleCacheService = mockInstance(RoleCacheService);
roleCacheService.refreshCache.mockResolvedValue(undefined);

const deploymentKeyRepository = mockInstance(DeploymentKeyRepository);
deploymentKeyRepository.findActiveIdentifier.mockResolvedValue(null);
deploymentKeyRepository.seedActiveIdentifier.mockResolvedValue(undefined);

const loadNodesAndCredentials = mockInstance(LoadNodesAndCredentials);
loadNodesAndCredentials.init.mockResolvedValue(undefined);
loadNodesAndCredentials.postProcessLoaders.mockResolvedValue(undefined);

const dbConnection = mockInstance(DbConnection);
dbConnection.init.mockResolvedValue(undefined);
dbConnection.migrate.mockResolvedValue(undefined);

mockInstance(ActiveWorkflowManager);
mockInstance(DeprecationService);
mockInstance(CredentialsOverwrites);
mockInstance(WaitTracker);
const license = mockInstance(License, {
	loadCertStr: async () => '',
	isMultiMainLicensed: () => true,
});
const multiMainSetup = mockInstance(MultiMainSetup);
multiMainSetup.registerEventHandlers.mockReturnValue(undefined);
const authHandlerRegistry = mockInstance(AuthHandlerRegistry);
authHandlerRegistry.init.mockResolvedValue(undefined);
const errorReporter = mockInstance(ErrorReporter);
errorReporter.init.mockResolvedValue(undefined);
mockInstance(NodeTypes);
const shutdownService = mockInstance(ShutdownService);
shutdownService.validate.mockReturnValue(undefined);
mockInstance(PostHogClient);
mockInstance(OtelService);
mockInstance(TelemetryEventRelay);
mockInstance(ActivityEventRelay);
mockInstance(WorkflowFailureNotificationEventRelay);
mockInstance(MessageEventBus);
mockInstance(CommunityPackagesConfig);
const communityPackagesService = mockInstance(CommunityPackagesService);
communityPackagesService.init.mockResolvedValue(undefined);
const taskRunnerModule = mockInstance(TaskRunnerModule);
taskRunnerModule.start.mockResolvedValue(undefined);
const pollJobProvider = mockInstance(PollJobProvider);

const instanceSettings = Container.get(InstanceSettings);

const {
	FakeRunDataTracker,
	FakeMemoryGuardService,
	FakeMemoryGuardMetricsService,
	removeMemoryGuardJournal,
} = vi.hoisted(() => ({
	FakeRunDataTracker: class {},
	FakeMemoryGuardService: class {
		init = vi.fn();
	},
	FakeMemoryGuardMetricsService: class {
		init = vi.fn();
	},
	removeMemoryGuardJournal: vi.fn(),
}));
vi.mock('@/memory-guard/run-data-tracker', () => ({
	RunDataTracker: FakeRunDataTracker,
}));
vi.mock('@/memory-guard/memory-guard.service', () => ({
	MemoryGuardService: FakeMemoryGuardService,
}));
vi.mock('@/memory-guard/memory-guard-journal', () => ({ removeMemoryGuardJournal }));
vi.mock('@/metrics/prometheus/memory-guard-metrics.service', () => ({
	PrometheusMemoryGuardMetricsService: FakeMemoryGuardMetricsService,
}));

describe('Start - AuthRolesService initialization', () => {
	let start: Start;

	const setupInstanceSettings = (
		instanceType: 'main' | 'worker' | 'webhook',
		isMultiMain: boolean,
		isLeader: boolean,
	) => {
		// @ts-expect-error - Read-only property, but needed for testing
		instanceSettings.instanceType = instanceType;
		Object.defineProperty(instanceSettings, 'isMultiMain', {
			get: vi.fn(() => isMultiMain),
			configurable: true,
		});
		Object.defineProperty(instanceSettings, 'isLeader', {
			get: vi.fn(() => isLeader),
			configurable: true,
		});
	};

	beforeEach(() => {
		vi.clearAllMocks();
		Container.reset();

		// Re-register all mocks
		Container.set(AuthRolesService, authRolesService);
		Container.set(RoleCacheService, roleCacheService);
		Container.set(LoadNodesAndCredentials, loadNodesAndCredentials);
		Container.set(DbConnection, dbConnection);
		Container.set(InstanceSettings, instanceSettings);
		Container.set(License, license);
		Container.set(ErrorReporter, errorReporter);
		Container.set(NodeTypes, mockInstance(NodeTypes));
		Container.set(ShutdownService, shutdownService);
		Container.set(ActiveWorkflowManager, mockInstance(ActiveWorkflowManager));
		Container.set(DeprecationService, mockInstance(DeprecationService));
		Container.set(CredentialsOverwrites, mockInstance(CredentialsOverwrites));
		Container.set(WaitTracker, mockInstance(WaitTracker));
		Container.set(MultiMainSetup, multiMainSetup);
		Container.set(AuthHandlerRegistry, authHandlerRegistry);
		Container.set(PostHogClient, mockInstance(PostHogClient));
		Container.set(OtelService, mockInstance(OtelService));
		Container.set(TelemetryEventRelay, mockInstance(TelemetryEventRelay));
		Container.set(ActivityEventRelay, mockInstance(ActivityEventRelay));
		Container.set(
			WorkflowFailureNotificationEventRelay,
			mockInstance(WorkflowFailureNotificationEventRelay),
		);
		Container.set(MessageEventBus, mockInstance(MessageEventBus));
		Container.set(CommunityPackagesConfig, mockInstance(CommunityPackagesConfig));
		Container.set(CommunityPackagesService, communityPackagesService);
		Container.set(TaskRunnerModule, taskRunnerModule);
		Container.set(DeploymentKeyRepository, deploymentKeyRepository);
		Container.set(
			JwtService,
			mockInstance(JwtService, { initialize: vi.fn().mockResolvedValue(undefined) }),
		);
		Container.set(
			BinaryDataConfig,
			mockInstance(BinaryDataConfig, { initialize: vi.fn().mockResolvedValue(undefined) }),
		);
		Container.set(PollJobProvider, pollJobProvider);

		start = new Start();
		// @ts-expect-error - Accessing protected property for testing
		start.globalConfig = {
			executions: { mode: 'regular' },
			multiMainSetup: { enabled: false },
			endpoints: { disableUi: true, metrics: { enable: false }, health: '/health' },
			database: { type: 'sqlite' },
			sentry: {
				backendDsn: '',
				environment: 'test',
				deploymentName: 'test',
				profilingEnabled: false,
				tracesSampleRate: 0,
				eventLoopBlockThreshold: 0,
			},
			cache: { backend: 'memory' },
			taskRunners: {},
			outboundProxy: { mode: 'all' },
			expressionEngine: { engine: 'legacy', poolSize: 1, maxCodeCacheSize: 1024 },
			workflows: { useWorkflowPublicationService: false },
			memoryGuard: { enabled: false },
		};
		// @ts-expect-error - Accessing protected method for testing
		start.initCrashJournal = vi.fn().mockResolvedValue(undefined);
		start.initLicense = vi.fn().mockResolvedValue(undefined);
		start.initOrchestration = vi.fn().mockResolvedValue(undefined);
		start.initBinaryDataService = vi.fn().mockResolvedValue(undefined);
		// @ts-expect-error - Accessing protected method for testing
		start.initDataDeduplicationService = vi.fn().mockResolvedValue(undefined);
		start.initExternalHooks = vi.fn().mockResolvedValue(undefined);
		// @ts-expect-error - Accessing private method for testing
		start.initInstanceSettingsLoader = vi.fn().mockResolvedValue(undefined);
		start.cleanupTestRunner = vi.fn().mockResolvedValue(undefined);
		// @ts-expect-error - Accessing private method for testing
		start.generateStaticAssets = vi.fn().mockResolvedValue(undefined);
		// @ts-expect-error - Accessing protected property for testing
		start.moduleRegistry = { initModules: vi.fn().mockResolvedValue(undefined) };
		// @ts-expect-error - Accessing protected property for testing
		start.executionContextHookRegistry = { init: vi.fn().mockResolvedValue(undefined) };
		// @ts-expect-error - Accessing protected property for testing
		start.license = license;
		// @ts-expect-error - Accessing protected property for testing
		start.server = mock<AbstractServer>({ init: vi.fn().mockResolvedValue(undefined) });
	});

	describe('init - conditional initialization based on instance type and leader status', () => {
		it('should initialize AuthRolesService when instanceType is main and not multi-main', async () => {
			setupInstanceSettings('main', false, false);

			await start.init();

			expect(authRolesService.init).toHaveBeenCalledTimes(1);
			expect(pollJobProvider.init).toHaveBeenCalledTimes(1);
			// The role cache is rebuilt after the role sync committed, never before it.
			expect(roleCacheService.refreshCache).toHaveBeenCalledTimes(1);
			expect(roleCacheService.refreshCache.mock.invocationCallOrder[0]).toBeGreaterThan(
				authRolesService.init.mock.invocationCallOrder[0],
			);
		});

		it('should register node types on the node types proxy before the modules initialize', async () => {
			setupInstanceSettings('main', false, false);
			const nodeTypes = Container.get(NodeTypes);
			const nodeTypesProxy = mockInstance(NodeTypesProxy);
			const initModules = vi.fn().mockResolvedValue(undefined);
			// @ts-expect-error - Accessing protected property for testing
			start.moduleRegistry = { initModules };

			await start.init();

			expect(nodeTypesProxy.registerProvider).toHaveBeenCalledWith(nodeTypes);
			expect(nodeTypesProxy.registerProvider.mock.invocationCallOrder[0]).toBeGreaterThan(
				loadNodesAndCredentials.init.mock.invocationCallOrder[0],
			);
			expect(nodeTypesProxy.registerProvider.mock.invocationCallOrder[0]).toBeLessThan(
				initModules.mock.invocationCallOrder[0],
			);
		});

		it('should initialize AuthRolesService when instanceType is main, multi-main enabled, and is leader', async () => {
			setupInstanceSettings('main', true, true);
			// @ts-expect-error - Accessing protected property for testing
			start.globalConfig = {
				executions: { mode: 'queue' },
				multiMainSetup: { enabled: true },
				license: { autoRenewalEnabled: true },
				endpoints: { disableUi: true, metrics: { enable: false }, health: '/health' },
				database: { type: 'sqlite' },
				sentry: {
					backendDsn: '',
					environment: 'test',
					deploymentName: 'test',
					profilingEnabled: false,
					tracesSampleRate: 0,
					eventLoopBlockThreshold: 0,
				},
				cache: { backend: 'memory' },
				taskRunners: {},
				outboundProxy: { mode: 'all' },
				expressionEngine: { engine: 'legacy', poolSize: 1, maxCodeCacheSize: 1024 },
				workflows: { useWorkflowPublicationService: false },
				memoryGuard: { enabled: false },
			};

			await start.init();

			expect(authRolesService.init).toHaveBeenCalledTimes(1);
		});

		it('should NOT initialize AuthRolesService when instanceType is not main', async () => {
			setupInstanceSettings('worker', false, false);

			await start.init();

			expect(authRolesService.init).not.toHaveBeenCalled();
			expect(roleCacheService.refreshCache).not.toHaveBeenCalled();
		});

		it('should initialize AuthRolesService when instanceType is main, multi-main enabled, but NOT leader (advisory lock serializes)', async () => {
			setupInstanceSettings('main', true, false);
			// @ts-expect-error - Accessing protected property for testing
			start.globalConfig = {
				executions: { mode: 'queue' },
				multiMainSetup: { enabled: true },
				license: { autoRenewalEnabled: true },
				endpoints: { disableUi: true, metrics: { enable: false }, health: '/health' },
				database: { type: 'sqlite' },
				sentry: {
					backendDsn: '',
					environment: 'test',
					deploymentName: 'test',
					profilingEnabled: false,
					tracesSampleRate: 0,
					eventLoopBlockThreshold: 0,
				},
				cache: { backend: 'memory' },
				taskRunners: {},
				outboundProxy: { mode: 'all' },
				expressionEngine: { engine: 'legacy', poolSize: 1, maxCodeCacheSize: 1024 },
				workflows: { useWorkflowPublicationService: false },
				memoryGuard: { enabled: false },
			};

			await start.init();

			expect(authRolesService.init).toHaveBeenCalledTimes(1);
		});
	});

	describe('init - instance settings loader initialization', () => {
		it('should initialize instance settings loader when instanceType is main', async () => {
			setupInstanceSettings('main', false, false);

			await start.init();

			// @ts-expect-error - Accessing private method for testing
			expect(start.initInstanceSettingsLoader).toHaveBeenCalledTimes(1);
		});

		it('should NOT initialize instance settings loader when instanceType is not main', async () => {
			setupInstanceSettings('worker', false, false);

			await start.init();

			// @ts-expect-error - Accessing private method for testing
			expect(start.initInstanceSettingsLoader).not.toHaveBeenCalled();
		});
	});

	describe('init - multi-main follower license retry', () => {
		const multiMainConfig = {
			executions: { mode: 'queue' as const },
			multiMainSetup: { enabled: true },
			license: { autoRenewalEnabled: true },
			endpoints: { disableUi: true, metrics: { enable: false }, health: '/health' },
			database: { type: 'sqlite' },
			sentry: {
				backendDsn: '',
				environment: 'test',
				deploymentName: 'test',
				profilingEnabled: false,
				tracesSampleRate: 0,
				eventLoopBlockThreshold: 0,
			},
			cache: { backend: 'memory' },
			taskRunners: {},
			outboundProxy: { mode: 'all' },
			expressionEngine: { engine: 'legacy' as const, poolSize: 1, maxCodeCacheSize: 1024 },
			workflows: { useWorkflowPublicationService: false },
			memoryGuard: { enabled: false },
		};

		beforeEach(() => {
			vi.useFakeTimers();
		});

		afterEach(() => {
			vi.useRealTimers();
			// Restore original mock so other tests aren't affected
			license.isMultiMainLicensed = (() => true) as unknown as typeof license.isMultiMainLicensed;
		});

		it('should retry and succeed when follower finds license cert on retry', async () => {
			setupInstanceSettings('main', true, false);
			// @ts-expect-error - Accessing protected property for testing
			start.globalConfig = multiMainConfig;

			// First call returns false (no cert yet), second call returns true (leader wrote cert)
			license.isMultiMainLicensed = vi
				.fn()
				.mockReturnValueOnce(false)
				.mockReturnValue(true) as unknown as typeof license.isMultiMainLicensed;

			const initPromise = start.init();

			// Advance past the first retry delay (2s)
			await vi.advanceTimersByTimeAsync(2_000);

			await initPromise;

			expect(license.reload).toHaveBeenCalledTimes(1);
		});

		it('should throw FeatureNotLicensedError when follower exhausts all retries', async () => {
			setupInstanceSettings('main', true, false);
			// @ts-expect-error - Accessing protected property for testing
			start.globalConfig = multiMainConfig;

			license.isMultiMainLicensed = vi
				.fn()
				.mockReturnValue(false) as unknown as typeof license.isMultiMainLicensed;

			const initPromise = start.init().catch((error) => {
				expect(error).toBeInstanceOf(FeatureNotLicensedError);
				return 'rejected';
			});

			// Advance past all retry delays: 2s + 4s + 8s + 16s + 32s = 62s
			await vi.advanceTimersByTimeAsync(62_000);

			const result = await initPromise;
			expect(result).toBe('rejected');
			// 5 retries = 5 reload calls
			expect(license.reload).toHaveBeenCalledTimes(5);
		});

		it('should not retry when leader fails the license check', async () => {
			setupInstanceSettings('main', true, true);
			// @ts-expect-error - Accessing protected property for testing
			start.globalConfig = multiMainConfig;

			license.isMultiMainLicensed = vi
				.fn()
				.mockReturnValue(false) as unknown as typeof license.isMultiMainLicensed;

			await expect(start.init()).rejects.toThrow(FeatureNotLicensedError);

			// Followers only retry via reload; leaders should fail immediately
			expect(license.reload).not.toHaveBeenCalled();
		});
	});

	describe('init - memory guard', () => {
		// The tracker module stays cached after its first import, so check that it is
		// resolved, not that it is imported.
		let containerGet: MockInstance<typeof Container.get>;

		beforeEach(() => {
			setupInstanceSettings('main', false, false);
			Container.set(FakeRunDataTracker, new FakeRunDataTracker());
			containerGet = vi.spyOn(Container, 'get');
		});

		afterEach(() => {
			containerGet.mockRestore();
		});

		it('should start the run data tracker and the guard when the guard is enabled in regular mode', async () => {
			const guard = new FakeMemoryGuardService();
			Container.set(FakeMemoryGuardService, guard);
			// @ts-expect-error - Accessing protected property for testing
			start.globalConfig.memoryGuard = { enabled: true };

			await start.init();

			expect(containerGet).toHaveBeenCalledWith(FakeRunDataTracker);
			expect(guard.init).toHaveBeenCalled();
			expect(removeMemoryGuardJournal).not.toHaveBeenCalled();
		});

		it('should start the guard metrics before the guard when metrics are enabled', async () => {
			const guard = new FakeMemoryGuardService();
			const metrics = new FakeMemoryGuardMetricsService();
			Container.set(FakeMemoryGuardService, guard);
			Container.set(FakeMemoryGuardMetricsService, metrics);
			// @ts-expect-error - Accessing protected property for testing
			start.globalConfig.memoryGuard = { enabled: true };
			// @ts-expect-error - Accessing protected property for testing
			start.globalConfig.endpoints.metrics.enable = true;

			await start.init();

			expect(metrics.init).toHaveBeenCalled();
			expect(metrics.init.mock.invocationCallOrder[0]).toBeLessThan(
				guard.init.mock.invocationCallOrder[0],
			);
		});

		it('should not start the run data tracker when the guard is disabled', async () => {
			await start.init();

			expect(containerGet).not.toHaveBeenCalledWith(FakeRunDataTracker);
			expect(removeMemoryGuardJournal).toHaveBeenCalled();
		});

		it('should not start the run data tracker in queue mode, and should warn', async () => {
			// @ts-expect-error - Accessing protected property for testing
			start.globalConfig.memoryGuard = { enabled: true };
			// @ts-expect-error - Accessing protected property for testing
			start.globalConfig.executions = { mode: 'queue' };
			// @ts-expect-error - Accessing protected property for testing
			const warn = vi.spyOn(start.logger, 'warn');

			await start.init();

			expect(containerGet).not.toHaveBeenCalledWith(FakeRunDataTracker);
			expect(warn).toHaveBeenCalledWith('Memory guard supports only regular mode, so it stays off');
			expect(removeMemoryGuardJournal).toHaveBeenCalled();
		});
	});

	describe('init - env-proxy global agents', () => {
		afterEach(() => {
			uninstallGlobalProxyAgent();
			vi.unstubAllEnvs();
		});

		it('should install env-proxy global agents before any outbound request', async () => {
			setupInstanceSettings('main', false, false);
			vi.stubEnv('HTTPS_PROXY', 'http://proxy.host.invalid:3128');

			await start.init();

			expect(http.globalAgent.constructor.name).toBe('EnvProxyHttpAgent');
			expect(https.globalAgent.constructor.name).toBe('EnvProxyHttpsAgent');
		});

		it('should install env-proxy global agents in main-only mode, as start runs the main server', async () => {
			setupInstanceSettings('main', false, false);
			vi.stubEnv('HTTPS_PROXY', 'http://proxy.host.invalid:3128');
			// @ts-expect-error - Accessing protected property for testing
			start.globalConfig.outboundProxy = { mode: 'main-only' };

			await start.init();

			expect(http.globalAgent.constructor.name).toBe('EnvProxyHttpAgent');
			expect(https.globalAgent.constructor.name).toBe('EnvProxyHttpsAgent');
		});

		it('should keep plain global agents when no proxy env var is set', async () => {
			setupInstanceSettings('main', false, false);
			for (const envVar of [
				'HTTP_PROXY',
				'http_proxy',
				'HTTPS_PROXY',
				'https_proxy',
				'ALL_PROXY',
				'all_proxy',
			]) {
				vi.stubEnv(envVar, undefined);
			}

			await start.init();

			expect(http.globalAgent.constructor.name).toBe('Agent');
			expect(https.globalAgent.constructor.name).toBe('Agent');
		});
	});

	describe('init - termination signals', () => {
		it('should keep the running shutdown on a repeated SIGTERM and force quit on a repeated SIGINT', async () => {
			setupInstanceSettings('main', false, false);
			const on = vi.spyOn(process, 'on');
			const once = vi.spyOn(process, 'once');

			try {
				await start.init();

				expect(on).toHaveBeenCalledWith('SIGTERM', expect.any(Function));
				expect(once).toHaveBeenCalledWith('SIGINT', expect.any(Function));
				expect(once).not.toHaveBeenCalledWith('SIGTERM', expect.any(Function));
			} finally {
				on.mockRestore();
				once.mockRestore();
			}
		});
	});
});

describe('Start - stopProcess', () => {
	const DRAIN_POLL_INTERVAL_MS = 500;

	const publisher = mock<Publisher>();
	const subscriber = mock<Subscriber>();
	const messageEventBus = mock<MessageEventBus>();
	const server = mock<AbstractServer>();
	const mcpServer = mock<McpServer>();
	let exitSpy: MockInstance;

	const createStart = (mode: 'queue' | 'regular') =>
		Object.assign(new Start(), {
			globalConfig: { executions: { mode } },
			activeWorkflowManager: mock<ActiveWorkflowManager>(),
			dbConnection,
			server,
		});

	const callOrder = (fn: { mock: { invocationCallOrder: number[] } }) =>
		fn.mock.invocationCallOrder[0];

	const createActiveExecutions = (executionPersistence: ExecutionPersistence) =>
		new ActiveExecutions(
			mock<Logger>(),
			mock<ExecutionRepository>(),
			executionPersistence,
			mock<ConcurrencyControlService>(),
			mock<EventService>(),
			mock<ExecutionsConfig>({ mode: 'queue' }),
			mock<InstanceSettings>({ instanceType: 'main', isWorker: false }),
			mock<UnsavedManualExecutionService>(),
		);

	beforeEach(() => {
		vi.clearAllMocks();
		Object.defineProperty(instanceSettings, 'isMultiMain', {
			get: () => false,
			configurable: true,
		});
		Container.set(Publisher, publisher);
		Container.set(Subscriber, subscriber);
		Container.set(MessageEventBus, messageEventBus);
		Container.set(WaitTracker, mock<WaitTracker>());
		publisher.shutdown.mockResolvedValue(undefined);
		server.waitForRequests.mockResolvedValue(undefined);
		mcpServer.settleToolCalls.mockResolvedValue(undefined);
		mcpServer.closeSessions.mockResolvedValue(undefined);
		vi.spyOn(McpServer, 'instance').mockReturnValue(mcpServer);
		exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => undefined as never);
	});

	afterEach(() => {
		exitSpy.mockRestore();
	});

	it('should keep pubsub connected until in-flight executions have drained', async () => {
		const executionPersistence = mock<ExecutionPersistence>();
		executionPersistence.create.mockResolvedValue('in-flight');
		const activeExecutions = createActiveExecutions(executionPersistence);
		Container.set(ActiveExecutions, activeExecutions);
		const executionId = await activeExecutions.add(mock<IWorkflowExecutionDataProcess>());

		vi.useFakeTimers();
		try {
			const stopping = createStart('queue').stopProcess();

			await vi.advanceTimersByTimeAsync(DRAIN_POLL_INTERVAL_MS * 3);
			expect(activeExecutions.getActiveExecutions()).toHaveLength(1);
			expect(publisher.shutdown).not.toHaveBeenCalled();
			expect(subscriber.shutdown).not.toHaveBeenCalled();

			activeExecutions.finalizeExecution(executionId);
			await vi.advanceTimersByTimeAsync(DRAIN_POLL_INTERVAL_MS);
			await stopping;
		} finally {
			vi.useRealTimers();
		}

		expect(publisher.shutdown).toHaveBeenCalledOnce();
		expect(subscriber.shutdown).toHaveBeenCalledOnce();
		expect(callOrder(publisher.shutdown)).toBeLessThan(callOrder(messageEventBus.close));
		expect(exitSpy).toHaveBeenCalledOnce();
	});

	it('should keep pubsub connected until MCP tool calls have settled', async () => {
		const activeExecutions = mock<ActiveExecutions>();
		activeExecutions.shutdown.mockResolvedValue(undefined);
		Container.set(ActiveExecutions, activeExecutions);
		let settleToolCalls = () => {};
		mcpServer.settleToolCalls.mockReturnValue(
			new Promise<void>((resolve) => {
				settleToolCalls = resolve;
			}),
		);

		const stopping = createStart('queue').stopProcess();

		await vi.waitFor(() => expect(mcpServer.settleToolCalls).toHaveBeenCalled());
		expect(mcpServer.closeSessions).not.toHaveBeenCalled();
		expect(publisher.shutdown).not.toHaveBeenCalled();
		expect(subscriber.shutdown).not.toHaveBeenCalled();
		expect(exitSpy).not.toHaveBeenCalled();

		settleToolCalls();
		await stopping;

		expect(callOrder(mcpServer.closeSessions)).toBeLessThan(callOrder(server.closeConnections));
		expect(callOrder(server.closeConnections)).toBeLessThan(callOrder(publisher.shutdown));
		expect(subscriber.shutdown).toHaveBeenCalledOnce();
		expect(exitSpy).toHaveBeenCalledOnce();
	});

	it('should disconnect pubsub only after the drain when nothing is running', async () => {
		const activeExecutions = mock<ActiveExecutions>();
		activeExecutions.shutdown.mockResolvedValue(undefined);
		Container.set(ActiveExecutions, activeExecutions);

		await createStart('queue').stopProcess();

		expect(callOrder(activeExecutions.shutdown)).toBeLessThan(callOrder(publisher.shutdown));
		expect(callOrder(activeExecutions.shutdown)).toBeLessThan(callOrder(subscriber.shutdown));
		expect(callOrder(server.waitForRequests)).toBeLessThan(callOrder(publisher.shutdown));
		expect(callOrder(server.closeConnections)).toBeLessThan(callOrder(publisher.shutdown));
		expect(exitSpy).toHaveBeenCalledOnce();
	});

	it('should close the event bus only after the publisher has sent its pending commands', async () => {
		const activeExecutions = mock<ActiveExecutions>();
		activeExecutions.shutdown.mockResolvedValue(undefined);
		Container.set(ActiveExecutions, activeExecutions);
		let finishPublisherShutdown = () => {};
		publisher.shutdown.mockReturnValue(
			new Promise<void>((resolve) => {
				finishPublisherShutdown = resolve;
			}),
		);

		const stopping = createStart('queue').stopProcess();

		await vi.waitFor(() => expect(publisher.shutdown).toHaveBeenCalled());
		expect(callOrder(subscriber.shutdown)).toBeLessThan(callOrder(publisher.shutdown));
		expect(messageEventBus.close).not.toHaveBeenCalled();
		expect(exitSpy).not.toHaveBeenCalled();

		finishPublisherShutdown();
		await stopping;

		expect(messageEventBus.close).toHaveBeenCalledOnce();
		expect(exitSpy).toHaveBeenCalledOnce();
	});

	it('should leave pubsub alone in regular mode', async () => {
		Container.set(ActiveExecutions, mock<ActiveExecutions>());

		await createStart('regular').stopProcess();

		expect(publisher.shutdown).not.toHaveBeenCalled();
		expect(subscriber.shutdown).not.toHaveBeenCalled();
		expect(exitSpy).toHaveBeenCalledOnce();
	});
});

test('start needs the expression engine', () => {
	expect(new Start().needsExpressionEngine).toBe(true);
});
