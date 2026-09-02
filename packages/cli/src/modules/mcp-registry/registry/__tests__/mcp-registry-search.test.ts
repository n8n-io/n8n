import { searchMcpRegistryServers } from '../mcp-registry-search';
import type { McpRegistryServer } from '../mcp-registry.types';

function server(overrides: Partial<McpRegistryServer> = {}): McpRegistryServer {
	return {
		name: 'GitHub',
		slug: 'github',
		title: 'GitHub',
		description: 'GitHub MCP server',
		tagline: 'Work with GitHub repos',
		version: '1.0.0',
		updatedAt: '2026-01-01T00:00:00.000Z',
		icons: [],
		authType: 'oauth2',
		remotes: [{ type: 'streamable-http', url: 'https://example.com/mcp' }],
		tools: [{ name: 'create_issue', title: 'Create issue' }],
		isOfficial: true,
		origin: 'registry',
		status: 'active',
		...overrides,
	} as McpRegistryServer;
}

describe('searchMcpRegistryServers', () => {
	it('returns nothing for empty/whitespace queries', () => {
		expect(searchMcpRegistryServers([server()], [])).toEqual([]);
		expect(searchMcpRegistryServers([server()], ['   '])).toEqual([]);
	});

	it('matches by slug/title/description/tagline case-insensitively', () => {
		const servers = [server()];
		expect(searchMcpRegistryServers(servers, ['GITHUB'])).toHaveLength(1);
		expect(searchMcpRegistryServers(servers, ['repos'])).toHaveLength(1); // tagline
		expect(searchMcpRegistryServers(servers, ['nonexistent'])).toHaveLength(0);
	});

	it('maps a matched server to the config-ready shape', () => {
		const [result] = searchMcpRegistryServers([server()], ['github']);
		expect(result).toEqual({
			slug: 'github',
			name: 'github',
			title: 'GitHub',
			description: 'Work with GitHub repos',
			url: 'https://example.com/mcp',
			transport: 'streamableHttp',
			authentication: 'githubMcpOAuth2Api',
			credentialType: 'githubMcpOAuth2Api',
			tools: [{ name: 'create_issue', title: 'Create issue' }],
			metadata: { nodeTypeName: '@n8n/mcp-registry.github' },
		});
	});

	it('prefers streamable-http, falling back to SSE', () => {
		const sseOnly = server({
			slug: 'sse-srv',
			remotes: [{ type: 'sse', url: 'https://sse.example' }],
		});
		const [result] = searchMcpRegistryServers([sseOnly], ['sse-srv']);
		expect(result.transport).toBe('sse');
		expect(result.url).toBe('https://sse.example/');
	});

	it('keeps the raw slug alongside the camelCased node name', () => {
		const [result] = searchMcpRegistryServers([server({ slug: 'google-drive' })], ['google-drive']);
		expect(result.slug).toBe('google-drive');
		expect(result.name).toBe('googleDrive');
		expect(result.credentialType).toBe('googleDriveMcpOAuth2Api');
	});

	it('ranks name matches above description matches', () => {
		const servers = [
			server({ slug: 'ci-bot', title: 'CI Bot', tagline: 'Mirrors issues to GitHub' }),
			server({ slug: 'github-lite', title: 'GitHub Lite' }),
			server(),
		];

		expect(searchMcpRegistryServers(servers, ['github']).map((result) => result.slug)).toEqual([
			'github',
			'github-lite',
			'ci-bot',
		]);
	});

	it('skips servers that have no usable remote', () => {
		const noRemote = server({ slug: 'no-remote', remotes: [] });
		expect(searchMcpRegistryServers([noRemote], ['no-remote'])).toEqual([]);
	});
});
