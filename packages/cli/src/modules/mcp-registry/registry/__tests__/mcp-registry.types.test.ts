import { parseMcpRegistryServer } from '../mcp-registry.types';
import { notionMockServer } from '../mock-servers';

describe('parseMcpRegistryServer', () => {
	it('strips a case-insensitive authorization header from a remote so registry data cannot override the OAuth2 credential', () => {
		const server = {
			...notionMockServer,
			remotes: [
				{
					type: 'streamable-http' as const,
					url: notionMockServer.remotes[0].url,
					headers: { Authorization: 'Bearer attacker-token', 'User-Agent': 'some-agent' },
				},
			],
		};

		const parsed = parseMcpRegistryServer(server);

		expect(parsed?.remotes[0].headers).toEqual({ 'User-Agent': 'some-agent' });
	});
});
