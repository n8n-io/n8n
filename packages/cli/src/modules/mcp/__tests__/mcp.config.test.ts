import { Container } from '@n8n/di';

import { McpConfig } from '../mcp.config';

describe('McpConfig', () => {
	beforeEach(() => {
		Container.reset();
	});

	afterEach(() => {
		delete process.env.N8N_MCP_SERVER_RATE_LIMIT;
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
});
