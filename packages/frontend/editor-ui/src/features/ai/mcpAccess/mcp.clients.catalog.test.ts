import { getMcpClientCatalog } from '@/features/ai/mcpAccess/mcp.clients.catalog';

const SERVER_URL = 'https://acme.app.n8n.cloud/mcp-server/http';

describe('getMcpClientCatalog', () => {
	const catalog = getMcpClientCatalog(SERVER_URL);
	const clients = catalog.flatMap((group) => group.clients);

	it('should group the clients by category in picker order', () => {
		expect(catalog.map((group) => group.id)).toEqual(['cli', 'web', 'ide']);
		expect(catalog.map((group) => group.clients.map((client) => client.id))).toEqual([
			['claude-code', 'codex', 'gemini-cli'],
			['claude-ai', 'chatgpt'],
			['cursor', 'vscode', 'windsurf'],
		]);
	});

	it('should embed the server URL in every install command and config snippet', () => {
		for (const client of clients) {
			if (client.installCommand) expect(client.installCommand).toContain(SERVER_URL);
			if (client.configSnippet) expect(client.configSnippet).toContain(SERVER_URL);
		}
	});

	it('should build the Cursor deep link with a base64 config payload', () => {
		const cursor = clients.find((client) => client.id === 'cursor');
		const config = new URL(cursor!.deepLink!.replace('cursor://', 'https://cursor.test/'))
			.searchParams;
		expect(config.get('name')).toBe('n8n');
		expect(JSON.parse(atob(config.get('config')!))).toEqual({ url: SERVER_URL });
	});

	it('should build the VS Code deep link with a URL-encoded JSON payload', () => {
		const vscode = clients.find((client) => client.id === 'vscode');
		const encoded = vscode!.deepLink!.replace('vscode:mcp/install?', '');
		expect(JSON.parse(decodeURIComponent(encoded))).toEqual({
			name: 'n8n',
			type: 'http',
			url: SERVER_URL,
		});
	});

	it('should give every web client a connector URL and every CLI an install command', () => {
		const web = catalog.find((group) => group.id === 'web')!;
		for (const client of web.clients) expect(client.addUrl).toMatch(/^https:\/\//);

		const cli = catalog.find((group) => group.id === 'cli')!;
		for (const client of cli.clients) {
			expect(client.installCommand).toBeTruthy();
			expect(client.configSnippet).toBeTruthy();
		}
	});
});
