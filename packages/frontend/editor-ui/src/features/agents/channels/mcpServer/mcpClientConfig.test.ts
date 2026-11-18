import { buildMcpClientConfigs, toMcpServerName } from './mcpClientConfig';

const URL = 'https://n8n.example.com/agent-webhook/agent-1/mcp';

describe('toMcpServerName', () => {
	it.each([
		['Support Agent', 'support-agent'],
		['  Ünïcode & co!  ', 'n-code-co'],
		['***', 'n8n-agent'],
	])('should turn %s into %s', (name, expected) => {
		expect(toMcpServerName(name)).toBe(expected);
	});
});

describe('buildMcpClientConfigs', () => {
	it('should build one config for each client with the server URL', () => {
		const configs = buildMcpClientConfigs('Support Agent', URL);

		expect(configs.map(({ client }) => client)).toEqual([
			'claudeCode',
			'cursor',
			'vscode',
			'stdio',
		]);
		expect(configs[0].code).toBe(`claude mcp add --transport http support-agent ${URL}`);
		expect(JSON.parse(configs[1].code)).toEqual({ mcpServers: { 'support-agent': { url: URL } } });
		expect(JSON.parse(configs[2].code)).toEqual({
			servers: { 'support-agent': { type: 'http', url: URL } },
		});
		expect(JSON.parse(configs[3].code)).toEqual({
			mcpServers: { 'support-agent': { command: 'npx', args: ['-y', 'mcp-remote', URL] } },
		});
	});
});
