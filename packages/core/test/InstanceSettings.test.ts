import fs from 'fs';
import { InstanceSettings } from '@/InstanceSettings';

describe('InstanceSettings', () => {
	process.env.N8N_USER_FOLDER = '/test';

	describe('If the settings file exists', () => {
		beforeEach(() => {
			jest.spyOn(fs, 'existsSync').mockReturnValue(true);
		});

		it('should load settings from the file', () => {
			jest.spyOn(fs, 'readFileSync').mockReturnValue(JSON.stringify({ encryptionKey: 'test_key' }));
			const settings = new InstanceSettings();
			expect(settings.encryptionKey).toEqual('test_key');
			expect(settings.instanceId).toEqual(
				'6ce26c63596f0cc4323563c529acfca0cccb0e57f6533d79a60a42c9ff862ae7',
			);
		});

		it('should throw error if settings file is not valid JSON', () => {
			jest.spyOn(fs, 'readFileSync').mockReturnValue('{"encryptionKey":"test_key"');
			expect(() => new InstanceSettings()).toThrowError();
		});
	});

	describe('If the settings file does not exist', () => {
		it('should create a new settings file', () => {
			jest.spyOn(fs, 'existsSync').mockReturnValue(false);
			const mkdirSpy = jest.spyOn(fs, 'mkdirSync').mockReturnValue('');
			const writeFileSpy = jest.spyOn(fs, 'writeFileSync').mockReturnValue();
			const settings = new InstanceSettings();
			expect(settings.encryptionKey).not.toEqual('test_key');
			expect(mkdirSpy).toHaveBeenCalledWith('/test/.n8n');
			expect(writeFileSpy).toHaveBeenCalledWith(
				'/test/.n8n/config',
				expect.stringContaining('"encryptionKey":'),
				'utf-8',
			);
		});

		it('should pick up the encryption key from env var N8N_ENCRYPTION_KEY', () => {
			process.env.N8N_ENCRYPTION_KEY = 'env_key';
			jest.spyOn(fs, 'existsSync').mockReturnValue(false);
			const mkdirSpy = jest.spyOn(fs, 'mkdirSync').mockReturnValue('');
			const writeFileSpy = jest.spyOn(fs, 'writeFileSync').mockReturnValue();
			const settings = new InstanceSettings();
			expect(settings.encryptionKey).toEqual('env_key');
			expect(settings.instanceId).toEqual(
				'2c70e12b7a0646f92279f427c7b38e7334d8e5389cff167a1dc30e73f826b683',
			);
			expect(settings.encryptionKey).not.toEqual('test_key');
			expect(mkdirSpy).toHaveBeenCalledWith('/test/.n8n');
			expect(writeFileSpy).toHaveBeenCalledWith(
				'/test/.n8n/config',
				expect.stringContaining('"encryptionKey":'),
				'utf-8',
			);
		});
	});
});
