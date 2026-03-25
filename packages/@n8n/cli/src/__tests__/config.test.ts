import * as fs from 'node:fs';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

import { resolveConnection } from '../config';

vi.mock('node:fs');

const mockedReadFileSync = vi.mocked(fs.readFileSync);

describe('resolveConnection', () => {
	const originalEnv = { ...process.env };

	function setConfigFile(config: { url?: string; apiKey?: string }) {
		mockedReadFileSync.mockReturnValue(JSON.stringify(config));
	}

	function setNoConfigFile() {
		mockedReadFileSync.mockImplementation(() => {
			throw new Error('ENOENT');
		});
	}

	beforeEach(() => {
		delete process.env.N8N_URL;
		delete process.env.N8N_API_KEY;
		setNoConfigFile();
	});

	afterEach(() => {
		process.env = { ...originalEnv };
		vi.restoreAllMocks();
	});

	it('should use flags over everything else', () => {
		process.env.N8N_URL = 'https://env.example.com';
		process.env.N8N_API_KEY = 'env_key';
		setConfigFile({ url: 'https://file.example.com', apiKey: 'file_key' });

		const result = resolveConnection({
			url: 'https://flag.example.com',
			apiKey: 'flag_key',
		});

		expect(result).toEqual({ url: 'https://flag.example.com', apiKey: 'flag_key' });
	});

	it('should use env vars when flags are absent', () => {
		process.env.N8N_URL = 'https://env.example.com';
		process.env.N8N_API_KEY = 'env_key';
		setConfigFile({ url: 'https://file.example.com', apiKey: 'file_key' });

		const result = resolveConnection({});

		expect(result).toEqual({ url: 'https://env.example.com', apiKey: 'env_key' });
	});

	it('should fall back to config file when flags and env are absent', () => {
		setConfigFile({ url: 'https://file.example.com', apiKey: 'file_key' });

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
		setConfigFile({ apiKey: 'file_key' });

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
