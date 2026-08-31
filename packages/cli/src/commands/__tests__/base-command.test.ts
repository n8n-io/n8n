import { LicenseState, Logger, ModuleRegistry, ModulesConfig } from '@n8n/backend-common';
import { mockInstance } from '@n8n/backend-test-utils';
import { AzureBlobConfig, ObjectStoreConfig } from '@n8n/blob-storage';
import { GlobalConfig } from '@n8n/config';
import {
	BinaryDataConfig,
	BinaryDataService,
	ExecutionContextHookRegistry,
	InstanceSettings,
	StorageConfig,
} from 'n8n-core';

import { DatabaseManager } from '@/binary-data/database.manager';
import { License } from '@/license';
import { ShutdownService } from '@/shutdown/shutdown.service';

import { BaseCommand } from '../base-command';

class TestCommand extends BaseCommand {
	async run() {}

	protected async initObjectStoreIfConfigured() {
		return undefined;
	}

	protected async initAzureStoreIfConfigured() {
		return undefined;
	}
}

mockInstance(GlobalConfig, { generic: { gracefulShutdownTimeout: 30 } });
mockInstance(InstanceSettings);
mockInstance(ShutdownService);
mockInstance(ModulesConfig);
mockInstance(ModuleRegistry);
mockInstance(ExecutionContextHookRegistry);
mockInstance(BinaryDataService);
mockInstance(DatabaseManager);
mockInstance(LicenseState);
mockInstance(StorageConfig, { mode: 'database' });
mockInstance(AzureBlobConfig, { containerName: '' });
const logger = mockInstance(Logger);
const license = mockInstance(License);
const binaryDataConfig = mockInstance(BinaryDataConfig);
const objectStoreConfig = mockInstance(ObjectStoreConfig);

describe('BaseCommand', () => {
	let exitSpy: ReturnType<typeof vi.spyOn>;

	beforeEach(() => {
		vi.clearAllMocks();
		exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => undefined as never);
	});

	describe('initBinaryDataService', () => {
		it('should exit at boot when s3 write mode has no bucket name configured', async () => {
			binaryDataConfig.mode = 's3';
			license.isLicensed.mockReturnValue(true);
			objectStoreConfig.bucket = { name: '' } as ObjectStoreConfig['bucket'];

			await new TestCommand().initBinaryDataService();

			expect(logger.error).toHaveBeenCalledWith(
				expect.stringContaining('N8N_EXTERNAL_STORAGE_S3_BUCKET_NAME'),
			);
			expect(exitSpy).toHaveBeenCalledWith(1);
		});

		it('should not exit when s3 write mode has a bucket name configured', async () => {
			binaryDataConfig.mode = 's3';
			license.isLicensed.mockReturnValue(true);
			objectStoreConfig.bucket = { name: 'my-bucket' } as ObjectStoreConfig['bucket'];

			await new TestCommand().initBinaryDataService();

			expect(exitSpy).not.toHaveBeenCalled();
		});
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
