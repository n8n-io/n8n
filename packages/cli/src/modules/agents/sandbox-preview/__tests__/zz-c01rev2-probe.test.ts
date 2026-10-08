import { createServer, request } from 'node:http';
import type { Socket } from 'node:net';

import { close, listen, usePreviewHarness } from './sandbox-preview-harness';

vi.mock('@/permissions.ee/check-access', () => ({ userHasScopes: vi.fn() }));

describe('probe', () => {
	const h = usePreviewHarness();

	const watch = async (port: number, path: string) =>
		await new Promise<{ status: number; body: string; complete: boolean; err?: string }>(
			(resolve) => {
				const outgoing = request({ host: '127.0.0.1', port, path }, (res) => {
					let body = '';
					res.setEncoding('utf8');
					res.on('data', (c: string) => (body += c));
					res.on('error', () => {});
					res.on('close', () =>
						resolve({ status: res.statusCode ?? 0, body, complete: res.complete }),
					);
				});
				outgoing.on('error', (e) => resolve({ status: 0, body: '', complete: false, err: e.message }));
				outgoing.end();
			},
		);

	it.each(['chunked', 'sized'])('upstream RST mid %s answer', async (kind) => {
		const upstream = createServer((req, res) => {
			res.writeHead(200, {
				'content-type': 'application/javascript',
				...(kind === 'sized' ? { 'content-length': '1000' } : {}),
			});
			res.write('partial');
			setTimeout(() => (res.socket as Socket & { resetAndDestroy(): void }).resetAndDestroy(), 30);
		});
		const port = await listen(upstream);
		const { url } = await h.openPreview({
			serviceUrl: `http://127.0.0.1:${port}`,
			path: '/sandboxes/sb-9/ports/3000',
		});
		const answer = await watch(h.servers.port, `${url}src/main.ts`);
		console.log(kind, JSON.stringify(answer));
		await close(upstream);
	});
});
