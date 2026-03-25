import * as fs from 'node:fs';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

import {
	resolveConnection,
	readMultiConfig,
	getCurrentContext,
	setContext,
	setCurrentContext,
	deleteContext,
	listContexts,
	renameContext,
	deleteAllContexts,
	contextNameFromUrl,
	uniqueContextName,
} from '../config';

vi.mock('node:fs');

const mockedReadFileSync = vi.mocked(fs.readFileSync);
const mockedWriteFileSync = vi.mocked(fs.writeFileSync);
const mockedExistsSync = vi.mocked(fs.existsSync);

function setConfigFile(config: Record<string, unknown>) {
	mockedReadFileSync.mockReturnValue(JSON.stringify(config));
}

function setNoConfigFile() {
	mockedReadFileSync.mockImplementation(() => {
		throw new Error('ENOENT');
	});
}

function getWrittenConfig(): Record<string, unknown> {
	const call = mockedWriteFileSync.mock.calls.at(-1);
	return JSON.parse(call![1] as string) as Record<string, unknown>;
}

describe('resolveConnection', () => {
	const originalEnv = { ...process.env };

	beforeEach(() => {
		delete process.env.N8N_URL;
		delete process.env.N8N_API_KEY;
		setNoConfigFile();
		mockedExistsSync.mockReturnValue(true);
	});

	afterEach(() => {
		process.env = { ...originalEnv };
		vi.restoreAllMocks();
	});

	it('should use flags over everything else', () => {
		process.env.N8N_URL = 'https://env.example.com';
		process.env.N8N_API_KEY = 'env_key';
		setConfigFile({
			currentContext: 'default',
			contexts: { default: { url: 'https://file.example.com', apiKey: 'file_key' } },
		});

		const result = resolveConnection({
			url: 'https://flag.example.com',
			apiKey: 'flag_key',
		});

		expect(result).toEqual({ url: 'https://flag.example.com', apiKey: 'flag_key' });
	});

	it('should use env vars when flags are absent', () => {
		process.env.N8N_URL = 'https://env.example.com';
		process.env.N8N_API_KEY = 'env_key';
		setConfigFile({
			currentContext: 'default',
			contexts: { default: { url: 'https://file.example.com', apiKey: 'file_key' } },
		});

		const result = resolveConnection({});

		expect(result).toEqual({ url: 'https://env.example.com', apiKey: 'env_key' });
	});

	it('should fall back to current context when flags and env are absent', () => {
		setConfigFile({
			currentContext: 'prod',
			contexts: { prod: { url: 'https://file.example.com', apiKey: 'file_key' } },
		});

		const result = resolveConnection({});

		expect(result).toEqual({ url: 'https://file.example.com', apiKey: 'file_key' });
	});

	it('should return undefined for missing values', () => {
		const result = resolveConnection({});

		expect(result).toEqual({ url: undefined, apiKey: undefined });
	});

	it('should skip reading config file when both flags are provided', () => {
		resolveConnection({ url: 'https://flag.example.com', apiKey: 'flag_key' });

		expect(mockedReadFileSync).not.toHaveBeenCalled();
	});

	it('should read config file when only one flag is provided', () => {
		setConfigFile({
			currentContext: 'default',
			contexts: { default: { apiKey: 'file_key' } },
		});

		const result = resolveConnection({ url: 'https://flag.example.com' });

		expect(mockedReadFileSync).toHaveBeenCalledOnce();
		expect(result).toEqual({ url: 'https://flag.example.com', apiKey: 'file_key' });
	});

	it('should mix sources: flag for url, env for apiKey', () => {
		process.env.N8N_API_KEY = 'env_key';

		const result = resolveConnection({ url: 'https://flag.example.com' });

		expect(result).toEqual({ url: 'https://flag.example.com', apiKey: 'env_key' });
	});
});

describe('auto-migration', () => {
	beforeEach(() => {
		mockedExistsSync.mockReturnValue(true);
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	it('should migrate flat config to multi-context format', () => {
		setConfigFile({
			url: 'https://old.example.com',
			apiKey: 'old_key',
			accessToken: 'old_token',
		});

		const result = readMultiConfig();

		expect(result).toEqual({
			currentContext: 'default',
			contexts: {
				default: {
					url: 'https://old.example.com',
					apiKey: 'old_key',
					accessToken: 'old_token',
				},
			},
		});

		// Should have written the migrated config
		expect(mockedWriteFileSync).toHaveBeenCalled();
	});

	it('should not migrate already multi-context config', () => {
		const multiConfig = {
			currentContext: 'prod',
			contexts: { prod: { url: 'https://prod.example.com' } },
		};
		setConfigFile(multiConfig);

		const result = readMultiConfig();

		expect(result).toEqual(multiConfig);
		expect(mockedWriteFileSync).not.toHaveBeenCalled();
	});

	it('should return empty config when file does not exist', () => {
		setNoConfigFile();

		const result = readMultiConfig();

		expect(result).toEqual({ contexts: {} });
	});
});

describe('context management', () => {
	beforeEach(() => {
		mockedExistsSync.mockReturnValue(true);
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	it('getCurrentContext should return current context', () => {
		setConfigFile({
			currentContext: 'prod',
			contexts: {
				prod: { url: 'https://prod.example.com', apiKey: 'key1' },
				dev: { url: 'http://localhost:5678' },
			},
		});

		const ctx = getCurrentContext();

		expect(ctx).toEqual({
			name: 'prod',
			config: { url: 'https://prod.example.com', apiKey: 'key1' },
		});
	});

	it('getCurrentContext should return undefined when no current context', () => {
		setConfigFile({ contexts: {} });

		expect(getCurrentContext()).toBeUndefined();
	});

	it('setContext should add a new context', () => {
		setConfigFile({
			currentContext: 'prod',
			contexts: { prod: { url: 'https://prod.example.com' } },
		});

		setContext('staging', { url: 'https://staging.example.com' });

		const written = getWrittenConfig();
		expect(written).toEqual({
			currentContext: 'prod',
			contexts: {
				prod: { url: 'https://prod.example.com' },
				staging: { url: 'https://staging.example.com' },
			},
		});
	});

	it('setCurrentContext should switch active context', () => {
		setConfigFile({
			currentContext: 'prod',
			contexts: {
				prod: { url: 'https://prod.example.com' },
				dev: { url: 'http://localhost:5678' },
			},
		});

		setCurrentContext('dev');

		const written = getWrittenConfig();
		expect(written.currentContext).toBe('dev');
	});

	it('setCurrentContext should throw for non-existent context', () => {
		setConfigFile({
			currentContext: 'prod',
			contexts: { prod: { url: 'https://prod.example.com' } },
		});

		expect(() => setCurrentContext('nonexistent')).toThrow('Context "nonexistent" does not exist.');
	});

	it('deleteContext should remove context and switch to remaining', () => {
		setConfigFile({
			currentContext: 'prod',
			contexts: {
				prod: { url: 'https://prod.example.com' },
				dev: { url: 'http://localhost:5678' },
			},
		});

		const deleted = deleteContext('prod');

		expect(deleted).toEqual({ url: 'https://prod.example.com' });
		const written = getWrittenConfig();
		expect(written.currentContext).toBe('dev');
		expect(written.contexts).toEqual({ dev: { url: 'http://localhost:5678' } });
	});

	it('deleteContext should clear currentContext when last context is deleted', () => {
		setConfigFile({
			currentContext: 'prod',
			contexts: { prod: { url: 'https://prod.example.com' } },
		});

		deleteContext('prod');

		const written = getWrittenConfig();
		expect(written.currentContext).toBeUndefined();
		expect(written.contexts).toEqual({});
	});

	it('listContexts should return all contexts with current marker', () => {
		setConfigFile({
			currentContext: 'prod',
			contexts: {
				prod: { url: 'https://prod.example.com', accessToken: 'tok' },
				dev: { url: 'http://localhost:5678', apiKey: 'key' },
			},
		});

		const list = listContexts();

		expect(list).toEqual([
			{
				name: 'prod',
				config: { url: 'https://prod.example.com', accessToken: 'tok' },
				current: true,
			},
			{ name: 'dev', config: { url: 'http://localhost:5678', apiKey: 'key' }, current: false },
		]);
	});

	it('renameContext should rename and update currentContext', () => {
		setConfigFile({
			currentContext: 'old',
			contexts: { old: { url: 'https://example.com' } },
		});

		renameContext('old', 'new');

		const written = getWrittenConfig();
		expect(written.currentContext).toBe('new');
		expect(written.contexts).toEqual({ new: { url: 'https://example.com' } });
	});

	it('renameContext should throw when target name exists', () => {
		setConfigFile({
			currentContext: 'a',
			contexts: { a: { url: 'https://a.com' }, b: { url: 'https://b.com' } },
		});

		expect(() => renameContext('a', 'b')).toThrow('Context "b" already exists.');
	});

	it('deleteAllContexts should clear everything', () => {
		setConfigFile({
			currentContext: 'prod',
			contexts: {
				prod: { url: 'https://prod.example.com', refreshToken: 'rt1' },
				dev: { url: 'http://localhost:5678' },
			},
		});

		const deleted = deleteAllContexts();

		expect(deleted).toHaveLength(2);
		const written = getWrittenConfig();
		expect(written).toEqual({ contexts: {} });
	});
});

describe('contextNameFromUrl', () => {
	it('should convert hostname dots to dashes', () => {
		expect(contextNameFromUrl('https://n8n.company.com')).toBe('n8n-company-com');
	});

	it('should handle localhost', () => {
		expect(contextNameFromUrl('http://localhost:5678')).toBe('localhost');
	});
});

describe('uniqueContextName', () => {
	it('should return base name when no conflict', () => {
		expect(uniqueContextName('prod', ['dev', 'staging'])).toBe('prod');
	});

	it('should append -2 on first conflict', () => {
		expect(uniqueContextName('prod', ['prod', 'dev'])).toBe('prod-2');
	});

	it('should increment suffix on multiple conflicts', () => {
		expect(uniqueContextName('prod', ['prod', 'prod-2', 'prod-3'])).toBe('prod-4');
	});
});
