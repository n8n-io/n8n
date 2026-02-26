// Import zod alias support before importing Start command
import '@/zod-alias-support';

import { mockInstance } from '@n8n/backend-test-utils';
import { AuthRolesService, DbConnection } from '@n8n/db';
import { Container } from '@n8n/di';
import { mock } from 'jest-mock-extended';
import { InstanceSettings } from 'n8n-core';

import { ActiveWorkflowManager } from '@/active-workflow-manager';
import { AuthHandlerRegistry } from '@/auth/auth-handler.registry';
import { DeprecationService } from '@/deprecation/deprecation.service';
import { CredentialsOverwrites } from '@/credentials-overwrites';
import { LoadNodesAndCredentials } from '@/load-nodes-and-credentials';
import { License } from '@/license';
import { MultiMainSetup } from '@/scaling/multi-main-setup.ee';
import { Start } from '../start';
import { WaitTracker } from '@/wait-tracker';
import { ErrorReporter } from 'n8n-core';
import { NodeTypes } from '@/node-types';
import { ShutdownService } from '@/shutdown/shutdown.service';
import type { AbstractServer } from '@/abstract-server';
import { PostHogClient } from '@/posthog';
import { TelemetryEventRelay } from '@/events/relays/telemetry.event-relay';
import { WorkflowFailureNotificationEventRelay } from '@/events/relays/workflow-failure-notification.event-relay';
import { MessageEventBus } from '@/eventbus/message-event-bus/message-event-bus';
import { CommunityPackagesConfig } from '@/modules/community-packages/community-packages.config';
import { CommunityPackagesService } from '@/modules/community-packages/community-packages.service';

const authRolesService = mockInstance(AuthRolesService);
authRolesService.init.mockResolvedValue(undefined);

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
mockInstance(TelemetryEventRelay);
mockInstance(WorkflowFailureNotificationEventRelay);
mockInstance(MessageEventBus);
mockInstance(CommunityPackagesConfig);
const communityPackagesService = mockInstance(CommunityPackagesService);
communityPackagesService.init.mockResolvedValue(undefined);

const instanceSettings = Container.get(InstanceSettings);

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
			get: jest.fn(() => isMultiMain),
			configurable: true,
		});
		Object.defineProperty(instanceSettings, 'isLeader', {
			get: jest.fn(() => isLeader),
			configurable: true,
		});
	};

	beforeEach(() => {
		jest.clearAllMocks();
		Container.reset();

		// Re-register all mocks
		Container.set(AuthRolesService, authRolesService);
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
		Container.set(TelemetryEventRelay, mockInstance(TelemetryEventRelay));
		Container.set(
			WorkflowFailureNotificationEventRelay,
			mockInstance(WorkflowFailureNotificationEventRelay),
		);
		Container.set(MessageEventBus, mockInstance(MessageEventBus));
		Container.set(CommunityPackagesConfig, mockInstance(CommunityPackagesConfig));
		Container.set(CommunityPackagesService, communityPackagesService);

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
				profilesSampleRate: 0,
				tracesSampleRate: 0,
				eventLoopBlockThreshold: 0,
			},
			cache: { backend: 'memory' },
			taskRunners: { enabled: false },
		} as never;
		// @ts-expect-error - Accessing protected method for testing
		start.initCrashJournal = jest.fn().mockResolvedValue(undefined);
		start.initLicense = jest.fn().mockResolvedValue(undefined);
		start.initOrchestration = jest.fn().mockResolvedValue(undefined);
		start.initBinaryDataService = jest.fn().mockResolvedValue(undefined);
		// @ts-expect-error - Accessing protected method for testing
		start.initDataDeduplicationService = jest.fn().mockResolvedValue(undefined);
		start.initExternalHooks = jest.fn().mockResolvedValue(undefined);
		start.initWorkflowHistory = jest.fn();
		start.cleanupTestRunner = jest.fn().mockResolvedValue(undefined);
		// @ts-expect-error - Accessing private method for testing
		start.generateStaticAssets = jest.fn().mockResolvedValue(undefined);
		// @ts-expect-error - Accessing protected property for testing
		start.moduleRegistry = { initModules: jest.fn().mockResolvedValue(undefined) };
		// @ts-expect-error - Accessing protected property for testing
		start.executionContextHookRegistry = { init: jest.fn().mockResolvedValue(undefined) };
		// @ts-expect-error - Accessing protected property for testing
		start.license = license;
		// @ts-expect-error - Accessing protected property for testing
		start.server = mock<AbstractServer>({ init: jest.fn().mockResolvedValue(undefined) });
	});

	describe('init - conditional initialization based on instance type and leader status', () => {
		it('should initialize AuthRolesService when instanceType is main and not multi-main', async () => {
			setupInstanceSettings('main', false, false);

			await start.init();

			expect(authRolesService.init).toHaveBeenCalledTimes(1);
		});

		it('should initialize AuthRolesService when instanceType is main, multi-main enabled, and is leader', async () => {
			setupInstanceSettings('main', true, true);
			// @ts-expect-error - Accessing protected property for testing
			start.globalConfig = {
				executions: { mode: 'queue' },
				multiMainSetup: { enabled: true },
				endpoints: { disableUi: true, metrics: { enable: false }, health: '/health' },
				database: { type: 'sqlite' },
				sentry: {
					backendDsn: '',
					environment: 'test',
					deploymentName: 'test',
					profilesSampleRate: 0,
					tracesSampleRate: 0,
					eventLoopBlockThreshold: 0,
				},
				cache: { backend: 'memory' },
				taskRunners: { enabled: false },
			} as never;

			await start.init();

			expect(authRolesService.init).toHaveBeenCalledTimes(1);
		});

		it('should NOT initialize AuthRolesService when instanceType is not main', async () => {
			setupInstanceSettings('worker', false, false);

			await start.init();

			expect(authRolesService.init).not.toHaveBeenCalled();
		});

		it('should initialize AuthRolesService when instanceType is main, multi-main enabled, but NOT leader (advisory lock serializes)', async () => {
			setupInstanceSettings('main', true, false);
			// @ts-expect-error - Accessing protected property for testing
			start.globalConfig = {
				executions: { mode: 'queue' },
				multiMainSetup: { enabled: true },
				endpoints: { disableUi: true, metrics: { enable: false }, health: '/health' },
				database: { type: 'sqlite' },
				sentry: {
					backendDsn: '',
					environment: 'test',
					deploymentName: 'test',
					profilesSampleRate: 0,
					tracesSampleRate: 0,
					eventLoopBlockThreshold: 0,
				},
				cache: { backend: 'memory' },
				taskRunners: { enabled: false },
			} as never;

			await start.init();

			expect(authRolesService.init).toHaveBeenCalledTimes(1);
		});
	});
});
