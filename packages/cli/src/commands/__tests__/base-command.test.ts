import { Logger } from '@n8n/backend-common';
import { mockInstance } from '@n8n/backend-test-utils';
import { GlobalConfig } from '@n8n/config';
import { SystemTaskMetadata } from '@n8n/decorators';
import { Container } from '@n8n/di';
import { BinaryDataConfig, BinaryDataService } from 'n8n-core';

import { DatabaseManager } from '@/binary-data/database.manager';
import { License } from '@/license';
import { DummySystemTask } from '@/scheduling/system-tasks/__tests__/dummy.task';
import { SystemTaskRunner } from '@/scheduling/system-tasks/system-task-runner';
import { TelemetryBufferFlushTask } from '@/telemetry/telemetry-buffer-flush.task';

import { BaseCommand } from '../base-command';

class TestCommand extends BaseCommand {
	async run() {}
}

const logger = mockInstance(Logger);
// One shared mock: a second mockInstance(License) in another describe would replace this one for every test.
const license = mockInstance(License);

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

describe('keepsDerivedInstanceId', () => {
	class SeedingCommand extends TestCommand {
		override seedsInstanceIdentity = true;
	}

	it('should keep the derived ID for a command that does not seed, without reading the certificate', async () => {
		// @ts-expect-error Protected method
		expect(await new TestCommand().keepsDerivedInstanceId()).toBe(true);
		expect(license.loadCertStr).not.toHaveBeenCalled();
	});

	it('should keep the derived ID for a seeding command when a license certificate exists', async () => {
		license.loadCertStr.mockResolvedValue('cert');

		// @ts-expect-error Protected method
		expect(await new SeedingCommand().keepsDerivedInstanceId()).toBe(true);
	});

	it('should not keep the derived ID for a seeding command without a license certificate', async () => {
		license.loadCertStr.mockResolvedValue('');

		// @ts-expect-error Protected method
		expect(await new SeedingCommand().keepsDerivedInstanceId()).toBe(false);
	});

	it('should keep the derived ID when the certificate check fails, so a licensed install keeps its ID', async () => {
		license.loadCertStr.mockRejectedValue(new Error('permission denied'));

		// @ts-expect-error Protected method
		expect(await new SeedingCommand().keepsDerivedInstanceId()).toBe(true);
		expect(logger.warn).toHaveBeenCalled();
	});
});
