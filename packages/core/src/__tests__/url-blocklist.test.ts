import {
	expandPatterns,
	matchesBlocklist,
	matchesPattern,
	validateUrlAgainstBlocklist,
} from '../url-blocklist';

describe('URL Blocklist', () => {
	describe('expandPatterns', () => {
		it('should expand cloud-metadata shortcut', () => {
			const result = expandPatterns(['cloud-metadata']);
			expect(result).toEqual(['169.254.169.254']);
		});

		it('should expand apipa shortcut', () => {
			const result = expandPatterns(['apipa']);
			expect(result).toEqual(['169.254.*']);
		});

		it('should expand localhost shortcut', () => {
			const result = expandPatterns(['localhost']);
			expect(result).toEqual(['127.*', '::1', 'localhost']);
		});

		it('should expand private-ip shortcut to all RFC 1918 ranges', () => {
			const result = expandPatterns(['private-ip']);
			expect(result).toContain('10.*');
			expect(result).toContain('172.16.*');
			expect(result).toContain('172.17.*');
			expect(result).toContain('172.31.*');
			expect(result).toContain('192.168.*');
			expect(result).toHaveLength(18); // 1 + 16 + 1
		});

		it('should pass through non-shortcut patterns unchanged', () => {
			const result = expandPatterns(['example.com', '10.0.0.*']);
			expect(result).toEqual(['example.com', '10.0.0.*']);
		});

		it('should handle mixed shortcuts and custom patterns', () => {
			const result = expandPatterns(['cloud-metadata', 'custom.host']);
			expect(result).toEqual(['169.254.169.254', 'custom.host']);
		});

		it('should handle empty strings and whitespace', () => {
			const result = expandPatterns(['', '  ', 'cloud-metadata', '']);
			expect(result).toEqual(['169.254.169.254']);
		});

		it('should be case-insensitive for shortcuts', () => {
			const result = expandPatterns(['CLOUD-METADATA', 'APIPA']);
			expect(result).toEqual(['169.254.169.254', '169.254.*']);
		});
	});

	describe('matchesPattern', () => {
		it('should match exact hostnames', () => {
			expect(matchesPattern('localhost', 'localhost')).toBe(true);
			expect(matchesPattern('example.com', 'example.com')).toBe(true);
		});

		it('should be case-insensitive', () => {
			expect(matchesPattern('LOCALHOST', 'localhost')).toBe(true);
			expect(matchesPattern('localhost', 'LOCALHOST')).toBe(true);
		});

		it('should match wildcard patterns', () => {
			expect(matchesPattern('169.254.169.254', '169.254.*')).toBe(true);
			expect(matchesPattern('169.254.0.1', '169.254.*')).toBe(true);
			expect(matchesPattern('10.0.0.1', '10.*')).toBe(true);
			expect(matchesPattern('10.255.255.255', '10.*')).toBe(true);
		});

		it('should not match non-matching wildcards', () => {
			expect(matchesPattern('192.168.1.1', '169.254.*')).toBe(false);
			expect(matchesPattern('11.0.0.1', '10.*')).toBe(false);
		});

		it('should not match partial hostnames without wildcards', () => {
			expect(matchesPattern('localhost.localdomain', 'localhost')).toBe(false);
			expect(matchesPattern('example.com', 'example')).toBe(false);
		});
	});

	describe('matchesBlocklist', () => {
		it('should return true when URL matches any pattern', () => {
			const blocklist = ['169.254.169.254', '10.*'];
			expect(matchesBlocklist('http://169.254.169.254/latest/meta-data', blocklist)).toBe(true);
			expect(matchesBlocklist('http://10.0.0.1:8080/api', blocklist)).toBe(true);
		});

		it('should return false when URL does not match any pattern', () => {
			const blocklist = ['169.254.*', 'localhost'];
			expect(matchesBlocklist('https://api.example.com/data', blocklist)).toBe(false);
			expect(matchesBlocklist('http://192.168.1.1:8080/api', blocklist)).toBe(false);
		});

		it('should handle IPv6 addresses', () => {
			const blocklist = ['::1'];
			expect(matchesBlocklist('http://[::1]:8080/api', blocklist)).toBe(true);
			expect(matchesBlocklist('http://[::1]/api', blocklist)).toBe(true);
		});

		it('should return false for invalid URLs', () => {
			const blocklist = ['169.254.*'];
			expect(matchesBlocklist('not-a-valid-url', blocklist)).toBe(false);
		});

		it('should handle localhost hostname', () => {
			const blocklist = ['localhost'];
			expect(matchesBlocklist('http://localhost:5678/healthz', blocklist)).toBe(true);
			expect(matchesBlocklist('http://localhost/api', blocklist)).toBe(true);
		});

		it('should handle 127.x.x.x loopback range', () => {
			const blocklist = ['127.*'];
			expect(matchesBlocklist('http://127.0.0.1:8080', blocklist)).toBe(true);
			expect(matchesBlocklist('http://127.255.255.255/test', blocklist)).toBe(true);
		});
	});

	describe('validateUrlAgainstBlocklist', () => {
		it('should not throw when blocklist is empty', () => {
			expect(() => validateUrlAgainstBlocklist('http://169.254.169.254', '')).not.toThrow();
		});

		it('should not throw when blocklist is whitespace only', () => {
			expect(() => validateUrlAgainstBlocklist('http://169.254.169.254', '   ')).not.toThrow();
		});

		it('should throw when URL matches blocklist', () => {
			expect(() =>
				validateUrlAgainstBlocklist('http://169.254.169.254/latest/meta-data', 'cloud-metadata'),
			).toThrow(/Request blocked/);
		});

		it('should not throw when URL does not match blocklist', () => {
			expect(() =>
				validateUrlAgainstBlocklist('https://api.example.com/data', 'cloud-metadata,localhost'),
			).not.toThrow();
		});

		it('should handle comma-separated patterns', () => {
			expect(() =>
				validateUrlAgainstBlocklist('http://localhost:8080', 'cloud-metadata,localhost'),
			).toThrow(/Request blocked/);
		});

		it('should include hostname in error message', () => {
			expect(() =>
				validateUrlAgainstBlocklist('http://169.254.169.254/meta-data', 'cloud-metadata'),
			).toThrow(/169\.254\.169\.254/);
		});
	});

	describe('cloud and private network blocking scenarios', () => {
		const cloudConfig = 'cloud-metadata,apipa,private-ip';

		it('should block AWS metadata endpoint', () => {
			expect(() =>
				validateUrlAgainstBlocklist(
					'http://169.254.169.254/latest/meta-data/iam/security-credentials/role-name',
					cloudConfig,
				),
			).toThrow(/Request blocked/);
		});

		it('should block GCP metadata endpoint', () => {
			expect(() =>
				validateUrlAgainstBlocklist(
					'http://169.254.169.254/computeMetadata/v1/instance/service-accounts/default/token',
					cloudConfig,
				),
			).toThrow(/Request blocked/);
		});

		it('should block Azure metadata endpoint', () => {
			expect(() =>
				validateUrlAgainstBlocklist(
					'http://169.254.169.254/metadata/identity/oauth2/token',
					cloudConfig,
				),
			).toThrow(/Request blocked/);
		});

		it('should block Docker bridge gateway access', () => {
			expect(() =>
				validateUrlAgainstBlocklist('http://172.17.0.1:8080/internal-api', cloudConfig),
			).toThrow(/Request blocked/);
		});

		it('should block private 10.x.x.x network', () => {
			expect(() => validateUrlAgainstBlocklist('http://10.0.0.1:3000/api', cloudConfig)).toThrow(
				/Request blocked/,
			);
		});

		it('should block private 192.168.x.x network', () => {
			expect(() =>
				validateUrlAgainstBlocklist('http://192.168.1.100:8080/internal', cloudConfig),
			).toThrow(/Request blocked/);
		});

		it('should allow public internet URLs', () => {
			expect(() =>
				validateUrlAgainstBlocklist('https://api.github.com/repos', cloudConfig),
			).not.toThrow();
		});

		it('should allow public IP addresses', () => {
			expect(() =>
				validateUrlAgainstBlocklist('http://8.8.8.8/dns-query', cloudConfig),
			).not.toThrow();
		});
	});

	describe('self-hosted scenarios (no blocklist)', () => {
		it('should allow localhost when no blocklist configured', () => {
			expect(() => validateUrlAgainstBlocklist('http://localhost:5678/api', '')).not.toThrow();
		});

		it('should allow 127.0.0.1 when no blocklist configured', () => {
			expect(() => validateUrlAgainstBlocklist('http://127.0.0.1:5678/healthz', '')).not.toThrow();
		});

		it('should allow Docker bridge when no blocklist configured', () => {
			expect(() => validateUrlAgainstBlocklist('http://172.17.0.1:8080/service', '')).not.toThrow();
		});

		it('should allow private network when no blocklist configured', () => {
			expect(() => validateUrlAgainstBlocklist('http://192.168.1.50:3000/api', '')).not.toThrow();
		});
	});
});
