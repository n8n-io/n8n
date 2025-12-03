import type { Logger } from '@n8n/backend-common';
import { InstanceSettingsConfig } from '@n8n/config';
import { mock } from 'jest-mock-extended';
jest.mock('node:fs', () => mock<typeof fs>());
import * as fs from 'node:fs';

import { InstanceSettings } from '../instance-settings';
import { WorkerMissingEncryptionKey } from '../worker-missing-encryption-key.error';

describe('InstanceSettings', () => {
	const userFolder = '/test';

	const mockFs = mock(fs);
	const logger = mock<Logger>();

	const createInstanceSettings = (opts?: Partial<InstanceSettingsConfig>) =>
		new InstanceSettings(
			{
				...new InstanceSettingsConfig(),
				...opts,
			},
			logger,
		);

	beforeEach(() => {
		jest.resetAllMocks();
		mockFs.statSync.mockReturnValue({ mode: 0o600 } as fs.Stats);

		process.argv[2] = 'main';
		process.env = { N8N_USER_FOLDER: userFolder };
	});

	describe('If the settings file exists', () => {
		beforeEach(() => {
			mockFs.existsSync.mockReturnValue(true);
		});

		it('should load settings from the file', () => {
			mockFs.readFileSync.mockReturnValue(JSON.stringify({ encryptionKey: 'test_key' }));
			const settings = createInstanceSettings();
			expect(settings.encryptionKey).toEqual('test_key');
			expect(settings.instanceId).toEqual(
				'6ce26c63596f0cc4323563c529acfca0cccb0e57f6533d79a60a42c9ff862ae7',
			);
		});

		it('should throw error if settings file is not valid JSON', () => {
			mockFs.readFileSync.mockReturnValue('{"encryptionKey":"test_key"');
			expect(() => createInstanceSettings()).toThrowError();
		});

		it('should throw if the env and file keys do not match', () => {
			mockFs.readFileSync.mockReturnValue(JSON.stringify({ encryptionKey: 'key_1' }));
			expect(() => createInstanceSettings({ encryptionKey: 'key_2' })).toThrowError();
		});

		it('should check if the settings file has the correct permissions', () => {
			mockFs.readFileSync.mockReturnValueOnce(JSON.stringify({ encryptionKey: 'test_key' }));
			mockFs.statSync.mockReturnValueOnce({ mode: 0o600 } as fs.Stats);
			const settings = createInstanceSettings({ encryptionKey: 'test_key' });
			expect(settings.encryptionKey).toEqual('test_key');
			expect(settings.instanceId).toEqual(
				'6ce26c63596f0cc4323563c529acfca0cccb0e57f6533d79a60a42c9ff862ae7',
			);
			expect(mockFs.statSync).toHaveBeenCalledWith('/test/.n8n/config');
		});

		it('should check the permissions but not fix them if settings file has incorrect permissions by default', () => {
			mockFs.readFileSync.mockReturnValueOnce(JSON.stringify({ encryptionKey: 'test_key' }));
			mockFs.statSync.mockReturnValueOnce({ mode: 0o644 } as fs.Stats);
			createInstanceSettings();
			expect(mockFs.statSync).toHaveBeenCalledWith('/test/.n8n/config');
			expect(mockFs.chmodSync).not.toHaveBeenCalled();
		});

		it("should not check the permissions if 'N8N_ENFORCE_SETTINGS_FILE_PERMISSIONS' is false", () => {
			process.env.N8N_ENFORCE_SETTINGS_FILE_PERMISSIONS = 'false';
			mockFs.readFileSync.mockReturnValueOnce(JSON.stringify({ encryptionKey: 'test_key' }));
			createInstanceSettings();
			expect(mockFs.statSync).not.toHaveBeenCalled();
			expect(mockFs.chmodSync).not.toHaveBeenCalled();
		});

		it("should fix the permissions of the settings file if 'N8N_ENFORCE_SETTINGS_FILE_PERMISSIONS' is true", () => {
			process.env.N8N_ENFORCE_SETTINGS_FILE_PERMISSIONS = 'true';
			mockFs.readFileSync.mockReturnValueOnce(JSON.stringify({ encryptionKey: 'test_key' }));
			mockFs.statSync.mockReturnValueOnce({ mode: 0o644 } as fs.Stats);
			createInstanceSettings({
				enforceSettingsFilePermissions: true,
			});
			expect(mockFs.statSync).toHaveBeenCalledWith('/test/.n8n/config');
			expect(mockFs.chmodSync).toHaveBeenCalledWith('/test/.n8n/config', 0o600);
		});
	});

	describe('If the settings file does not exist', () => {
		beforeEach(() => {
			mockFs.existsSync.mockReturnValue(false);
			mockFs.mkdirSync.mockReturnValue('');
			mockFs.writeFileSync.mockReturnValue();
		});

		it('should create a new settings file without explicit permissions if N8N_ENFORCE_SETTINGS_FILE_PERMISSIONS is not set', () => {
			const settings = createInstanceSettings({ encryptionKey: 'key_2' });
			expect(settings.encryptionKey).not.toEqual('test_key');
			expect(mockFs.mkdirSync).toHaveBeenCalledWith('/test/.n8n', { recursive: true });
			expect(mockFs.writeFileSync).toHaveBeenCalledWith(
				'/test/.n8n/config',
				expect.stringContaining('"encryptionKey":'),
				{
					encoding: 'utf-8',
					mode: undefined,
				},
			);
		});

		it('should create a new settings file without explicit permissions if N8N_ENFORCE_SETTINGS_FILE_PERMISSIONS=false', () => {
			process.env.N8N_ENFORCE_SETTINGS_FILE_PERMISSIONS = 'false';
			const settings = createInstanceSettings({ encryptionKey: 'key_2' });
			expect(settings.encryptionKey).not.toEqual('test_key');
			expect(mockFs.mkdirSync).toHaveBeenCalledWith('/test/.n8n', { recursive: true });
			expect(mockFs.writeFileSync).toHaveBeenCalledWith(
				'/test/.n8n/config',
				expect.stringContaining('"encryptionKey":'),
				{
					encoding: 'utf-8',
					mode: undefined,
				},
			);
		});

		it('should create a new settings file with explicit permissions if N8N_ENFORCE_SETTINGS_FILE_PERMISSIONS=true', () => {
			process.env.N8N_ENFORCE_SETTINGS_FILE_PERMISSIONS = 'true';
			const settings = createInstanceSettings({
				enforceSettingsFilePermissions: true,
				encryptionKey: 'key_2',
			});
			expect(settings.encryptionKey).not.toEqual('test_key');
			expect(mockFs.mkdirSync).toHaveBeenCalledWith('/test/.n8n', { recursive: true });
			expect(mockFs.writeFileSync).toHaveBeenCalledWith(
				'/test/.n8n/config',
				expect.stringContaining('"encryptionKey":'),
				{
					encoding: 'utf-8',
					mode: 0o600,
				},
			);
		});

		it('should pick up the encryption key from config', () => {
			const settings = createInstanceSettings({ encryptionKey: 'env_key' });
			expect(settings.encryptionKey).toEqual('env_key');
			expect(settings.instanceId).toEqual(
				'2c70e12b7a0646f92279f427c7b38e7334d8e5389cff167a1dc30e73f826b683',
			);
			expect(settings.encryptionKey).not.toEqual('test_key');
			expect(mockFs.mkdirSync).toHaveBeenCalledWith('/test/.n8n', { recursive: true });
			expect(mockFs.writeFileSync).toHaveBeenCalledWith(
				'/test/.n8n/config',
				expect.stringContaining('"encryptionKey":'),
				{
					encoding: 'utf-8',
					mode: undefined,
				},
			);
		});

		it("should not set the permissions of the settings file if 'N8N_IGNORE_SETTINGS_FILE_PERMISSIONS' is true", () => {
			process.env.N8N_IGNORE_SETTINGS_FILE_PERMISSIONS = 'true';
			const settings = createInstanceSettings({ encryptionKey: 'key_2' });
			expect(settings.encryptionKey).not.toEqual('test_key');
			expect(mockFs.mkdirSync).toHaveBeenCalledWith('/test/.n8n', { recursive: true });
			expect(mockFs.writeFileSync).toHaveBeenCalledWith(
				'/test/.n8n/config',
				expect.stringContaining('"encryptionKey":'),
				{
					encoding: 'utf-8',
					mode: undefined,
				},
			);
		});

		it("should throw on a worker process, if encryption key isn't set via env", () => {
			process.argv[2] = 'worker';
			expect(() => createInstanceSettings()).toThrowError(WorkerMissingEncryptionKey);
		});
	});

	describe('constructor', () => {
		it('should generate a `hostId`', () => {
			const encryptionKey = 'test_key';
			mockFs.existsSync.mockReturnValueOnce(true);
			mockFs.readFileSync.mockReturnValueOnce(JSON.stringify({ encryptionKey }));

			const settings = createInstanceSettings({ encryptionKey });

			const [instanceType, hostId] = settings.hostId.split('-');
			expect(instanceType).toEqual('main');
			expect(hostId.length).toBeGreaterThan(0); // hostname or nanoID
		});
	});

	describe('isDocker', () => {
		it('should return true if /.dockerenv exists', () => {
			mockFs.existsSync.mockImplementation((path) => path === '/.dockerenv');
			const settings = createInstanceSettings();
			expect(settings.isDocker).toBe(true);
			expect(mockFs.existsSync).toHaveBeenCalledWith('/.dockerenv');
			expect(mockFs.readFileSync).not.toHaveBeenCalledWith('/proc/self/cgroup', 'utf8');
		});

		it('should return true if /run/.containerenv exists', () => {
			mockFs.existsSync.mockImplementation((path) => path === '/run/.containerenv');
			const settings = createInstanceSettings();
			expect(settings.isDocker).toBe(true);
			expect(mockFs.existsSync).toHaveBeenCalledWith('/run/.containerenv');
			expect(mockFs.readFileSync).not.toHaveBeenCalledWith('/proc/self/cgroup', 'utf8');
		});

		test.each(['docker', 'kubepods', 'containerd'])(
			'should return true if /proc/self/cgroup contains %s',
			(str) => {
				mockFs.existsSync.mockReturnValueOnce(false);
				mockFs.readFileSync.calledWith('/proc/self/cgroup', 'utf8').mockReturnValueOnce(str);

				const settings = createInstanceSettings();
				expect(settings.isDocker).toBe(true);
				expect(mockFs.existsSync).toHaveBeenCalledWith('/.dockerenv');
				expect(mockFs.readFileSync).toHaveBeenCalledWith('/proc/self/cgroup', 'utf8');
			},
		);

		test.each(['docker', 'kubelet', 'containerd'])(
			'should return true if /proc/self/mountinfo contains %s',
			(str) => {
				mockFs.existsSync.mockReturnValueOnce(false);
				mockFs.readFileSync.calledWith('/proc/self/cgroup', 'utf8').mockReturnValueOnce('');
				mockFs.readFileSync.calledWith('/proc/self/mountinfo', 'utf8').mockReturnValueOnce(str);

				const settings = createInstanceSettings();
				expect(settings.isDocker).toBe(true);
				expect(mockFs.existsSync).toHaveBeenCalledWith('/.dockerenv');
				expect(mockFs.readFileSync).toHaveBeenCalledWith('/proc/self/cgroup', 'utf8');
				expect(mockFs.readFileSync).toHaveBeenCalledWith('/proc/self/mountinfo', 'utf8');
			},
		);

		it('should return false if no docker indicators are found', () => {
			mockFs.existsSync.calledWith('/.dockerenv').mockReturnValueOnce(false);
			mockFs.readFileSync.calledWith('/proc/self/cgroup', 'utf8').mockReturnValueOnce('');
			mockFs.readFileSync.calledWith('/proc/self/mountinfo', 'utf8').mockReturnValueOnce('');
			const settings = createInstanceSettings();
			expect(settings.isDocker).toBe(false);
		});

		it('should return false if reading any of these files throws an error', () => {
			mockFs.existsSync.mockReturnValue(false);
			mockFs.readFileSync.mockImplementation(() => {
				throw new Error('File not found');
			});

			const settings = createInstanceSettings();
			expect(settings.isDocker).toBe(false);
		});

		it('should cache the result of isDocker check', () => {
			mockFs.existsSync.calledWith('/.dockerenv').mockReturnValueOnce(true);

			const settings = createInstanceSettings();
			expect(settings.isDocker).toBe(true);

			mockFs.existsSync.mockClear();
			expect(settings.isDocker).toBe(true);
			expect(mockFs.existsSync).not.toHaveBeenCalled();
		});
	});
});
