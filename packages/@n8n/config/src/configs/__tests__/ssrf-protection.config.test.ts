import { Container } from '@n8n/di';

import { SsrfProtectionConfig, SSRF_DEFAULT_BLOCKED_IP_RANGES } from '../ssrf-protection.config';

describe('SsrfProtectionConfig', () => {
	beforeEach(() => {
		Container.reset();
		jest.clearAllMocks();
	});

	const originalEnv = process.env;
	afterEach(() => {
		process.env = originalEnv;
	});

	describe('defaults', () => {
		test('enabled is false', () => {
			process.env = {};
			expect(Container.get(SsrfProtectionConfig).enabled).toBe(false);
		});

		test('blockedIpRanges defaults to default ranges', () => {
			process.env = {};
			const config = Container.get(SsrfProtectionConfig);
			expect(config.blockedIpRanges).toEqual(SSRF_DEFAULT_BLOCKED_IP_RANGES);
		});

		test('allowedIpRanges is empty array', () => {
			process.env = {};
			expect(Container.get(SsrfProtectionConfig).allowedIpRanges).toEqual([]);
		});

		test('allowedHostnames is empty array', () => {
			process.env = {};
			expect(Container.get(SsrfProtectionConfig).allowedHostnames).toEqual([]);
		});

		test('dnsCacheMaxSize is 1048576', () => {
			process.env = {};
			expect(Container.get(SsrfProtectionConfig).dnsCacheMaxSize).toBe(1048576);
		});
	});

	describe('N8N_SSRF_PROTECTION_ENABLED', () => {
		test('sets enabled to true', () => {
			process.env = { N8N_SSRF_PROTECTION_ENABLED: 'true' };
			expect(Container.get(SsrfProtectionConfig).enabled).toBe(true);
		});

		test('sets enabled to false', () => {
			process.env = { N8N_SSRF_PROTECTION_ENABLED: 'false' };
			expect(Container.get(SsrfProtectionConfig).enabled).toBe(false);
		});
	});

	describe('N8N_SSRF_BLOCKED_IP_RANGES', () => {
		test('expands "default" to default ranges', () => {
			process.env = { N8N_SSRF_BLOCKED_IP_RANGES: 'default' };
			const config = Container.get(SsrfProtectionConfig);
			expect(config.blockedIpRanges).toEqual(SSRF_DEFAULT_BLOCKED_IP_RANGES);
		});

		test('expands "default" and appends custom ranges', () => {
			process.env = { N8N_SSRF_BLOCKED_IP_RANGES: 'default,100.0.0.0/8' };
			const config = Container.get(SsrfProtectionConfig);
			expect(config.blockedIpRanges).toEqual([...SSRF_DEFAULT_BLOCKED_IP_RANGES, '100.0.0.0/8']);
		});

		test('matches "default" case-insensitively', () => {
			process.env = { N8N_SSRF_BLOCKED_IP_RANGES: 'DEFAULT,100.0.0.0/8' };
			const config = Container.get(SsrfProtectionConfig);
			expect(config.blockedIpRanges).toEqual([...SSRF_DEFAULT_BLOCKED_IP_RANGES, '100.0.0.0/8']);
		});

		test('parses custom comma-separated CIDRs', () => {
			process.env = { N8N_SSRF_BLOCKED_IP_RANGES: '10.0.0.0/8,192.168.0.0/16' };
			const config = Container.get(SsrfProtectionConfig);
			expect(config.blockedIpRanges).toEqual(['10.0.0.0/8', '192.168.0.0/16']);
		});

		test('trims whitespace in custom CIDRs', () => {
			process.env = { N8N_SSRF_BLOCKED_IP_RANGES: ' 10.0.0.0/8 , 192.168.0.0/16 ' };
			const config = Container.get(SsrfProtectionConfig);
			expect(config.blockedIpRanges).toEqual(['10.0.0.0/8', '192.168.0.0/16']);
		});

		test('filters empty entries', () => {
			process.env = { N8N_SSRF_BLOCKED_IP_RANGES: '10.0.0.0/8,,192.168.0.0/16' };
			const config = Container.get(SsrfProtectionConfig);
			expect(config.blockedIpRanges).toEqual(['10.0.0.0/8', '192.168.0.0/16']);
		});

		test('handles a single CIDR', () => {
			process.env = { N8N_SSRF_BLOCKED_IP_RANGES: '10.0.0.0/8' };
			expect(Container.get(SsrfProtectionConfig).blockedIpRanges).toEqual(['10.0.0.0/8']);
		});
	});

	describe('N8N_SSRF_ALLOWED_IP_RANGES', () => {
		test('parses comma-separated CIDRs', () => {
			process.env = { N8N_SSRF_ALLOWED_IP_RANGES: '10.5.0.0/24,10.6.0.0/24' };
			expect(Container.get(SsrfProtectionConfig).allowedIpRanges).toEqual([
				'10.5.0.0/24',
				'10.6.0.0/24',
			]);
		});

		test('is empty when env var is empty string', () => {
			process.env = { N8N_SSRF_ALLOWED_IP_RANGES: '' };
			expect(Container.get(SsrfProtectionConfig).allowedIpRanges).toEqual([]);
		});
	});

	describe('N8N_SSRF_ALLOWED_HOSTNAMES', () => {
		test('parses comma-separated patterns', () => {
			process.env = { N8N_SSRF_ALLOWED_HOSTNAMES: '*.n8n.internal,api.example.com' };
			expect(Container.get(SsrfProtectionConfig).allowedHostnames).toEqual([
				'*.n8n.internal',
				'api.example.com',
			]);
		});

		test('is empty when env var is empty string', () => {
			process.env = { N8N_SSRF_ALLOWED_HOSTNAMES: '' };
			expect(Container.get(SsrfProtectionConfig).allowedHostnames).toEqual([]);
		});
	});

	describe('numeric fields', () => {
		test('overrides dnsCacheMaxSize from env', () => {
			process.env = { N8N_SSRF_DNS_CACHE_MAX_SIZE: '2097152' };
			expect(Container.get(SsrfProtectionConfig).dnsCacheMaxSize).toBe(2097152);
		});

		test('falls back to default for invalid dnsCacheMaxSize', () => {
			const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();

			process.env = { N8N_SSRF_DNS_CACHE_MAX_SIZE: 'invalid' };
			expect(Container.get(SsrfProtectionConfig).dnsCacheMaxSize).toBe(1048576);
			expect(consoleWarnSpy).toHaveBeenCalled();

			consoleWarnSpy.mockRestore();
		});
	});
});
