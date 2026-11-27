import { withMcpHttpStatus } from '../mcp/http-error';

describe('MCP HTTP error formatting', () => {
	it.each([300, 302, 401, 404, 429, 500, 503, 599])(
		'retains HTTP %s for both transports',
		async (status) => {
			const [{ StreamableHTTPError }, { SseError }] = await Promise.all([
				import('@modelcontextprotocol/sdk/client/streamableHttp.js'),
				import('@modelcontextprotocol/sdk/client/sse.js'),
			]);
			for (const error of [
				new StreamableHTTPError(status, 'Unavailable'),
				new SseError(status, 'Unavailable', new Event('error')),
			]) {
				const message = error.message;
				expect(await withMcpHttpStatus(error, message)).toBe(`HTTP ${status}: ${message}`);
				expect(error.message).toBe(message);
				expect(error.code).toBe(status);
			}
		},
	);

	it.each([undefined, -1, 200, 299, 600, 429.5, NaN])(
		'does not label transport code %s as HTTP failure',
		async (status) => {
			const { StreamableHTTPError } = await import(
				'@modelcontextprotocol/sdk/client/streamableHttp.js'
			);
			const error = new StreamableHTTPError(status, 'Connection failed');
			expect(await withMcpHttpStatus(error, error.message)).toBe(error.message);
		},
	);

	it('leaves protocol errors, lookalike codes and non-errors unchanged', async () => {
		const { McpError } = await import('@modelcontextprotocol/sdk/types.js');
		const values = [
			new McpError(429, 'Protocol failure'),
			Object.assign(new Error('Other failure'), { code: 503 }),
			'Failure',
			null,
		];
		for (const error of values) {
			expect(await withMcpHttpStatus(error, 'Existing message')).toBe('Existing message');
		}
	});
});
