import { parseServerOptions } from '../server-config';

describe('parseServerOptions', () => {
	const savedEnv = { ...process.env };

	afterEach(() => {
		// Restore environment after each test
		for (const key of Object.keys(process.env)) {
			if (key.startsWith('N8N_MCP_BROWSER_')) {
				delete process.env[key];
			}
		}
		Object.assign(process.env, savedEnv);
	});

	describe('defaults', () => {
		it('should return http transport on port 3100 with empty config', () => {
			const result = parseServerOptions([]);

			expect(result.transport).toBe('http');
			expect(result.port).toBe(3100);
			expect(result.config).toEqual({});
		});
	});

	describe('CLI flags', () => {
		it('should parse --browser', () => {
			const result = parseServerOptions(['--browser', 'chrome']);

			expect(result.config.defaultBrowser).toBe('chrome');
		});

		it('should parse short alias -b', () => {
			const result = parseServerOptions(['-b', 'edge']);

			expect(result.config.defaultBrowser).toBe('edge');
		});

		it('should parse --transport and --port', () => {
			const result = parseServerOptions(['--transport', 'stdio', '--port', '8080']);

			expect(result.transport).toBe('stdio');
			expect(result.port).toBe(8080);
		});

		it('should parse -t and -p aliases for transport and port', () => {
			const result = parseServerOptions(['-t', 'stdio', '-p', '9090']);

			expect(result.transport).toBe('stdio');
			expect(result.port).toBe(9090);
		});
	});

	describe('environment variables', () => {
		it('should read config from N8N_MCP_BROWSER_ env vars', () => {
			process.env.N8N_MCP_BROWSER_DEFAULT_BROWSER = 'edge';

			const result = parseServerOptions([]);

			expect(result.config.defaultBrowser).toBe('edge');
		});

		it('should read transport and port from env vars', () => {
			process.env.N8N_MCP_BROWSER_TRANSPORT = 'stdio';
			process.env.N8N_MCP_BROWSER_PORT = '4000';

			const result = parseServerOptions([]);

			expect(result.transport).toBe('stdio');
			expect(result.port).toBe(4000);
		});
	});

	describe('precedence', () => {
		it('should let CLI flags override env vars', () => {
			process.env.N8N_MCP_BROWSER_DEFAULT_BROWSER = 'firefox';
			process.env.N8N_MCP_BROWSER_PORT = '5000';

			const result = parseServerOptions(['--browser', 'chrome', '--port', '6000']);

			expect(result.config.defaultBrowser).toBe('chrome');
			expect(result.port).toBe(6000);
		});
	});
});
