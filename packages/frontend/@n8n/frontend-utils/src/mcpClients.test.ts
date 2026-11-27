import { claudeAddConnectorUrl, getMcpClientCatalog } from './mcpClients';

const SERVER_URL = 'https://acme.app.n8n.cloud/mcp-servers/sales-tools';

const clientsOf = (catalog: ReturnType<typeof getMcpClientCatalog>) =>
	new Map(catalog.flatMap((group) => group.clients).map((client) => [client.id, client]));

describe('getMcpClientCatalog with a server name', () => {
	const clients = clientsOf(getMcpClientCatalog(SERVER_URL, { serverName: 'sales-tools' }));

	it('should name the server in the commands of the CLI clients', () => {
		expect(clients.get('claude-code')?.installCommand).toBe(
			`claude mcp add --transport http sales-tools ${SERVER_URL}`,
		);
		expect(clients.get('codex')?.installCommand).toBe(
			`codex mcp add sales-tools --url "${SERVER_URL}"`,
		);
		expect(clients.get('codex')?.authCommand).toBe('codex mcp login sales-tools');
		expect(clients.get('gemini-cli')?.installCommand).toBe(
			`gemini mcp add --transport http sales-tools ${SERVER_URL}`,
		);
	});

	it('should name the server in the config snippets', () => {
		expect(JSON.parse(clients.get('vscode')!.configSnippet!)).toEqual({
			servers: { 'sales-tools': { type: 'http', url: SERVER_URL } },
		});
		expect(clients.get('codex')?.configSnippet).toContain('[mcp_servers.sales-tools]');
	});

	it('should name the server in the Cursor deep link', () => {
		const params = new URL(
			clients.get('cursor')!.deepLink!.replace('cursor://', 'https://cursor.test/'),
		).searchParams;
		expect(params.get('name')).toBe('sales-tools');
		expect(JSON.parse(atob(params.get('config')!))).toEqual({ url: SERVER_URL });
	});

	it('should keep a "+" of the Cursor config when the link is parsed', () => {
		// The base64 of this URL has a "+", which a query string reads as a space.
		const url = 'https://acme.app.n8n.cloud/mcp-servers/~~~';
		const link = clientsOf(getMcpClientCatalog(url)).get('cursor')!.deepLink!;
		const params = new URL(link.replace('cursor://', 'https://cursor.test/')).searchParams;

		expect(btoa(JSON.stringify({ url }))).toContain('+');
		expect(JSON.parse(atob(params.get('config')!))).toEqual({ url });
	});

	it('should name the server in the VS Code deep link', () => {
		const encoded = clients.get('vscode')!.deepLink!.replace('vscode:mcp/install?', '');
		expect(JSON.parse(decodeURIComponent(encoded))).toEqual({
			name: 'sales-tools',
			type: 'http',
			url: SERVER_URL,
		});
	});

	it('should keep the name "n8n" when no server name is given', () => {
		const instance = clientsOf(getMcpClientCatalog(SERVER_URL));
		expect(instance.get('claude-code')?.installCommand).toBe(
			`claude mcp add --transport http n8n ${SERVER_URL}`,
		);
		expect(instance.get('claude-ai')?.addUrl).toBe('https://claude.ai/directory/connectors/n8n');
	});
});

describe('claudeAddConnectorUrl', () => {
	it('should open the "Add custom connector" dialog with the name and the URL filled in', () => {
		const url = new URL(claudeAddConnectorUrl('Sales & Ops tools', SERVER_URL));

		expect(url.origin + url.pathname).toBe('https://claude.ai/customize/connectors');
		expect(url.searchParams.get('modal')).toBe('add-custom-connector');
		expect(url.searchParams.get('connectorName')).toBe('Sales & Ops tools');
		expect(url.searchParams.get('connectorUrl')).toBe(SERVER_URL);
	});

	it('should encode the name and the URL, so they cannot add query parameters', () => {
		const url = claudeAddConnectorUrl('a&modal=x', 'https://x.test/?a=1&b=2');

		expect(url).toBe(
			'https://claude.ai/customize/connectors?modal=add-custom-connector&connectorName=a%26modal%3Dx&connectorUrl=https%3A%2F%2Fx.test%2F%3Fa%3D1%26b%3D2',
		);
	});
});
