import { Logger } from '@n8n/backend-common';
import { mockInstance } from '@n8n/backend-test-utils';
import { GlobalConfig } from '@n8n/config';
import { SystemTaskMetadata } from '@n8n/decorators';
import { Container } from '@n8n/di';
import { McpServer } from '@n8n/n8n-nodes-langchain/mcp/core';
import { BinaryDataConfig, BinaryDataService, type ErrorReporter } from 'n8n-core';
import { mock } from 'vitest-mock-extended';

import type { AbstractServer } from '@/abstract-server';
import { ActiveExecutions } from '@/active-executions';
import { DatabaseManager } from '@/binary-data/database.manager';
import { License } from '@/license';
import { DummySystemTask } from '@/scheduling/system-tasks/__tests__/dummy.task';
import { SystemTaskRunner } from '@/scheduling/system-tasks/system-task-runner';
import type { ShutdownService } from '@/shutdown/shutdown.service';
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

describe('initBinaryDataService', () => {
	const binaryDataConfig = mockInstance(BinaryDataConfig, { mode: 's3' });
	const binaryDataService = mockInstance(BinaryDataService);
	const license = mockInstance(License);
	mockInstance(DatabaseManager);

	it('should exit before the store starts when the write mode is not licensed', async () => {
		binaryDataConfig.mode = 's3';
		license.isLicensed.mockReturnValue(false);
		const exit = vi.spyOn(process, 'exit').mockImplementation(() => {
			throw new Error('process.exit');
		});

		try {
			await expect(new TestCommand().initBinaryDataService()).rejects.toThrow('process.exit');

			expect(exit).toHaveBeenCalledWith(1);
			expect(logger.error).toHaveBeenCalledWith(expect.stringContaining('S3 binary data storage'));
			expect(binaryDataService.init).not.toHaveBeenCalled();
		} finally {
			exit.mockRestore();
		}
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

describe('shutdown', () => {
	const activeExecutions = mockInstance(ActiveExecutions);

	const createCommand = () => {
		const command = new TestCommand();
		const server = mock<AbstractServer>();
		server.waitForRequests.mockResolvedValue(undefined);
		const mcpServer = mock<McpServer>();
		mcpServer.settleToolCalls.mockResolvedValue(undefined);
		mcpServer.closeSessions.mockResolvedValue(undefined);
		vi.spyOn(McpServer, 'instance').mockReturnValue(mcpServer);
		activeExecutions.shutdown.mockResolvedValue(undefined);
		const shutdownService = mock<ShutdownService>();
		shutdownService.isShuttingDown.mockReturnValueOnce(false).mockReturnValue(true);
		shutdownService.waitForShutdown.mockResolvedValue(undefined);
		const drainInFlightWork = async () =>
			await (command as unknown as { drainInFlightWork(): Promise<void> }).drainInFlightWork();
		const stopProcess = vi.fn(drainInFlightWork);
		Object.assign(command, {
			server,
			shutdownService,
			stopProcess,
			errorReporter: mock<ErrorReporter>(),
			gracefulShutdownTimeoutInS: 30,
		});
		const onSigterm = (
			command as unknown as { onTerminationSignal(signal: string): () => Promise<void> }
		).onTerminationSignal('SIGTERM');
		return { onSigterm, drainInFlightWork, server, mcpServer, shutdownService, stopProcess };
	};

	const callOrder = (fn: { mock: { invocationCallOrder: number[] } }) =>
		fn.mock.invocationCallOrder[0];

	describe('onTerminationSignal', () => {
		it('should stop the server from accepting requests before the shutdown hooks run', async () => {
			const { onSigterm, server, shutdownService } = createCommand();

			await onSigterm();

			expect(server.stopAcceptingRequests).toHaveBeenCalledOnce();
			expect(callOrder(server.stopAcceptingRequests)).toBeLessThan(
				callOrder(shutdownService.shutdown),
			);
		});

		it('should keep the running shutdown when the signal arrives again', async () => {
			const { onSigterm, shutdownService, stopProcess } = createCommand();

			await onSigterm();
			await onSigterm();

			expect(shutdownService.shutdown).toHaveBeenCalledOnce();
			expect(stopProcess).toHaveBeenCalledOnce();
			expect(logger.info).toHaveBeenCalledWith('Received SIGTERM. Already shutting down...');
		});
	});

	describe('drainInFlightWork', () => {
		it('should settle requests and tool calls before it closes sessions and connections', async () => {
			const { drainInFlightWork, server, mcpServer } = createCommand();

			await drainInFlightWork();

			expect(callOrder(server.waitForRequests)).toBeLessThan(callOrder(mcpServer.settleToolCalls));
			expect(callOrder(mcpServer.settleToolCalls)).toBeLessThan(callOrder(mcpServer.closeSessions));
			expect(callOrder(mcpServer.closeSessions)).toBeLessThan(callOrder(server.closeConnections));
		});

		it('should close sessions only after the execution drain has finished', async () => {
			const { drainInFlightWork, mcpServer } = createCommand();
			let finishExecutions = () => {};
			activeExecutions.shutdown.mockReturnValue(
				new Promise<void>((resolve) => {
					finishExecutions = resolve;
				}),
			);

			const draining = drainInFlightWork();
			await vi.waitFor(() => expect(mcpServer.settleToolCalls).toHaveBeenCalled());
			expect(mcpServer.closeSessions).not.toHaveBeenCalled();

			finishExecutions();
			await draining;

			expect(mcpServer.closeSessions).toHaveBeenCalledOnce();
		});

		it('should give in-flight work 80% of the shutdown window from the signal', async () => {
			vi.useFakeTimers({ now: new Date('2026-01-01T00:00:00.000Z') });
			try {
				const signalAt = Date.now();
				const { onSigterm, server, mcpServer, shutdownService } = createCommand();
				shutdownService.waitForShutdown.mockImplementation(async () => {
					vi.setSystemTime(signalAt + 5_000);
				});

				await onSigterm();

				expect(server.waitForRequests).toHaveBeenCalledWith(signalAt + 24_000);
				expect(mcpServer.settleToolCalls).toHaveBeenCalledWith(signalAt + 24_000);
			} finally {
				vi.useRealTimers();
			}
		});
	});
});
