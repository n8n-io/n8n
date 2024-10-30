import fs from 'fs';

import { InstanceSettings } from '../src/InstanceSettings';
import { InstanceSettingsConfig } from '../src/InstanceSettingsConfig';

describe('InstanceSettings', () => {
	process.env.N8N_USER_FOLDER = '/test';

	const existSpy = jest.spyOn(fs, 'existsSync');
	const statSpy = jest.spyOn(fs, 'statSync');
	const chmodSpy = jest.spyOn(fs, 'chmodSync');

	const createSettingsInstance = (opts?: Partial<InstanceSettingsConfig>) =>
		new InstanceSettings({
			...new InstanceSettingsConfig(),
			...opts,
		});

	beforeEach(() => {
		jest.resetAllMocks();
		statSpy.mockReturnValue({ mode: 0o600 } as fs.Stats);
	});

	describe('If the settings file exists', () => {
		const readSpy = jest.spyOn(fs, 'readFileSync');
		beforeEach(() => {
			existSpy.mockReturnValue(true);
		});

		it('should load settings from the file', () => {
			readSpy.mockReturnValue(JSON.stringify({ encryptionKey: 'test_key' }));
			const settings = createSettingsInstance();
			expect(settings.encryptionKey).toEqual('test_key');
			expect(settings.instanceId).toEqual(
				'6ce26c63596f0cc4323563c529acfca0cccb0e57f6533d79a60a42c9ff862ae7',
			);
		});

		it('should throw error if settings file is not valid JSON', () => {
			readSpy.mockReturnValue('{"encryptionKey":"test_key"');
			expect(() => createSettingsInstance()).toThrowError();
		});

		it('should throw if the env and file keys do not match', () => {
			readSpy.mockReturnValue(JSON.stringify({ encryptionKey: 'key_1' }));
			process.env.N8N_ENCRYPTION_KEY = 'key_2';
			expect(() => createSettingsInstance()).toThrowError();
		});

		it('should check if the settings file has the correct permissions', () => {
			process.env.N8N_ENCRYPTION_KEY = 'test_key';
			readSpy.mockReturnValueOnce(JSON.stringify({ encryptionKey: 'test_key' }));
			statSpy.mockReturnValueOnce({ mode: 0o600 } as fs.Stats);
			const settings = createSettingsInstance();
			expect(settings.encryptionKey).toEqual('test_key');
			expect(settings.instanceId).toEqual(
				'6ce26c63596f0cc4323563c529acfca0cccb0e57f6533d79a60a42c9ff862ae7',
			);
			expect(statSpy).toHaveBeenCalledWith('/test/.n8n/config');
		});

		it('should check the permissions but not fix them if settings file has incorrect permissions by default', () => {
			readSpy.mockReturnValueOnce(JSON.stringify({ encryptionKey: 'test_key' }));
			statSpy.mockReturnValueOnce({ mode: 0o644 } as fs.Stats);
			createSettingsInstance();
			expect(statSpy).toHaveBeenCalledWith('/test/.n8n/config');
			expect(chmodSpy).not.toHaveBeenCalled();
		});

		it("should not check the permissions if 'N8N_ENFORCE_SETTINGS_FILE_PERMISSIONS' is false", () => {
			process.env.N8N_ENFORCE_SETTINGS_FILE_PERMISSIONS = 'false';
			readSpy.mockReturnValueOnce(JSON.stringify({ encryptionKey: 'test_key' }));
			createSettingsInstance();
			expect(statSpy).not.toHaveBeenCalled();
			expect(chmodSpy).not.toHaveBeenCalled();
		});

		it("should fix the permissions of the settings file if 'N8N_ENFORCE_SETTINGS_FILE_PERMISSIONS' is true", () => {
			process.env.N8N_ENFORCE_SETTINGS_FILE_PERMISSIONS = 'true';
			readSpy.mockReturnValueOnce(JSON.stringify({ encryptionKey: 'test_key' }));
			statSpy.mockReturnValueOnce({ mode: 0o644 } as fs.Stats);
			createSettingsInstance({
				enforceSettingsFilePermissions: true,
			});
			expect(statSpy).toHaveBeenCalledWith('/test/.n8n/config');
			expect(chmodSpy).toHaveBeenCalledWith('/test/.n8n/config', 0o600);
		});
	});

	describe('If the settings file does not exist', () => {
		const mkdirSpy = jest.spyOn(fs, 'mkdirSync');
		const writeFileSpy = jest.spyOn(fs, 'writeFileSync');
		beforeEach(() => {
			existSpy.mockReturnValue(false);
			mkdirSpy.mockReturnValue('');
			writeFileSpy.mockReturnValue();
		});

		it('should create a new settings file without explicit permissions if N8N_ENFORCE_SETTINGS_FILE_PERMISSIONS is not set', () => {
			process.env.N8N_ENCRYPTION_KEY = 'key_2';
			const settings = createSettingsInstance();
			expect(settings.encryptionKey).not.toEqual('test_key');
			expect(mkdirSpy).toHaveBeenCalledWith('/test/.n8n', { recursive: true });
			expect(writeFileSpy).toHaveBeenCalledWith(
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
			const settings = createSettingsInstance();
			expect(settings.encryptionKey).not.toEqual('test_key');
			expect(mkdirSpy).toHaveBeenCalledWith('/test/.n8n', { recursive: true });
			expect(writeFileSpy).toHaveBeenCalledWith(
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
			const settings = createSettingsInstance({
				enforceSettingsFilePermissions: true,
			});
			expect(settings.encryptionKey).not.toEqual('test_key');
			expect(mkdirSpy).toHaveBeenCalledWith('/test/.n8n', { recursive: true });
			expect(writeFileSpy).toHaveBeenCalledWith(
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
			const settings = createSettingsInstance();
			expect(settings.encryptionKey).toEqual('env_key');
			expect(settings.instanceId).toEqual(
				'2c70e12b7a0646f92279f427c7b38e7334d8e5389cff167a1dc30e73f826b683',
			);
			expect(settings.encryptionKey).not.toEqual('test_key');
			expect(mkdirSpy).toHaveBeenCalledWith('/test/.n8n', { recursive: true });
			expect(writeFileSpy).toHaveBeenCalledWith(
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
			const settings = createSettingsInstance();
			expect(settings.encryptionKey).not.toEqual('test_key');
			expect(mkdirSpy).toHaveBeenCalledWith('/test/.n8n', { recursive: true });
			expect(writeFileSpy).toHaveBeenCalledWith(
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
			jest.spyOn(fs, 'existsSync').mockReturnValueOnce(true);
			jest.spyOn(fs, 'readFileSync').mockReturnValueOnce(JSON.stringify({ encryptionKey }));

			const settings = createSettingsInstance();

			const [instanceType, nanoid] = settings.hostId.split('-');
			expect(instanceType).toEqual('main');
			expect(nanoid).toHaveLength(16); // e.g. sDX6ZPc0bozv66zM
		});
	});
});
