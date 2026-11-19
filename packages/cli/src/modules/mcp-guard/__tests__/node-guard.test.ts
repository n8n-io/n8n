import http from 'node:http';
import type { AddressInfo } from 'node:net';

import { Container } from '@n8n/di';

import { withChatScope, withNodeGuard } from '../chat-scope';
import { HttpGuardService } from '../http-guard.service';
import type { HydrationModel } from '../hydration-llm';
import { installNodeGuard } from '../node-guard';

vi.mock('../http-guard.service', () => ({ HttpGuardService: class {} }));

const model: HydrationModel = { resolve: async () => ({}) as never };

describe('installNodeGuard', () => {
	let uninstall: (() => void) | undefined;
	let server: http.Server;
	let hits: number;
	let base: string;
	const handle = vi.fn(async (_r: unknown) => new Response('from-guard'));

	beforeEach(async () => {
		hits = 0;
		handle.mockClear();
		Container.set(HttpGuardService, { handle } as unknown as HttpGuardService);
		server = http.createServer((_req, res) => {
			hits++;
			res.end('real');
		});
		await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
		base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
		uninstall = installNodeGuard();
	});

	afterEach(async () => {
		uninstall?.();
		await new Promise((resolve) => server.close(resolve));
	});

	const get = async () =>
		await new Promise<string>((resolve, reject) => {
			http
				.get(base, (res) => {
					const chunks: Buffer[] = [];
					res.on('data', (c: Buffer) => chunks.push(c));
					res.on('end', () => resolve(Buffer.concat(chunks).toString()));
				})
				.on('error', reject);
		});

	it('gives the call of a guarded node tool to the guard service', async () => {
		const text = await withChatScope(
			'chat1',
			async () => await withNodeGuard(model, get),
			'agent1',
		);

		expect(text).toBe('from-guard');
		expect(handle).toHaveBeenCalledTimes(1);
		expect(hits).toBe(0);
	});

	it('does not touch a call outside a guarded node tool', async () => {
		expect(await get()).toBe('real');
		expect(await withChatScope('chat1', get, 'agent1')).toBe('real');
		expect(handle).not.toHaveBeenCalled();
	});
});
