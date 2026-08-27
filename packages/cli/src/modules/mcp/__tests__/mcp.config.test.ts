import { Container } from '@n8n/di';

import { McpConfig } from '../mcp.config';

describe('McpConfig', () => {
	beforeEach(() => {
		Container.reset();
	});

	afterEach(() => {
		delete process.env.N8N_MCP_SERVER_RATE_LIMIT;
		delete process.env.N8N_MCP_BASE_URL;
	});

	it('applies the documented default limit', () => {
		const config = Container.get(McpConfig);

		expect(config.rateLimitServer).toBe(100);
	});

	it('reads the limit from its environment variable', () => {
		process.env.N8N_MCP_SERVER_RATE_LIMIT = '500';

		const config = Container.get(McpConfig);

		expect(config.rateLimitServer).toBe(500);
	});

	it('accepts 0 to disable rate limiting for the endpoint', () => {
		process.env.N8N_MCP_SERVER_RATE_LIMIT = '0';

		const config = Container.get(McpConfig);

		expect(config.rateLimitServer).toBe(0);
	});

	it.each(['-5', 'abc', '1.5'])(
		'falls back to the default when given an invalid value (%s)',
		(value) => {
			process.env.N8N_MCP_SERVER_RATE_LIMIT = value;

			const config = Container.get(McpConfig);

			expect(config.rateLimitServer).toBe(100);
		},
	);

	describe('baseUrl', () => {
		it('defaults to unset', () => {
			expect(Container.get(McpConfig).baseUrl).toBe('');
		});

		it('reads and normalizes the URL from its environment variable', () => {
			process.env.N8N_MCP_BASE_URL = 'https://n8n-mcp.example.com/';

			expect(Container.get(McpConfig).baseUrl).toBe('https://n8n-mcp.example.com');
		});

		it('preserves a subpath while stripping query and fragment', () => {
			process.env.N8N_MCP_BASE_URL = 'https://example.com/n8n/?foo=1#bar';

			expect(Container.get(McpConfig).baseUrl).toBe('https://example.com/n8n');
		});

		it.each(['not-a-url', 'ftp://example.com', '//half-a-url'])(
			'falls back to unset when given an invalid value (%s)',
			(value) => {
				process.env.N8N_MCP_BASE_URL = value;

				expect(Container.get(McpConfig).baseUrl).toBe('');
			},
		);
	});
});
