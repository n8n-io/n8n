import { validate } from 'class-validator';

import { NoUrl } from '../no-url.validator';

describe('NoUrl', () => {
	class Entity {
		@NoUrl()
		name = '';
	}

	let entity: Entity;

	beforeEach(() => {
		entity = new Entity();
	});

	describe('URL Patterns Correctly Blocked', () => {
		// These patterns should be caught by the current regex: /^(https?:\/\/|www\.)|(\.[\p{L}\d-]+)/iu
		const BLOCKED_URLS = [
			// Standard HTTP/HTTPS URLs
			'http://google.com',
			'https://google.com',
			'http://example.com/path',
			'https://example.com/path?param=value',
			'http://subdomain.example.com',
			'https://user:pass@example.com',
			'http://example.com:8080',
			'https://example.com:443/path',

			// www. prefixed domains
			'www.domain.tld',
			'www.example.com',
			'www.subdomain.example.com',
			'www.example.co.uk',
			'www.very-long-domain-name.com',

			// Domain variations (contain dots with alphanumeric)
			'n8n.io',
			'example.com',
			'subdomain.example.com',
			'example.co.uk',
			'example.museum',
			'localhost.localdomain',

			// IP addresses with HTTP
			'http://192.168.1.1',
			'https://10.0.0.1:8080',
			'http://127.0.0.1/admin',
			'https://[::1]:8080',
			'http://[2001:db8::1]',

			// HTTP/HTTPS URLs
			'http://malicious-site.com/steal-data',
			'https://phishing.example.com',

			// URLs with fragments and queries
			'http://example.com#fragment',
			'https://example.com?param=value#fragment',
			'http://example.com/path;jsessionid=123',

			// Case variations
			'HTTP://EXAMPLE.COM',
			'HTTPS://EXAMPLE.COM',
			'Www.Example.Com',
			'WWW.EXAMPLE.COM',

			// Protocol-relative URLs
			'//example.com',
			'///example.com',

			// Localhost variations
			'http://localhost',
			'https://localhost:3000',
			'www.localhost',
			'localhost.com',

			// Short URLs with domains
			'bit.ly',
			'tinyurl.com',
			't.co',
			'goo.gl',

			// SSRF vectors with HTTP
			'http://169.254.169.254/metadata',
			'http://metadata.google.internal',
			'http://169.254.169.254/v1/metadata',
			'https://aws-metadata.com',

			// Common domain extensions
			'malicious.site',
			'phishing.example',
			'attack.vector',
		];

		for (const str of BLOCKED_URLS) {
			test(`should block URL pattern: ${str}`, async () => {
				entity.name = str;
				const errors = await validate(entity);
				expect(errors).toHaveLength(1);
				const [error] = errors;
				expect(error.property).toEqual('name');
				expect(error.constraints).toEqual({ NoUrl: 'Potentially malicious string' });
			});
		}
	});

	describe('Current Validator Limitations', () => {
		// These patterns are NOT caught by the current regex but could be security risks
		// This test documents the current limitations for future enhancement
		const LIMITATION_PATTERNS = [
			// Non-HTTP protocols without domains
			'file://etc/passwd',
			'file:///etc/passwd',
			'file://c:/windows/system32',
			'javascript:alert(1)',
			'data:text/html,<script>alert(1)</script>',
			'vbscript:msgbox(1)',
			'about:blank',

			// Communication protocols without dots
			'tel:+1234567890',
			'sms:+1234567890',
			'skype:username',
			'zoom:meeting-id',
			'slack://channel',
			'discord://invite',

			// Encoded variations without recognizable patterns
			'www%2Eexample%2Ecom',

			// Spaced variations that have dots but spaces
			'example. com',

			// Partial protocols without dots
			'http:example',
			'http/example',
		];

		for (const str of LIMITATION_PATTERNS) {
			test(`documents limitation: ${str}`, async () => {
				entity.name = str;
				const errors = await validate(entity);
				// These should pass validation (not be blocked) with current implementation
				// This documents the current behavior for future security enhancements
				expect(errors).toHaveLength(0);
			});
		}
	});

	describe('Patterns Caught by Dot Rule', () => {
		// These are caught by the second part of the regex: \.[\p{L}\d-]+
		// They contain a dot followed by letters/digits/hyphens
		const DOT_RULE_PATTERNS = [
			// FTP with domain
			'ftp://example.com/file.txt',

			// Email addresses (caught by dot rule)
			'mailto:admin@example.com',
			'email@domain.com',

			// Encoded HTTP
			'http%3A%2F%2Fexample.com',

			// Spaced HTTP variations
			'ht tp://example.com',
			'h t t p://example.com',
			'http ://example.com',
			'http: //example.com',
			'http:/ /example.com',
			'www example.com',
			'www. example.com',
			'www .example.com',
			'. example.com',
			'example .com',
			'example.c om',
			'example.co m',
			'http:example.com',
			'http/example.com',

			// File extensions and technical terms
			'package.json',
			'tsconfig.json',
			'node.js',
			'vue.js',
		];

		for (const str of DOT_RULE_PATTERNS) {
			test(`should block pattern with dot rule: ${str}`, async () => {
				entity.name = str;
				const errors = await validate(entity);
				expect(errors).toHaveLength(1);
				const [error] = errors;
				expect(error.property).toEqual('name');
				expect(error.constraints).toEqual({ NoUrl: 'Potentially malicious string' });
			});
		}
	});

	describe('Valid Non-URL Strings', () => {
		const VALID_STRINGS = [
			// Regular names and text (no dots followed by letters)
			'John Doe',
			'API Integration',
			'Database Connection',
			'user-profile-update',
			'workflow_execution_123',

			// Technical abbreviations without dots
			'API',
			'REST',
			'GraphQL',
			'OAuth',
			'JWT',
			'SSL',
			'TLS',
			'SSH',
			'FTP',
			'HTTP', // Protocol names without :// should be allowed
			'HTTPS',
			'XML',
			'JSON',
			'YAML',
			'SQL',
			'NoSQL',

			// Numbers and codes
			'12345',
			'ABC-123',
			'user_12345',
			'session-abcd1234',
			'token_xyz789',

			// Special characters that are not URL indicators
			'namespace/resource',
			'group:permission',
			'key=value',
			'option[setting]',
			'array[0]',
			'workflow-step-1',
			'database_connection',
			'api_endpoint',
			'admin@localhost', // No domain extension, so not caught

			// International characters
			'José García',
			'François Müller',
			'李小明',
			'محمد أحمد',
			'Владимír Petrov',

			// Empty and whitespace
			'',
			'   ',
			'\t\n  ',

			// Version patterns without dots
			'v1-2-3',
			'version_2_1_0',
			'build_123',
			'release_candidate_1',

			// File names without extensions
			'Dockerfile',
			'README',
			'LICENSE',
			'CHANGELOG',
			'makefile',
			'script',
			'config',
			'data',

			// Paths and identifiers without dots
			'src/components',
			'tests/unit',
			'build/output',
			'docs/api',
			'scripts/deploy',
		];

		for (const str of VALID_STRINGS) {
			test(`should allow non-URL string: "${str}"`, async () => {
				entity.name = str;
				await expect(validate(entity)).resolves.toHaveLength(0);
			});
		}
	});

	describe('Edge Cases and Data Types', () => {
		test('should handle null values', async () => {
			entity.name = null as any;
			const errors = await validate(entity);
			// NoUrl validator works on strings only, so non-string values pass validation
			// but may fail other validations like @IsString if present
			expect(errors).toHaveLength(0);
		});

		test('should handle undefined values', async () => {
			entity.name = undefined as any;
			const errors = await validate(entity);
			// NoUrl validator works on strings only, so non-string values pass validation
			expect(errors).toHaveLength(0);
		});

		test('should handle numeric values', async () => {
			entity.name = 123 as any;
			const errors = await validate(entity);
			// NoUrl validator works on strings only, so non-string values pass validation
			expect(errors).toHaveLength(0);
		});

		test('should handle boolean values', async () => {
			entity.name = true as any;
			const errors = await validate(entity);
			// NoUrl validator works on strings only, so non-string values pass validation
			expect(errors).toHaveLength(0);
		});

		test('should handle object values', async () => {
			entity.name = { url: 'http://example.com' } as any;
			const errors = await validate(entity);
			// NoUrl validator works on strings only, so non-string values pass validation
			expect(errors).toHaveLength(0);
		});

		test('should handle array values', async () => {
			entity.name = ['http://example.com'] as any;
			const errors = await validate(entity);
			// Arrays are converted to strings by class-validator, so this will be blocked
			expect(errors).toHaveLength(1);
			const [error] = errors;
			expect(error.property).toEqual('name');
			expect(error.constraints).toEqual({ NoUrl: 'Potentially malicious string' });
		});
	});
});
