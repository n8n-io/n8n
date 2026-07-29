import type { Logger } from '@n8n/backend-common';
import { mock } from 'vitest-mock-extended';

import type { SsrfProtectionService } from '../../ssrf';
import {
	httpStatusFromError,
	isConnectionRefusedError,
	isHttpRequestError,
} from '../client-request-error';
import { startServer, type LocalServer } from '../local-server';
import { OutboundHttp } from '../outbound-http';

const client = () =>
	new OutboundHttp(mock<SsrfProtectionService>(), mock<Logger>()).requests({ ssrf: 'disabled' });

describe('OutboundHttp error tagging', () => {
	let server: LocalServer;

	afterEach(async () => {
		await server?.close();
	});

	it('tags a non-2xx rejection so isHttpRequestError recognizes it', async () => {
		server = await startServer((_req, res) => {
			res.statusCode = 409;
			res.setHeader('content-type', 'application/json');
			res.end(JSON.stringify({ message: 'already exists' }));
		});

		expect.assertions(3);
		try {
			await client().request({ url: server.url, method: 'POST', body: { a: 1 }, json: true });
		} catch (error) {
			expect(isHttpRequestError(error)).toBe(true);
			expect(httpStatusFromError(error)).toBe(409);
			if (isHttpRequestError(error)) {
				const data = error.response?.data as { message?: string } | undefined;
				expect(data?.message).toBe('already exists');
			}
		}
	});

	it('tags a connection failure (and isConnectionRefusedError still reads it)', async () => {
		server = await startServer(() => {});
		const url = server.url;
		await server.close();
		server = undefined as unknown as LocalServer;

		expect.assertions(2);
		try {
			await client().request({ url, method: 'GET' });
		} catch (error) {
			expect(isHttpRequestError(error)).toBe(true);
			expect(isConnectionRefusedError(error)).toBe(true);
		}
	});
});
