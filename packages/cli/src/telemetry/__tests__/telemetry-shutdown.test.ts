import { mockInstance } from '@n8n/backend-test-utils';
import RudderStack from '@rudderstack/rudder-sdk-node';
import { createServer } from 'node:http';
import type { Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { InstanceSettings } from 'n8n-core';
import { jsonParse } from 'n8n-workflow';
import { mock } from 'vitest-mock-extended';

import type { PostHogClient } from '@/posthog';
import { Telemetry } from '@/telemetry';

vi.unmock('@/telemetry');

/**
 * Runs the real RudderStack SDK against a local data plane. The SDK posts
 * 20 events per batch, so a buffer above that size is only delivered when
 * shutdown drains the whole queue, not just one batch.
 */
describe('Telemetry shutdown', () => {
	let server: Server;
	let received: string[] = [];
	let telemetry: Telemetry;

	beforeAll(async () => {
		server = createServer((req, res) => {
			let body = '';
			req.on('data', (chunk: Buffer) => (body += chunk.toString()));
			req.on('end', () => {
				const { batch } = jsonParse<{ batch: Array<{ properties: { user_id: string } }> }>(body);
				received.push(...batch.map((event) => event.properties.user_id));
				// A real round trip takes time, which is what exposes a batch still in flight at exit.
				setTimeout(() => res.end('{}'), 50);
			});
		});
		await new Promise<void>((resolve) => server.listen(0, resolve));
	});

	afterAll(async () => {
		await new Promise<void>((resolve) => server.close(() => resolve()));
	});

	beforeEach(() => {
		received = [];
		const { port } = server.address() as AddressInfo;
		telemetry = new Telemetry(
			mock(),
			mock<PostHogClient>(),
			mock(),
			mockInstance(InstanceSettings, { instanceId: 'shutdown-test' }),
			mock(),
			mock(),
			mock(),
			mock(),
		);
		// @ts-expect-error Assigning to private property
		telemetry.rudderStack = new RudderStack('key', {
			dataPlaneUrl: `http://127.0.0.1:${port}`,
			gzip: false,
			logLevel: 'error',
		});
	});

	test('should deliver a buffer larger than one SDK batch before shutdown resolves', async () => {
		const userIds = Array.from({ length: 45 }, (_, i) => `user-${i}`);
		for (const userId of userIds) {
			telemetry.trackApiInvocation({
				user_id: userId,
				path: '/workflows',
				method: 'GET',
				api_version: 'v1',
				client: 'other',
			});
		}

		await telemetry.stopTracking();

		expect(received.sort()).toEqual(userIds.sort());
	});
});
