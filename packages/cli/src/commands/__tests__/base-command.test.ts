import { Logger } from '@n8n/backend-common';
import { mockInstance } from '@n8n/backend-test-utils';
import { GlobalConfig } from '@n8n/config';
import { SystemTaskMetadata } from '@n8n/decorators';
import { DbConnection, DeploymentKeyRepository } from '@n8n/db';
import { Container } from '@n8n/di';
import { ErrorReporter } from 'n8n-core';
import { mock } from 'vitest-mock-extended';

import { EncryptionBootstrapService } from '@/encryption/encryption-bootstrap.service';
import { MessageEventBus } from '@/eventbus/message-event-bus/message-event-bus';
import { ActivityEventRelay } from '@/events/relays/activity.event-relay';
import { TelemetryEventRelay } from '@/events/relays/telemetry.event-relay';
import { WorkflowFailureNotificationEventRelay } from '@/events/relays/workflow-failure-notification.event-relay';
import { ExpressionObservabilityProvider } from '@/expression-observability/expression-observability.provider';
import { LoadNodesAndCredentials } from '@/load-nodes-and-credentials';
import { PostHogClient } from '@/posthog';
import { RegexEngineService } from '@/regex-engine/regex-engine.service';
import { DummySystemTask } from '@/scheduling/system-tasks/__tests__/dummy.task';
import { SystemTaskRunner } from '@/scheduling/system-tasks/system-task-runner';
import { ShutdownService } from '@/shutdown/shutdown.service';
import { TelemetryBufferFlushTask } from '@/telemetry/telemetry-buffer-flush.task';

import { BaseCommand } from '../base-command';

class TestCommand extends BaseCommand {
	async run() {}
}

const logger = mockInstance(Logger);

afterEach(() => {
	vi.resetAllMocks();
});

describe('logError', () => {
	const error = new Error('Something went wrong');
	error.stack = 'the stack';

	it('should log the error banner', () => {
		// @ts-expect-error Protected method
		new TestCommand().logError(error);

		expect(logger.error.mock.calls.flat()).toEqual([
			'\nGOT ERROR',
			'====================================',
			'Something went wrong',
			'the stack',
		]);
	});

	it('should log the summary before the error banner', () => {
		// @ts-expect-error Protected method
		new TestCommand().logError(error, 'Error updating database.');

		expect(logger.error.mock.calls.flat()).toEqual([
			'Error updating database.',
			'\nGOT ERROR',
			'====================================',
			'Something went wrong',
			'the stack',
		]);
	});
});

describe('needsRegexEngine', () => {
	const loadNodesAndCredentials = mockInstance(LoadNodesAndCredentials);
	const dbConnection = mockInstance(DbConnection);
	const deploymentKeyRepository = mockInstance(DeploymentKeyRepository);
	mockInstance(EncryptionBootstrapService);
	mockInstance(MessageEventBus);
	const posthogClient = mockInstance(PostHogClient);
	const telemetryEventRelay = mockInstance(TelemetryEventRelay);
	mockInstance(ActivityEventRelay);
	mockInstance(WorkflowFailureNotificationEventRelay);
	mockInstance(ExpressionObservabilityProvider);
	mockInstance(ErrorReporter);
	mockInstance(ShutdownService);
	const regexEngineService = mockInstance(RegexEngineService);
	const originalGlobalConfig = Container.get(GlobalConfig);

	afterEach(() => {
		Container.set(GlobalConfig, originalGlobalConfig);
	});

	class RegexEngineCommand extends BaseCommand {
		override get needsRegexEngine() {
			return true;
		}

		async run() {}
	}

	class PlainCommand extends BaseCommand {
		async run() {}
	}

	class ExpressionOnlyCommand extends BaseCommand {
		override needsExpressionEngine = true;

		override get needsRegexEngine() {
			return false;
		}

		async run() {}
	}

	beforeEach(() => {
		Container.set(
			GlobalConfig,
			mock<GlobalConfig>({
				taskRunners: {},
				nodes: {},
				expressionEngine: { engine: 'legacy' },
				regexEngine: { engine: 'js' },
				generic: { gracefulShutdownTimeout: 30 },
			}),
		);
		loadNodesAndCredentials.init.mockResolvedValue(undefined);
		dbConnection.init.mockResolvedValue(undefined);
		dbConnection.migrate.mockResolvedValue(undefined);
		deploymentKeyRepository.findActiveIdentifier.mockResolvedValue(null);
		deploymentKeyRepository.seedActiveIdentifier.mockResolvedValue(undefined);
		posthogClient.init.mockResolvedValue();
		telemetryEventRelay.init.mockResolvedValue();
		regexEngineService.init.mockResolvedValue(undefined);
	});

	it('initializes the engine for a command that opts in', async () => {
		await new RegexEngineCommand().init();

		expect(regexEngineService.init).toHaveBeenCalled();
	});

	it('does not initialize the engine for a command that does not', async () => {
		await new PlainCommand().init();

		expect(regexEngineService.init).not.toHaveBeenCalled();
	});

	it('crashes the process when the engine cannot start', async () => {
		const exitSpy = vi
			.spyOn(BaseCommand.prototype, 'exitWithCrash')
			.mockResolvedValue(undefined as never);
		regexEngineService.init.mockRejectedValue(new Error('module failed to load'));

		await new RegexEngineCommand().init();

		expect(exitSpy).toHaveBeenCalledWith(
			expect.stringContaining('regular expression engine'),
			expect.any(Error),
		);
	});

	it('shuts the engine down on a successful exit', async () => {
		const exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => undefined as never);
		const cmd = new RegexEngineCommand();
		await cmd.init();

		// @ts-expect-error Protected method
		await cmd.exitSuccessFully();

		expect(regexEngineService.shutdown).toHaveBeenCalled();
		expect(exitSpy).toHaveBeenCalled();
	});

	it('does not crash a command that never evaluates expressions or regexes when a non-default engine is configured', async () => {
		Container.set(
			GlobalConfig,
			mock<GlobalConfig>({
				taskRunners: {},
				nodes: {},
				expressionEngine: { engine: 'legacy' },
				regexEngine: { engine: 'bogus-engine' as never },
				generic: { gracefulShutdownTimeout: 30 },
			}),
		);
		const exitSpy = vi
			.spyOn(BaseCommand.prototype, 'exitWithCrash')
			.mockResolvedValue(undefined as never);

		await new PlainCommand().init();

		expect(exitSpy).not.toHaveBeenCalled();
		expect(regexEngineService.init).not.toHaveBeenCalled();
	});

	it('crashes a command that evaluates expressions but diverges on regex-engine support when a non-default engine is configured', async () => {
		Container.set(
			GlobalConfig,
			mock<GlobalConfig>({
				taskRunners: {},
				nodes: {},
				expressionEngine: { engine: 'legacy' },
				regexEngine: { engine: 'bogus-engine' as never },
				generic: { gracefulShutdownTimeout: 30 },
			}),
		);
		const exitSpy = vi
			.spyOn(BaseCommand.prototype, 'exitWithCrash')
			.mockResolvedValue(undefined as never);

		await new ExpressionOnlyCommand().init();

		expect(exitSpy).toHaveBeenCalledWith(
			expect.stringContaining('bogus-engine'),
			expect.any(Error),
		);
		expect(regexEngineService.init).not.toHaveBeenCalled();
	});
});

describe('initSystemTasks', () => {
	const diagnostics = Container.get(GlobalConfig).diagnostics;
	const originalDiagnosticsEnabled = diagnostics.enabled;

	const setDiagnostics = (enabled: boolean) => {
		diagnostics.enabled = enabled;
	};

	afterEach(() => {
		diagnostics.enabled = originalDiagnosticsEnabled;
	});

	it('should register the shared tasks and the own tasks, then start the runner', async () => {
		setDiagnostics(true);
		const metadata = mockInstance(SystemTaskMetadata);
		const runner = mockInstance(SystemTaskRunner);

		// @ts-expect-error Protected method
		await new TestCommand().initSystemTasks([DummySystemTask]);

		expect(metadata.register.mock.calls.flat()).toEqual([
			TelemetryBufferFlushTask,
			DummySystemTask,
		]);
		expect(runner.init).toHaveBeenCalledTimes(1);
	});

	it('should leave out the telemetry buffer flush when diagnostics are off', async () => {
		setDiagnostics(false);
		const metadata = mockInstance(SystemTaskMetadata);
		const runner = mockInstance(SystemTaskRunner);

		// @ts-expect-error Protected method
		await new TestCommand().initSystemTasks([DummySystemTask]);

		expect(metadata.register.mock.calls.flat()).toEqual([DummySystemTask]);
		expect(runner.init).toHaveBeenCalledTimes(1);
	});
});
