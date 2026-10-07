import {
	INSTANCE_MCP_PATH,
	isLoopbackHostname,
	normaliseInstanceAddress,
	type InstanceAddressError,
} from '../instance-address';

describe('normaliseInstanceAddress', () => {
	describe('accepted addresses', () => {
		it.each<[string, string, string, boolean]>([
			['acme.app.n8n.cloud', 'https://acme.app.n8n.cloud', 'acme.app.n8n.cloud', false],
			[
				'https://acme.app.n8n.cloud/home/workflows',
				'https://acme.app.n8n.cloud',
				'acme.app.n8n.cloud',
				false,
			],
			['http://127.0.0.1:5680/', 'http://127.0.0.1:5680', '127.0.0.1', true],
			[
				'HTTPS://ACME.App.N8N.Cloud/Home',
				'https://acme.app.n8n.cloud',
				'acme.app.n8n.cloud',
				false,
			],
			[
				'https://acme.app.n8n.cloud:443/',
				'https://acme.app.n8n.cloud',
				'acme.app.n8n.cloud',
				false,
			],
			[
				'https://acme.app.n8n.cloud:80',
				'https://acme.app.n8n.cloud:80',
				'acme.app.n8n.cloud',
				false,
			],
			['http://localhost:80/rest', 'http://localhost', 'localhost', true],
			['HTTP://LOCALHOST:5678', 'http://localhost:5678', 'localhost', true],
			['http://[::1]:5680', 'http://[::1]:5680', '[::1]', true],
			['http://[0:0:0:0:0:0:0:1]:5680/x', 'http://[::1]:5680', '[::1]', true],
			['http://127.10.20.30:5678', 'http://127.10.20.30:5678', '127.10.20.30', true],
			['http://127.1:5678', 'http://127.0.0.1:5678', '127.0.0.1', true],
			['localhost:5678/home', 'https://localhost:5678', 'localhost', true],
			['192.168.1.10', 'https://192.168.1.10', '192.168.1.10', false],
			['10.0.0.5:5678', 'https://10.0.0.5:5678', '10.0.0.5', false],
			['  acme.app.n8n.cloud \n', 'https://acme.app.n8n.cloud', 'acme.app.n8n.cloud', false],
			[
				'https://acme.app.n8n.cloud/path?query=1#hash',
				'https://acme.app.n8n.cloud',
				'acme.app.n8n.cloud',
				false,
			],
			['https://exämple.com', 'https://xn--exmple-cua.com', 'xn--exmple-cua.com', false],
		])('accepts %j as %s', (input, origin, host, isLoopback) => {
			expect(normaliseInstanceAddress(input)).toEqual({
				ok: true,
				origin,
				mcpUrl: `${origin}/mcp-server/http`,
				host,
				isLoopback,
			});
		});
	});

	describe('rejected addresses', () => {
		it.each<[string, InstanceAddressError]>([
			['', 'empty'],
			['   \t\n', 'empty'],
			['acme app.n8n.cloud', 'invalid'],
			['acme.app\n.n8n.cloud', 'invalid'],
			['https://', 'invalid'],
			['https://acme.app.n8n.cloud:99999', 'invalid'],
			['ftp://x', 'unsupported-protocol'],
			['javascript:alert(1)', 'unsupported-protocol'],
			['file:///etc/hosts', 'unsupported-protocol'],
			['ws://acme.app.n8n.cloud', 'unsupported-protocol'],
			['https://user:pw@host', 'has-credentials'],
			['https://user@acme.app.n8n.cloud', 'has-credentials'],
			['http://user:pw@localhost:5678', 'has-credentials'],
			['http://example.com', 'insecure-http'],
			['http://localhost.example.com', 'insecure-http'],
			['http://127.0.0.1.example.com', 'insecure-http'],
			['http://[::2]:5678', 'insecure-http'],
		])('rejects %j with %s', (input, error) => {
			expect(normaliseInstanceAddress(input)).toEqual({ ok: false, error });
		});
	});

	describe('allowInsecureHttp option', () => {
		it('rejects plain HTTP for a public host without the option', () => {
			expect(normaliseInstanceAddress('http://example.com', { allowInsecureHttp: false })).toEqual({
				ok: false,
				error: 'insecure-http',
			});
		});

		it('accepts plain HTTP for a public host with the option', () => {
			expect(
				normaliseInstanceAddress('http://example.com/home', { allowInsecureHttp: true }),
			).toEqual({
				ok: true,
				origin: 'http://example.com',
				mcpUrl: 'http://example.com/mcp-server/http',
				host: 'example.com',
				isLoopback: false,
			});
		});

		it('still rejects credentials and other protocols with the option', () => {
			const options = { allowInsecureHttp: true };

			expect(normaliseInstanceAddress('http://u:p@example.com', options)).toEqual({
				ok: false,
				error: 'has-credentials',
			});
			expect(normaliseInstanceAddress('ftp://example.com', options)).toEqual({
				ok: false,
				error: 'unsupported-protocol',
			});
		});

		it('keeps HTTPS addresses unchanged by the option', () => {
			expect(normaliseInstanceAddress('acme.app.n8n.cloud', { allowInsecureHttp: true })).toEqual(
				normaliseInstanceAddress('acme.app.n8n.cloud'),
			);
		});
	});

	it('builds the MCP URL from the origin', () => {
		const result = normaliseInstanceAddress('https://acme.app.n8n.cloud/home');

		expect(result.ok && result.mcpUrl).toBe(`https://acme.app.n8n.cloud${INSTANCE_MCP_PATH}`);
	});
});

describe('isLoopbackHostname', () => {
	it.each(['localhost', '127.0.0.1', '127.255.255.255', '[::1]'])(
		'treats %s as loopback',
		(host) => {
			expect(isLoopbackHostname(host)).toBe(true);
		},
	);

	it.each(['example.com', '128.0.0.1', '10.0.0.1', '[::2]', 'localhost.example.com', '::1'])(
		'does not treat %s as loopback',
		(host) => {
			expect(isLoopbackHostname(host)).toBe(false);
		},
	);
});
