import { Readable } from 'node:stream';

import { redactOutboundRequest } from '../outbound-redaction';
import type { OutboundRequest } from '../tool-simulation.contracts';

type HttpRequest = Extract<OutboundRequest, { protocol: 'http' }>;

const redactHttp = (request: HttpRequest) => redactOutboundRequest(request) as HttpRequest;

const slackToken = 'xoxb-1234567890-abcdefghij';

describe('redactOutboundRequest', () => {
	it('drops auth headers and redacts secret-named query values and body fields', () => {
		const request = redactHttp({
			protocol: 'http',
			method: 'POST',
			url: 'https://user:pass@example.com/hook?api_key=abc123456&page=2&q=open+issues',
			headers: {
				Authorization: 'Bearer x',
				'X-Auth-Token': 'y',
				'Content-Type': 'application/json',
			},
			body: { password: 'hunter22222', query: 'open issues' },
		});

		expect(request.headers).toEqual({ 'Content-Type': 'application/json' });
		expect(request.url).not.toContain('user:pass');
		expect(request.url).not.toContain('abc123456');
		expect(request.url).toContain('page=2');
		expect(request.url).toContain('q=open+issues');
		expect(request.body).toEqual({ password: '[REDACTED]', query: 'open issues' });
	});

	it('removes secret-shaped values that a user typed into a tool', () => {
		const request = redactHttp({
			protocol: 'http',
			method: 'POST',
			url: `https://hooks.example.com/notify?note=${slackToken}`,
			headers: { 'X-Note': `token ${slackToken}` },
			body: { text: `use ${slackToken} to post`, channel: 'C0123456789' },
		});

		expect(JSON.stringify(request)).not.toContain(slackToken);
		expect(request.body).toMatchObject({ channel: 'C0123456789' });
	});

	it('describes binary and stream bodies instead of walking their bytes', () => {
		const binary = redactHttp({
			protocol: 'http',
			method: 'POST',
			url: 'https://upload.example.com/files',
			body: Buffer.from(`file with ${slackToken}`),
		});
		const stream = redactHttp({
			protocol: 'http',
			method: 'POST',
			url: 'https://upload.example.com/files',
			body: Readable.from([`streamed ${slackToken}`]),
		});

		expect(binary.body).toMatch(/^\[binary body, \d+ bytes\]$/);
		expect(stream.body).toBe('[Readable body]');
	});

	it('keeps form and multipart fields, redacted, and describes files', () => {
		const form = new FormData();
		form.append('chat_id', '42');
		form.append('password', 'hunter22222');
		form.append('document', new Blob(['file contents']), 'report.pdf');

		const multipart = redactHttp({
			protocol: 'http',
			method: 'POST',
			url: 'https://api.telegram.org/sendDocument',
			body: form,
		});
		const urlEncoded = redactHttp({
			protocol: 'http',
			method: 'POST',
			url: 'https://api.example.com/token',
			body: new URLSearchParams({ grant: 'x', client_secret: 'abc' }),
		});

		expect(multipart.body).toEqual({
			chat_id: '42',
			password: '[REDACTED]',
			document: '[file report.pdf, 13 bytes]',
		});
		expect(urlEncoded.body).toEqual({ grant: 'x', client_secret: '[REDACTED]' });
	});

	it('drops the URL fragment, where a typed-in token could hide', () => {
		const request = redactHttp({
			protocol: 'http',
			method: 'GET',
			url: 'https://example.com/hook?page=2#xoxb-1234567890-abcdefghij',
		});

		expect(request.url).toBe('https://example.com/hook?page=2');
	});

	it('redacts fields by name in a body that is already serialized', () => {
		const json = redactHttp({
			protocol: 'http',
			method: 'POST',
			url: 'https://api.example.com/login',
			body: '{"password":"hunter22222","query":"open issues"}',
		});
		const form = redactHttp({
			protocol: 'http',
			method: 'POST',
			url: 'https://api.example.com/token',
			headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
			body: 'grant_type=password&password=hunter22222&scope=read',
		});

		expect(JSON.parse(json.body as string)).toEqual({
			password: '[REDACTED]',
			query: 'open issues',
		});
		expect(Object.fromEntries(new URLSearchParams(form.body as string))).toEqual({
			grant_type: 'password',
			password: '[REDACTED]',
			scope: 'read',
		});
	});

	it('redacts an MCP request and a web search without a URL to keep', () => {
		const mcp = redactOutboundRequest({
			protocol: 'mcp',
			server: 'linear',
			method: 'POST',
			headers: { Authorization: 'Bearer x', 'mcp-session-id': 's-1' },
			body: { jsonrpc: '2.0', method: 'tools/call', params: { arguments: { token: 'abc' } } },
		});
		const search = redactOutboundRequest({
			protocol: 'web_search',
			args: { query: 'n8n with xoxb-1234567890-abcdefghij', maxResults: 5 },
		});

		expect(mcp).toEqual({
			protocol: 'mcp',
			server: 'linear',
			method: 'POST',
			headers: { 'mcp-session-id': 's-1' },
			body: {
				jsonrpc: '2.0',
				method: 'tools/call',
				params: { arguments: { token: '[REDACTED]' } },
			},
		});
		expect(search).toEqual({
			protocol: 'web_search',
			args: { query: 'n8n with [REDACTED]', maxResults: 5 },
		});
	});
});
