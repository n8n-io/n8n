import { Container } from '@n8n/di';

import { SsrfProtectionConfig, SSRF_DEFAULT_BLOCKED_IP_RANGES } from '../ssrf-protection.config';

describe('SsrfProtectionConfig', () => {
	beforeEach(() => {
		Container.reset();
		vi.clearAllMocks();
	});

	const originalEnv = process.env;
	afterEach(() => {
		process.env = originalEnv;
	});

	describe('defaults', () => {
		test('mode defaults to log (observe-before-enforce)', () => {
			process.env = {};
			const config = Container.get(SsrfProtectionConfig);
			expect(config.mode).toBe('log');
			// `enabled` is derived: log/enforce → true, off → false
			expect(config.enabled).toBe(true);
		});

		test('editable defaults to true', () => {
			process.env = {};
			expect(Container.get(SsrfProtectionConfig).editable).toBe(true);
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

		test('blockedHostnames is empty array', () => {
			process.env = {};
			expect(Container.get(SsrfProtectionConfig).blockedHostnames).toEqual([]);
		});

		test('dnsCacheMaxSize is 1048576', () => {
			process.env = {};
			expect(Container.get(SsrfProtectionConfig).dnsCacheMaxSize).toBe(1048576);
		});
	});

	describe('N8N_EGRESS_PROTECTION_MODE', () => {
		test.each(['off', 'log', 'enforce'] as const)('accepts %s', (mode) => {
			process.env = { N8N_EGRESS_PROTECTION_MODE: mode };
			expect(Container.get(SsrfProtectionConfig).mode).toBe(mode);
		});

		test('normalizes case', () => {
			process.env = { N8N_EGRESS_PROTECTION_MODE: 'Enforce' };
			expect(Container.get(SsrfProtectionConfig).mode).toBe('enforce');
		});

		test('falls back to log for invalid value with a warning', () => {
			const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
			process.env = { N8N_EGRESS_PROTECTION_MODE: 'bogus' };
			expect(Container.get(SsrfProtectionConfig).mode).toBe('log');
			expect(consoleWarnSpy).toHaveBeenCalled();
			consoleWarnSpy.mockRestore();
		});

		test('enabled is false only in off mode', () => {
			process.env = { N8N_EGRESS_PROTECTION_MODE: 'off' };
			expect(Container.get(SsrfProtectionConfig).enabled).toBe(false);
		});
	});

	describe('N8N_EGRESS_PROTECTION_EDITABLE', () => {
		test('can be forced off (e.g. Cloud)', () => {
			process.env = { N8N_EGRESS_PROTECTION_EDITABLE: 'false' };
			expect(Container.get(SsrfProtectionConfig).editable).toBe(false);
		});
	});

	describe('N8N_EGRESS_BLOCKED_IP_RANGES', () => {
		test('expands "default" to default ranges', () => {
			process.env = { N8N_EGRESS_BLOCKED_IP_RANGES: 'default' };
			const config = Container.get(SsrfProtectionConfig);
			expect(config.blockedIpRanges).toEqual(SSRF_DEFAULT_BLOCKED_IP_RANGES);
		});

		test('expands "default" and appends custom ranges', () => {
			process.env = { N8N_EGRESS_BLOCKED_IP_RANGES: 'default,100.0.0.0/8' };
			const config = Container.get(SsrfProtectionConfig);
			expect(config.blockedIpRanges).toEqual([...SSRF_DEFAULT_BLOCKED_IP_RANGES, '100.0.0.0/8']);
		});

		test('matches "default" case-insensitively', () => {
			process.env = { N8N_EGRESS_BLOCKED_IP_RANGES: 'DEFAULT,100.0.0.0/8' };
			const config = Container.get(SsrfProtectionConfig);
			expect(config.blockedIpRanges).toEqual([...SSRF_DEFAULT_BLOCKED_IP_RANGES, '100.0.0.0/8']);
		});

		test('parses custom comma-separated CIDRs', () => {
			process.env = { N8N_EGRESS_BLOCKED_IP_RANGES: '10.0.0.0/8,192.168.0.0/16' };
			const config = Container.get(SsrfProtectionConfig);
			expect(config.blockedIpRanges).toEqual(['10.0.0.0/8', '192.168.0.0/16']);
		});

		test('trims whitespace in custom CIDRs', () => {
			process.env = { N8N_EGRESS_BLOCKED_IP_RANGES: ' 10.0.0.0/8 , 192.168.0.0/16 ' };
			const config = Container.get(SsrfProtectionConfig);
			expect(config.blockedIpRanges).toEqual(['10.0.0.0/8', '192.168.0.0/16']);
		});

		test('filters empty entries', () => {
			process.env = { N8N_EGRESS_BLOCKED_IP_RANGES: '10.0.0.0/8,,192.168.0.0/16' };
			const config = Container.get(SsrfProtectionConfig);
			expect(config.blockedIpRanges).toEqual(['10.0.0.0/8', '192.168.0.0/16']);
		});

		test('handles a single CIDR', () => {
			process.env = { N8N_EGRESS_BLOCKED_IP_RANGES: '10.0.0.0/8' };
			expect(Container.get(SsrfProtectionConfig).blockedIpRanges).toEqual(['10.0.0.0/8']);
		});
	});

	describe('N8N_EGRESS_ALLOWED_IP_RANGES', () => {
		test('parses comma-separated CIDRs', () => {
			process.env = { N8N_EGRESS_ALLOWED_IP_RANGES: '10.5.0.0/24,10.6.0.0/24' };
			expect(Container.get(SsrfProtectionConfig).allowedIpRanges).toEqual([
				'10.5.0.0/24',
				'10.6.0.0/24',
			]);
		});

		test('is empty when env var is empty string', () => {
			process.env = { N8N_EGRESS_ALLOWED_IP_RANGES: '' };
			expect(Container.get(SsrfProtectionConfig).allowedIpRanges).toEqual([]);
		});
	});

	describe('N8N_EGRESS_ALLOWED_HOSTNAMES', () => {
		test('parses comma-separated patterns', () => {
			process.env = { N8N_EGRESS_ALLOWED_HOSTNAMES: '*.n8n.internal,api.example.com' };
			expect(Container.get(SsrfProtectionConfig).allowedHostnames).toEqual([
				'*.n8n.internal',
				'api.example.com',
			]);
		});

		test('is empty when env var is empty string', () => {
			process.env = { N8N_EGRESS_ALLOWED_HOSTNAMES: '' };
			expect(Container.get(SsrfProtectionConfig).allowedHostnames).toEqual([]);
		});
	});

	describe('N8N_EGRESS_BLOCKED_HOSTNAMES', () => {
		test('parses comma-separated patterns', () => {
			process.env = { N8N_EGRESS_BLOCKED_HOSTNAMES: '*.tracker.example,exfil.example.com' };
			expect(Container.get(SsrfProtectionConfig).blockedHostnames).toEqual([
				'*.tracker.example',
				'exfil.example.com',
			]);
		});

		test('is empty when env var is empty string', () => {
			process.env = { N8N_EGRESS_BLOCKED_HOSTNAMES: '' };
			expect(Container.get(SsrfProtectionConfig).blockedHostnames).toEqual([]);
		});
	});

	describe('numeric fields', () => {
		test('overrides dnsCacheMaxSize from env', () => {
			process.env = { N8N_EGRESS_DNS_CACHE_MAX_SIZE: '2097152' };
			expect(Container.get(SsrfProtectionConfig).dnsCacheMaxSize).toBe(2097152);
		});

		test('falls back to default for invalid dnsCacheMaxSize', () => {
			const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

			process.env = { N8N_EGRESS_DNS_CACHE_MAX_SIZE: 'invalid' };
			expect(Container.get(SsrfProtectionConfig).dnsCacheMaxSize).toBe(1048576);
			expect(consoleWarnSpy).toHaveBeenCalled();

			consoleWarnSpy.mockRestore();
		});
	});

	describe('deprecated N8N_SSRF_* aliases', () => {
		test('N8N_SSRF_PROTECTION_ENABLED=true maps to enforce', () => {
			const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
			process.env = { N8N_SSRF_PROTECTION_ENABLED: 'true' };
			expect(Container.get(SsrfProtectionConfig).mode).toBe('enforce');
			expect(consoleWarnSpy).toHaveBeenCalled();
			consoleWarnSpy.mockRestore();
		});

		test('N8N_SSRF_PROTECTION_ENABLED=false maps to off', () => {
			const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
			process.env = { N8N_SSRF_PROTECTION_ENABLED: 'false' };
			expect(Container.get(SsrfProtectionConfig).mode).toBe('off');
			consoleWarnSpy.mockRestore();
		});

		test('new N8N_EGRESS_PROTECTION_MODE takes precedence over the legacy alias', () => {
			const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
			process.env = {
				N8N_SSRF_PROTECTION_ENABLED: 'true',
				N8N_EGRESS_PROTECTION_MODE: 'log',
			};
			expect(Container.get(SsrfProtectionConfig).mode).toBe('log');
			consoleWarnSpy.mockRestore();
		});

		test('legacy list aliases are honored', () => {
			const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
			process.env = {
				N8N_SSRF_BLOCKED_IP_RANGES: '10.0.0.0/8',
				N8N_SSRF_ALLOWED_IP_RANGES: '10.5.0.0/24',
				N8N_SSRF_ALLOWED_HOSTNAMES: 'api.example.com',
				N8N_SSRF_BLOCKED_HOSTNAMES: '*.tracker.example',
			};
			const config = Container.get(SsrfProtectionConfig);
			expect(config.blockedIpRanges).toEqual(['10.0.0.0/8']);
			expect(config.allowedIpRanges).toEqual(['10.5.0.0/24']);
			expect(config.allowedHostnames).toEqual(['api.example.com']);
			expect(config.blockedHostnames).toEqual(['*.tracker.example']);
			consoleWarnSpy.mockRestore();
		});

		test('new N8N_EGRESS_BLOCKED_IP_RANGES takes precedence over legacy', () => {
			const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
			process.env = {
				N8N_SSRF_BLOCKED_IP_RANGES: '10.0.0.0/8',
				N8N_EGRESS_BLOCKED_IP_RANGES: '192.168.0.0/16',
			};
			expect(Container.get(SsrfProtectionConfig).blockedIpRanges).toEqual(['192.168.0.0/16']);
			consoleWarnSpy.mockRestore();
		});
	});
});
