import { LicenseState, Logger } from '@n8n/backend-common';
import { mockInstance } from '@n8n/backend-test-utils';
import { GlobalConfig } from '@n8n/config';
import type { User, WorkflowEntity, Project } from '@n8n/db';
import {
	WorkflowRepository,
	DbConnection,
	AuthRolesService,
	BinaryDataRepository,
	DeploymentKeyRepository,
} from '@n8n/db';
import { Container } from '@n8n/di';
import { ErrorReporter } from 'n8n-core';
import type { IRun } from 'n8n-workflow';
import { Expression } from 'n8n-workflow';
import { mock } from 'vitest-mock-extended';

import { ActiveExecutions } from '@/active-executions';
import { DeprecationService } from '@/deprecation/deprecation.service';
import { MessageEventBus } from '@/eventbus/message-event-bus/message-event-bus';
import { ActivityEventRelay } from '@/events/relays/activity.event-relay';
import { TelemetryEventRelay } from '@/events/relays/telemetry.event-relay';
import { WorkflowFailureNotificationEventRelay } from '@/events/relays/workflow-failure-notification.event-relay';
import { ExpressionObservabilityProvider } from '@/expression-observability/expression-observability.provider';
import { ExternalHooks } from '@/external-hooks';
import { License } from '@/license';
import { LoadNodesAndCredentials } from '@/load-nodes-and-credentials';
import { CommunityPackagesService } from '@/modules/community-packages/community-packages.service';
import { PostHogClient } from '@/posthog';
import { OwnershipService } from '@/services/ownership.service';
import { ShutdownService } from '@/shutdown/shutdown.service';
import { TaskRunnerModule } from '@/task-runners/task-runner-module';
import { WorkflowRunner } from '@/workflow-runner';

import { BaseCommand } from '../base-command';
import { Execute } from '../execute';

const taskRunnerModule = mockInstance(TaskRunnerModule);
const workflowRepository = mockInstance(WorkflowRepository);
const ownershipService = mockInstance(OwnershipService);
const workflowRunner = mockInstance(WorkflowRunner);
const activeExecutions = mockInstance(ActiveExecutions);
const loadNodesAndCredentials = mockInstance(LoadNodesAndCredentials);
const shutdownService = mockInstance(ShutdownService);
const deprecationService = mockInstance(DeprecationService);
mockInstance(MessageEventBus);
const expressionObservability = mockInstance(ExpressionObservabilityProvider);
const posthogClient = mockInstance(PostHogClient);
const telemetryEventRelay = mockInstance(TelemetryEventRelay);
const externalHooks = mockInstance(ExternalHooks);
mockInstance(License);
mockInstance(LicenseState);
mockInstance(CommunityPackagesService);
mockInstance(ActivityEventRelay);
mockInstance(WorkflowFailureNotificationEventRelay);

const logger = mockInstance(Logger);
const errorReporter = mockInstance(ErrorReporter);
const dbConnection = mockInstance(DbConnection);
dbConnection.init.mockResolvedValue(undefined);
dbConnection.migrate.mockResolvedValue(undefined);
mockInstance(AuthRolesService);
mockInstance(BinaryDataRepository);

const deploymentKeyRepository = mockInstance(DeploymentKeyRepository);
deploymentKeyRepository.findActiveByType.mockResolvedValue(null);
deploymentKeyRepository.insertOrIgnore.mockResolvedValue(undefined);

// minimal command for exercising BaseCommand.init():
// Execute.init() chains singletons that cannot init twice per process
class ReadOnlyCommand extends BaseCommand {}

// default config for every test, so none depends on what an earlier test leaked
// into the container; tests that need different values set their own
beforeEach(() => {
	Container.set(
		GlobalConfig,
		mock<GlobalConfig>({
			path: '/',
			basePath: '',
			endpoints: { health: 'healthz' },
			taskRunners: {},
			nodes: {},
			expressionEngine: { engine: 'legacy' },
			// must be numeric: the SIGTERM/SIGINT handlers registered by init() compute
			// a setTimeout delay from it, and a mock proxy yields NaN at pool teardown
			generic: { gracefulShutdownTimeout: 30 },
		}),
	);
});

test('should start a task runner', async () => {
	// arrange

	const workflow = mock<WorkflowEntity>({
		id: '123',
		nodes: [{ type: 'n8n-nodes-base.manualTrigger' }],
	});

	const run = mock<IRun>({ data: { resultData: { error: undefined } } });

	loadNodesAndCredentials.init.mockResolvedValue(undefined);
	shutdownService.shutdown.mockReturnValue();
	deprecationService.warn.mockReturnValue();
	posthogClient.init.mockResolvedValue();
	telemetryEventRelay.init.mockResolvedValue();
	externalHooks.init.mockResolvedValue();

	workflowRepository.findOneBy.mockResolvedValue(workflow);
	ownershipService.getInstanceOwner.mockResolvedValue(mock<User>({ id: '123' }));
	ownershipService.getWorkflowProjectCached.mockResolvedValue(
		mock<Project>({ id: 'project-id-1', name: 'Mock Project' }),
	);
	workflowRunner.run.mockResolvedValue('123');
	activeExecutions.getPostExecutePromise.mockResolvedValue(run);

	const cmd = new Execute();
	// @ts-expect-error Protected property
	cmd.flags = { id: '123' };

	// act

	await cmd.init();
	await cmd.run();

	// assert

	expect(taskRunnerModule.start).toHaveBeenCalledTimes(1);
});

test('should not seed the instance identity and should tolerate deployment key read errors', async () => {
	// arrange

	deploymentKeyRepository.insertOrIgnore.mockClear();
	deploymentKeyRepository.findActiveByType.mockRejectedValueOnce(new Error('permission denied'));

	const cmd = new ReadOnlyCommand();

	// act

	await cmd.init();

	// assert

	expect(deploymentKeyRepository.insertOrIgnore).not.toHaveBeenCalled();
});

test('should not init the expression engine for commands that do not need it', async () => {
	// arrange

	const initSpy = vi.spyOn(Expression, 'initExpressionEngine').mockResolvedValue(undefined);
	const setEngineSpy = vi.spyOn(Expression, 'setExpressionEngine').mockReturnValue(undefined);
	Container.set(
		GlobalConfig,
		mock<GlobalConfig>({
			taskRunners: {},
			nodes: {},
			expressionEngine: { engine: 'vm' },
			generic: { gracefulShutdownTimeout: 30 },
		}),
	);

	const cmd = new ReadOnlyCommand();

	// act

	await cmd.init();

	// assert

	expect(initSpy).not.toHaveBeenCalled();
	// the configured engine is still recorded, so evaluating an expression without
	// an initialized engine throws instead of silently using the legacy engine
	expect(setEngineSpy).toHaveBeenCalledWith('vm');
});

test('should exit with a crash when expression engine init fails', async () => {
	// arrange

	const initSpy = vi
		.spyOn(Expression, 'initExpressionEngine')
		.mockRejectedValue(new Error('isolated-vm failed to load'));
	const exitSpy = vi
		// @ts-expect-error Protected method
		.spyOn(BaseCommand.prototype, 'exitWithCrash')
		.mockResolvedValue(undefined);

	Container.set(
		GlobalConfig,
		mock<GlobalConfig>({
			taskRunners: {},
			nodes: {},
			expressionEngine: {
				engine: 'vm',
				poolSize: 4,
				maxCodeCacheSize: 1024,
				bridgeTimeout: 5000,
				bridgeMemoryLimit: 128,
				idleTimeout: 30,
			},
			generic: { gracefulShutdownTimeout: 30 },
		}),
	);

	class ExpressionCommand extends BaseCommand {
		override needsExpressionEngine = true;
	}
	const cmd = new ExpressionCommand();

	// act

	await cmd.init();

	// assert

	expect(initSpy).toHaveBeenCalledTimes(1);
	expect(initSpy).toHaveBeenCalledWith({
		engine: 'vm',
		poolSize: 4,
		maxCodeCacheSize: 1024,
		bridgeTimeout: 5000,
		bridgeMemoryLimit: 128,
		idleTimeoutMs: 30_000, // the config value is in seconds
		observability: expressionObservability,
	});
	expect(exitSpy).toHaveBeenCalledWith(expect.stringContaining('isolated-vm'), expect.any(Error));
});

test('exitWithCrash logs the crash message to the console', async () => {
	// arrange

	const exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => undefined as never);
	vi.useFakeTimers();

	const cmd = new ReadOnlyCommand();
	// @ts-expect-error Protected property, set directly to avoid another init() traversal
	cmd.errorReporter = errorReporter;

	const cause = new Error('isolated-vm failed to load');

	// act

	try {
		// @ts-expect-error Protected method
		const promise: Promise<void> = cmd.exitWithCrash('something broke', cause);
		await vi.advanceTimersByTimeAsync(2000);
		await promise;
	} finally {
		vi.useRealTimers();
	}

	// assert

	// the error reporter may only reach Sentry, so the message must also hit the console
	expect(logger.error).toHaveBeenCalledWith('something broke', { error: cause });
	expect(exitSpy).toHaveBeenCalledWith(1);
});

test('execute needs the expression engine', () => {
	expect(new Execute().needsExpressionEngine).toBe(true);
});
