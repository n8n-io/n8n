import { Container } from '@n8n/di';

import { setupTestServer } from '@test-integration/utils';

import { McpSettingsService } from '../mcp.settings.service';

const testServer = setupTestServer({ modules: ['oauth-server', 'mcp'], endpointGroups: ['mcp'] });

let mcpSettingsService: McpSettingsService;

beforeAll(() => {
	mcpSettingsService = Container.get(McpSettingsService);
});

afterEach(async () => {
	await mcpSettingsService.setEnabled(false);
});

describe('MCP access disabled', () => {
	test('POST /mcp-server/http answers 404 without an authentication challenge', async () => {
		const response = await testServer.restlessAgent.post('/mcp-server/http').send({
			jsonrpc: '2.0',
			method: 'initialize',
			id: 1,
		});

		expect(response.statusCode).toBe(404);
		expect(response.headers['www-authenticate']).toBeUndefined();
	});

	test('GET /mcp-server/http answers 404', async () => {
		const response = await testServer.restlessAgent.get('/mcp-server/http');

		expect(response.statusCode).toBe(404);
	});

	test('HEAD /mcp-server/http answers 404 without an authentication challenge', async () => {
		const response = await testServer.restlessAgent.head('/mcp-server/http');

		expect(response.statusCode).toBe(404);
		expect(response.headers['www-authenticate']).toBeUndefined();
	});
});

describe('MCP access enabled', () => {
	beforeEach(async () => {
		await mcpSettingsService.setEnabled(true);
	});

	test('POST /mcp-server/http challenges unauthenticated requests', async () => {
		const response = await testServer.restlessAgent.post('/mcp-server/http').send({
			jsonrpc: '2.0',
			method: 'initialize',
			id: 1,
		});

		expect(response.statusCode).toBe(401);
		expect(response.headers['www-authenticate']).toContain('resource_metadata=');
	});

	test('HEAD /mcp-server/http advertises the protected-resource metadata', async () => {
		const response = await testServer.restlessAgent.head('/mcp-server/http');

		expect(response.statusCode).toBe(401);
		expect(response.headers['www-authenticate']).toContain('resource_metadata=');
	});
});
