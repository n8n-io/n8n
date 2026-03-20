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

		it('should parse --headless boolean flag', () => {
			const result = parseServerOptions(['--headless']);
			expect(result.config.headless).toBe(true);
		});

		it('should parse --viewport WxH', () => {
			const result = parseServerOptions(['--viewport', '1920x1080']);
			expect(result.config.viewport).toEqual({ width: 1920, height: 1080 });
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
			process.env.N8N_MCP_BROWSER_HEADLESS = 'true';

			const result = parseServerOptions([]);

			expect(result.config.defaultBrowser).toBe('edge');
			expect(result.config.headless).toBe(true);
		});

		it('should read transport and port from env vars', () => {
			process.env.N8N_MCP_BROWSER_TRANSPORT = 'stdio';
			process.env.N8N_MCP_BROWSER_PORT = '4000';

			const result = parseServerOptions([]);

			expect(result.transport).toBe('stdio');
			expect(result.port).toBe(4000);
		});

		it('should parse HEADLESS=1 as true', () => {
			process.env.N8N_MCP_BROWSER_HEADLESS = '1';
			const result = parseServerOptions([]);
			expect(result.config.headless).toBe(true);
		});

		it('should parse HEADLESS=false as false', () => {
			process.env.N8N_MCP_BROWSER_HEADLESS = 'false';
			const result = parseServerOptions([]);
			expect(result.config.headless).toBe(false);
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

	describe('edge cases', () => {
		it('should ignore invalid viewport string', () => {
			const result = parseServerOptions(['--viewport', 'notaviewport']);
			expect(result.config.viewport).toBeUndefined();
		});

		it('should parse viewport case-insensitively', () => {
			const result = parseServerOptions(['--viewport', '800X600']);
			expect(result.config.viewport).toEqual({ width: 800, height: 600 });
		});
	});
});
