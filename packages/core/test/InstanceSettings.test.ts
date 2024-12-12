import { mock } from 'jest-mock-extended';
jest.mock('node:fs', () => mock<typeof fs>());
import * as fs from 'node:fs';

import { InstanceSettings } from '@/InstanceSettings';
import { InstanceSettingsConfig } from '@/InstanceSettingsConfig';

describe('InstanceSettings', () => {
	const userFolder = '/test';
	process.env.N8N_USER_FOLDER = userFolder;
	const settingsFile = `${userFolder}/.n8n/config`;

	const mockFs = mock(fs);

	const createInstanceSettings = (opts?: Partial<InstanceSettingsConfig>) =>
		new InstanceSettings({
			...new InstanceSettingsConfig(),
			...opts,
		});

	beforeEach(() => {
		jest.resetAllMocks();
		mockFs.statSync.mockReturnValue({ mode: 0o600 } as fs.Stats);
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
			process.env.N8N_ENCRYPTION_KEY = 'key_2';
			expect(() => createInstanceSettings()).toThrowError();
		});

		it('should check if the settings file has the correct permissions', () => {
			process.env.N8N_ENCRYPTION_KEY = 'test_key';
			mockFs.readFileSync.mockReturnValueOnce(JSON.stringify({ encryptionKey: 'test_key' }));
			mockFs.statSync.mockReturnValueOnce({ mode: 0o600 } as fs.Stats);
			const settings = createInstanceSettings();
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
			process.env.N8N_ENCRYPTION_KEY = 'key_2';
			const settings = createInstanceSettings();
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
			process.env.N8N_ENCRYPTION_KEY = 'key_2';
			const settings = createInstanceSettings();
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
			process.env.N8N_ENCRYPTION_KEY = 'key_2';
			const settings = createInstanceSettings({
				enforceSettingsFilePermissions: true,
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

		it('should pick up the encryption key from env var N8N_ENCRYPTION_KEY', () => {
			process.env.N8N_ENCRYPTION_KEY = 'env_key';
			const settings = createInstanceSettings();
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
			process.env.N8N_ENCRYPTION_KEY = 'key_2';
			process.env.N8N_IGNORE_SETTINGS_FILE_PERMISSIONS = 'true';
			const settings = createInstanceSettings();
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
	});

	describe('constructor', () => {
		it('should generate a `hostId`', () => {
			const encryptionKey = 'test_key';
			process.env.N8N_ENCRYPTION_KEY = encryptionKey;
			mockFs.existsSync.mockReturnValueOnce(true);
			mockFs.readFileSync.mockReturnValueOnce(JSON.stringify({ encryptionKey }));

			const settings = createInstanceSettings();

			const [instanceType, nanoid] = settings.hostId.split('-');
			expect(instanceType).toEqual('main');
			expect(nanoid).toHaveLength(16); // e.g. sDX6ZPc0bozv66zM
		});
	});

	describe('isDocker', () => {
		let settings: InstanceSettings;

		beforeEach(() => {
			mockFs.existsSync.calledWith(settingsFile).mockReturnValue(true);
			mockFs.readFileSync
				.calledWith(settingsFile)
				.mockReturnValue(JSON.stringify({ encryptionKey: 'test_key' }));
			settings = new InstanceSettings(mock());
		});

		it('should return true if /.dockerenv exists', () => {
			mockFs.existsSync.calledWith('/.dockerenv').mockReturnValueOnce(true);
			expect(settings.isDocker).toBe(true);
			expect(mockFs.existsSync).toHaveBeenCalledWith('/.dockerenv');
			expect(mockFs.readFileSync).not.toHaveBeenCalledWith('/proc/self/cgroup', 'utf8');
		});

		it('should return true if /proc/self/cgroup contains docker', () => {
			mockFs.existsSync.calledWith('/.dockerenv').mockReturnValueOnce(false);
			mockFs.readFileSync
				.calledWith('/proc/self/cgroup', 'utf8')
				.mockReturnValueOnce('docker cgroup');

			expect(settings.isDocker).toBe(true);
			expect(mockFs.existsSync).toHaveBeenCalledWith('/.dockerenv');
			expect(mockFs.readFileSync).toHaveBeenCalledWith('/proc/self/cgroup', 'utf8');
		});

		it('should return false if no docker indicators are found', () => {
			mockFs.existsSync.calledWith('/.dockerenv').mockReturnValueOnce(false);
			mockFs.readFileSync.calledWith('/proc/self/cgroup', 'utf8').mockReturnValueOnce('');
			expect(settings.isDocker).toBe(false);
		});

		it('should return false if checking for docker throws an error', () => {
			mockFs.existsSync.calledWith('/.dockerenv').mockImplementationOnce(() => {
				throw new Error('Access denied');
			});
			expect(settings.isDocker).toBe(false);
		});

		it('should cache the result of isDocker check', () => {
			mockFs.existsSync.calledWith('/.dockerenv').mockReturnValueOnce(true);

			expect(settings.isDocker).toBe(true);

			mockFs.existsSync.mockClear();
			expect(settings.isDocker).toBe(true);
			expect(mockFs.existsSync).not.toHaveBeenCalled();
		});
	});
});
