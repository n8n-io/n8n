import fs from 'fs';
import { InstanceSettings } from '@/InstanceSettings';

describe('InstanceSettings', () => {
	process.env.N8N_USER_FOLDER = '/test';

	const existSpy = jest.spyOn(fs, 'existsSync');
	beforeEach(() => jest.resetAllMocks());

	describe('If the settings file exists', () => {
		const readSpy = jest.spyOn(fs, 'readFileSync');
		beforeEach(() => existSpy.mockReturnValue(true));

		it('should load settings from the file', () => {
			readSpy.mockReturnValue(JSON.stringify({ encryptionKey: 'test_key' }));
			const settings = new InstanceSettings();
			expect(settings.encryptionKey).toEqual('test_key');
			expect(settings.instanceId).toEqual(
				'6ce26c63596f0cc4323563c529acfca0cccb0e57f6533d79a60a42c9ff862ae7',
			);
		});

		it('should throw error if settings file is not valid JSON', () => {
			readSpy.mockReturnValue('{"encryptionKey":"test_key"');
			expect(() => new InstanceSettings()).toThrowError();
		});

		it('should throw if the env and file keys do not match', () => {
			readSpy.mockReturnValue(JSON.stringify({ encryptionKey: 'key_1' }));
			process.env.N8N_ENCRYPTION_KEY = 'key_2';
			expect(() => new InstanceSettings()).toThrowError();
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

		it('should create a new settings file', () => {
			const settings = new InstanceSettings();
			expect(settings.encryptionKey).not.toEqual('test_key');
			expect(mkdirSpy).toHaveBeenCalledWith('/test/.n8n', { recursive: true });
			expect(writeFileSpy).toHaveBeenCalledWith(
				'/test/.n8n/config',
				expect.stringContaining('"encryptionKey":'),
				'utf-8',
			);
		});

		it('should pick up the encryption key from env var N8N_ENCRYPTION_KEY', () => {
			process.env.N8N_ENCRYPTION_KEY = 'env_key';
			const settings = new InstanceSettings();
			expect(settings.encryptionKey).toEqual('env_key');
			expect(settings.instanceId).toEqual(
				'2c70e12b7a0646f92279f427c7b38e7334d8e5389cff167a1dc30e73f826b683',
			);
			expect(settings.encryptionKey).not.toEqual('test_key');
			expect(mkdirSpy).toHaveBeenCalledWith('/test/.n8n', { recursive: true });
			expect(writeFileSpy).toHaveBeenCalledWith(
				'/test/.n8n/config',
				expect.stringContaining('"encryptionKey":'),
				'utf-8',
			);
		});
	});
});
