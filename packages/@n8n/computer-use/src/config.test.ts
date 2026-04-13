import * as path from 'node:path';

import {
	getSettingsDir,
	getSettingsFilePath,
	isProtectedSettingsPath,
	parseConfig,
} from './config';

describe('isProtectedSettingsPath', () => {
	const settingsDir = getSettingsDir();
	const settingsFile = getSettingsFilePath();

	it('matches the settings directory itself', () => {
		expect(isProtectedSettingsPath(settingsDir)).toBe(true);
	});

	it('matches a file inside the settings directory', () => {
		expect(isProtectedSettingsPath(settingsFile)).toBe(true);
	});

	it('matches a nested path inside the settings directory', () => {
		expect(isProtectedSettingsPath(path.join(settingsDir, 'sub', 'deep.json'))).toBe(true);
	});

	it('does not match an unrelated path', () => {
		expect(isProtectedSettingsPath('/tmp/safe/file.txt')).toBe(false);
	});

	it('does not match a path that shares a prefix but is a sibling', () => {
		// e.g. ~/.n8n-gateway-other should NOT match ~/.n8n-gateway
		expect(isProtectedSettingsPath(settingsDir + '-other')).toBe(false);
	});

	it('catches paths with redundant segments that resolve into the settings directory', () => {
		const withDotDot = path.join(settingsDir, 'sub', '..', 'settings.json');
		expect(isProtectedSettingsPath(withDotDot)).toBe(true);
	});

	it('catches paths with trailing slash', () => {
		expect(isProtectedSettingsPath(settingsDir + '/')).toBe(true);
	});
});

describe('parseConfig — allowedOrigins', () => {
	const originalEnv = process.env;

	beforeEach(() => {
		process.env = { ...originalEnv };
	});

	afterEach(() => {
		process.env = originalEnv;
	});

	it('defaults to https://*.app.n8n.cloud', () => {
		const { config } = parseConfig([]);
		expect(config.allowedOrigins).toEqual(['https://*.app.n8n.cloud']);
	});

	it('--allowed-origins replaces the default', () => {
		const { config } = parseConfig(['--allowed-origins', 'https://foo.example.com']);
		expect(config.allowedOrigins).toEqual(['https://foo.example.com']);
	});

	it('--allowed-origins supports comma-separated patterns in one flag', () => {
		const { config } = parseConfig([
			'--allowed-origins',
			'https://foo.example.com,http://localhost:5678',
		]);
		expect(config.allowedOrigins).toEqual(['https://foo.example.com', 'http://localhost:5678']);
	});

	it('--allowed-origins is repeatable', () => {
		const { config } = parseConfig([
			'--allowed-origins',
			'https://foo.example.com',
			'--allowed-origins',
			'http://localhost:5678',
		]);
		expect(config.allowedOrigins).toEqual(['https://foo.example.com', 'http://localhost:5678']);
	});

	it('N8N_GATEWAY_ALLOWED_ORIGINS env var has no effect', () => {
		process.env.N8N_GATEWAY_ALLOWED_ORIGINS = 'https://from-env.example.com';
		const { config } = parseConfig([]);
		expect(config.allowedOrigins).toEqual(['https://*.app.n8n.cloud']);
	});
});

describe('parseConfig — mode detection', () => {
	it('returns url only when one positional is given', () => {
		const result = parseConfig(['https://my.instance.app.n8n.cloud']);
		expect(result.url).toBe('https://my.instance.app.n8n.cloud');
		expect(result.apiKey).toBeUndefined();
	});

	it('returns url and apiKey when two positionals are given', () => {
		const result = parseConfig(['https://my.instance.app.n8n.cloud', 'my-token']);
		expect(result.url).toBe('https://my.instance.app.n8n.cloud');
		expect(result.apiKey).toBe('my-token');
	});

	it('returns no url when no args given', () => {
		const result = parseConfig([]);
		expect(result.url).toBeUndefined();
		expect(result.apiKey).toBeUndefined();
	});

	it('strips trailing slash from url', () => {
		const result = parseConfig(['https://my.instance.app.n8n.cloud/']);
		expect(result.url).toBe('https://my.instance.app.n8n.cloud');
	});
});
