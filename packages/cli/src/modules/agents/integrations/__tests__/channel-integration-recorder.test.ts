import { mkdtemp, rm, writeFile } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';

import { ChannelIntegrationRecorder } from '../recording/channel-integration-recorder';

describe('ChannelIntegrationRecorder', () => {
	let recordingDir: string;

	beforeEach(async () => {
		recordingDir = await mkdtemp(join(tmpdir(), 'n8n-channel-recordings-'));
	});

	afterEach(async () => {
		await rm(recordingDir, { recursive: true, force: true });
	});

	it('sanitizes webhook URL and host headers when appending records', async () => {
		const recorder = new ChannelIntegrationRecorder({
			enabled: true,
			sessionId: 'test-session',
			recordingDir,
		});
		const headers = new Headers();
		headers.set('host', 'localhost:5678');
		headers.set('x-forwarded-for', '127.0.0.1');
		headers.set('x-forwarded-host', 'dev-tunnel.example.com');
		headers.set('x-telegram-bot-api-secret-token', 'secret-token');
		headers.set('x-custom-header', 'kept');

		await recorder.recordWebhook(
			'telegram',
			new Request(
				'http://localhost:5678/rest/projects/project-1/agents/v2/agent-1/webhooks/telegram?foo=bar',
				{
					method: 'POST',
					headers,
					body: '{}',
				},
			),
		);

		const [record] = await recorder.getRecords('test-session');

		expect(record).toMatchObject({
			type: 'webhook',
			url: 'https://n8n.host.com/rest/projects/project-1/agents/v2/agent-1/webhooks/telegram?foo=bar',
		});
		if (record.type !== 'webhook') throw new Error('Expected a webhook record');
		expect(record.headers.host).toBe('https://n8n.host.com');
		expect(record.headers['x-forwarded-for']).toBe('111.111.111.111');
		expect(record.headers['x-forwarded-host']).toBe('https://n8n.host.com');
		expect(record.headers['x-telegram-bot-api-secret-token']).toBe('[REDACTED]');
		expect(record.headers['x-custom-header']).toBe('kept');
	});

	it('does not replace fetch URL or host headers with the sanitized n8n host', async () => {
		const recorder = new ChannelIntegrationRecorder({
			enabled: true,
			sessionId: 'fetch-session',
			recordingDir,
		});
		const originalFetch = globalThis.fetch;
		globalThis.fetch = vi.fn(async () => {
			await Promise.resolve();
			return new Response(JSON.stringify({ ok: true, result: true }), {
				status: 200,
				headers: { host: 'api.telegram.org' },
			});
		});
		try {
			recorder.startFetchRecording([/api\.telegram\.org/i]);
			const requestHeaders = new Headers();
			requestHeaders.set('host', 'api.telegram.org');
			requestHeaders.set('x-telegram-bot-api-secret-token', 'secret-token');
			await fetch('https://api.telegram.org/bot123456:secret/sendMessage', {
				method: 'POST',
				headers: requestHeaders,
				body: '{}',
			});
			recorder.stopFetchRecording();

			const [record] = await recorder.getRecords('fetch-session');

			expect(record).toMatchObject({
				type: 'fetch',
				url: 'https://api.telegram.org/bot123456789:abcdefghijkl/sendMessage',
			});
			if (record.type !== 'fetch') throw new Error('Expected a fetch record');
			expect(record.requestHeaders?.host).toBe('api.telegram.org');
			expect(record.requestHeaders?.['x-telegram-bot-api-secret-token']).toBe('[REDACTED]');
		} finally {
			recorder.stopFetchRecording();
			globalThis.fetch = originalFetch;
		}
	});

	it('records request metadata when fetch receives a Request input', async () => {
		const recorder = new ChannelIntegrationRecorder({
			enabled: true,
			sessionId: 'request-fetch-session',
			recordingDir,
		});
		const originalFetch = globalThis.fetch;
		globalThis.fetch = vi.fn(async () => {
			await Promise.resolve();
			return new Response(JSON.stringify({ ok: true, result: true }), { status: 200 });
		});
		try {
			recorder.startFetchRecording([/api\.telegram\.org/i]);
			const requestHeaders = new Headers();
			requestHeaders.set('x-telegram-bot-api-secret-token', 'secret-token');
			await fetch(
				new Request('https://api.telegram.org/bot123456:secret/sendMessage', {
					method: 'PATCH',
					headers: requestHeaders,
					body: '{"text":"hello"}',
				}),
			);
			recorder.stopFetchRecording();

			const [record] = await recorder.getRecords('request-fetch-session');

			if (record.type !== 'fetch') throw new Error('Expected a fetch record');
			expect(record.method).toBe('PATCH');
			expect(record.requestBody).toBe('{"text":"hello"}');
			expect(record.requestHeaders?.['x-telegram-bot-api-secret-token']).toBe('[REDACTED]');
		} finally {
			recorder.stopFetchRecording();
			globalThis.fetch = originalFetch;
		}
	});

	it('does not fail the caller when writing a webhook record fails', async () => {
		const filePath = join(recordingDir, 'not-a-directory');
		await writeFile(filePath, 'x', 'utf8');
		const recorder = new ChannelIntegrationRecorder({
			enabled: true,
			sessionId: 'best-effort-session',
			recordingDir: filePath,
		});

		await expect(
			recorder.recordWebhook(
				'telegram',
				new Request('https://n8n.example.com/webhook', {
					method: 'POST',
					body: '{}',
				}),
			),
		).resolves.toBeUndefined();
	});
});
