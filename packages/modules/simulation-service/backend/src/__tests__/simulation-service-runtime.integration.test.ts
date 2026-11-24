import { Logger } from '@n8n/backend-common';
import { describe, expect, it } from 'vitest';
import { mock } from 'vitest-mock-extended';

import { SimulationServiceConfig } from '../simulation-service.config';
import { SimulationServiceRuntimeService } from '../simulation-service-runtime.service';
import { createSimulationServiceScopedInterceptor } from '../simulation-transport';

describe('SimulationServiceRuntimeService in-process native engine', () => {
	it('loads the compiled-in vendor manifest, creates an isolated tenant, and simulates a Slack API call in-process', async () => {
		const config = new SimulationServiceConfig();
		config.maxTenants = 4;
		const runtime = new SimulationServiceRuntimeService(config, mock<Logger>());

		try {
			const manifest = await runtime.getManifest();
			expect(manifest.vendors.length).toBeGreaterThan(0);
			expect(manifest.vendors.some((v) => v.slug === 'slack')).toBe(true);

			const session = await runtime.createSession({ id: 'test-sim-slack' });
			try {
				const cred = await session.tenant.mintCredential('slack');
				expect(cred.token).toBeTruthy();

				const responseJson = await session.tenant.run(
					{ services: ['slack'], unmatched: 'block' },
					async (scope) => {
						const interceptor = createSimulationServiceScopedInterceptor({
							manifest,
							scope,
							services: ['slack'],
							blockUnmatched: true,
						});
						expect(interceptor.matches(new URL('https://slack.com/api/chat.postMessage'))).toBe(
							true,
						);

						const listRes = await interceptor.fetch('https://slack.com/api/conversations.list', {
							method: 'GET',
							headers: {
								authorization: `Bearer ${cred.token}`,
							},
						});
						expect(listRes.status).toBe(200);
						const listed = (await listRes.json()) as {
							ok: boolean;
							channels: Array<{ id: string; name: string }>;
						};
						expect(listed.ok).toBe(true);
						expect(listed.channels.length).toBeGreaterThan(0);

						const res = await interceptor.fetch('https://slack.com/api/chat.postMessage', {
							method: 'POST',
							headers: {
								authorization: `Bearer ${cred.token}`,
								'content-type': 'application/json',
							},
							body: JSON.stringify({
								channel: listed.channels[0].id,
								text: 'hello from n8n simulation-service',
							}),
						});
						expect(res.status).toBe(200);
						return (await res.json()) as { ok: boolean };
					},
				);

				expect(responseJson.ok).toBe(true);
				const events = await session.tenant.monitor();
				expect(events.length).toBeGreaterThan(0);
			} finally {
				await session.close();
			}
		} finally {
			runtime.shutdown();
		}
	});

	it('stays within 5MB RSS during a simulated run and releases the native slab when idle', async () => {
		const config = new SimulationServiceConfig();
		const runtime = new SimulationServiceRuntimeService(config, mock<Logger>());

		// Warm up the dynamic module import and static manifest cache first.
		await runtime.getManifest();

		const rssBefore = process.memoryUsage().rss;
		const session = await runtime.createSession({ id: 'mem-budget-test' });
		let rssDuring: number;
		try {
			const cred = await session.tenant.mintCredential('slack');
			await session.tenant.run({ services: ['slack'], unmatched: 'block' }, async (scope) => {
				const listRes = await scope.fetch('https://slack.com/api/conversations.list', {
					headers: { authorization: `Bearer ${cred.token}` },
				});
				const listed = (await listRes.json()) as {
					channels: Array<{ id: string }>;
				};
				await scope.fetch('https://slack.com/api/chat.postMessage', {
					method: 'POST',
					headers: {
						authorization: `Bearer ${cred.token}`,
						'content-type': 'application/json',
					},
					body: JSON.stringify({
						channel: listed.channels[0].id,
						text: 'memory budget check',
					}),
				});
			});
			rssDuring = process.memoryUsage().rss;
		} finally {
			await session.close();
		}

		const rssAfter = process.memoryUsage().rss;
		const mb = 1024 * 1024;
		const duringDeltaMb = (rssDuring - rssBefore) / mb;
		const afterDeltaMb = (rssAfter - rssBefore) / mb;

		// Native slab + tenant state must stay under 5MB while active.
		expect(duringDeltaMb).toBeLessThan(5);
		// Closing the last session closes the native engine and returns the slab to the OS.
		expect(afterDeltaMb).toBeLessThan(1.5);
	});
});
