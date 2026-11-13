/**
 * Workflow static data in host steps (spec 9.7 of workflow-lang): a frame
 * with `staticData: true` carries the document as `$staticData`, the step
 * reads and changes it, and the reply carries the changed document.
 */
import { createServer, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';

import { fileCredentialStore } from '../credentials';
import { StepHandler } from '../server';

const FEED = `<?xml version="1.0"?><rss version="2.0"><channel><title>t</title>
<item><title>One</title><link>https://example.test/1</link><pubDate>Thu, 12 Nov 2026 10:00:00 GMT</pubDate></item>
<item><title>Two</title><link>https://example.test/2</link><pubDate>Thu, 12 Nov 2026 11:00:00 GMT</pubDate></item>
</channel></rss>`;

const handler = () => new StepHandler({ credentials: fileCredentialStore(undefined) });

describe('static data in host steps', () => {
	it('gives a code step the document and returns what the code changed', async () => {
		const response = await handler().handle({
			id: '1',
			kind: 'code',
			step: 'Dedupe',
			key: 'k',
			args: {
				name: 'Dedupe',
				items: [{ id: 'a' }, { id: 'b' }],
				code: [
					"const seen = $getWorkflowStaticData('global');",
					'seen.ids = seen.ids || [];',
					'const fresh = items.filter((i) => !seen.ids.includes(i.id));',
					'seen.ids.push(...fresh.map((i) => i.id));',
					"$getWorkflowStaticData('node').runs = ($getWorkflowStaticData('node').runs || 0) + 1;",
					'return fresh;',
				].join('\n'),
				staticData: true,
				$staticData: { global: { ids: ['a'] }, 'node:Dedupe': { runs: 2 } },
			},
		});
		expect(response).toEqual({
			id: '1',
			ok: true,
			result: [{ id: 'b' }],
			staticData: { global: { ids: ['a', 'b'] }, 'node:Dedupe': { runs: 3 } },
		});
	});

	it('sends nothing back when the step did not change the document', async () => {
		const response = await handler().handle({
			id: '2',
			kind: 'code',
			step: 'Read',
			key: 'k',
			args: {
				name: 'Read',
				items: [],
				code: "return { n: $getWorkflowStaticData('global').n };",
				staticData: true,
				$staticData: { global: { n: 5 } },
			},
		});
		expect(response).toEqual({ id: '2', ok: true, result: [{ n: 5 }] });
	});

	it('keeps the old behaviour without staticData: empty and not sent back', async () => {
		const response = await handler().handle({
			id: '3',
			kind: 'code',
			step: 'Code',
			key: 'k',
			args: { name: 'Code', items: [], code: "$getWorkflowStaticData('global').x = 1; return {};" },
		});
		expect(response).toEqual({ id: '3', ok: true, result: [{}] });
	});

	describe('a poll trigger', () => {
		let server: Server;
		let url = '';

		beforeAll(async () => {
			server = createServer((_request, response) => {
				response.setHeader('content-type', 'application/rss+xml');
				response.end(FEED);
			});
			await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
			url = `http://127.0.0.1:${(server.address() as AddressInfo).port}/feed`;
		});

		afterAll(async () => {
			await new Promise((resolve) => server.close(resolve));
		});

		it("reads its cursor from the node's static data", async () => {
			const response = await handler().handle({
				id: '4',
				kind: 'node',
				step: 'RSS Feed Trigger',
				key: 'k',
				args: {
					name: 'RSS Feed Trigger',
					type: 'n8n-nodes-base.rssFeedReadTrigger',
					typeVersion: 1,
					parameters: { feedUrl: url, pollTimes: { item: [{ mode: 'everyMinute' }] } },
					items: [],
					poll: true,
					staticData: true,
					$staticData: { global: { other: 1 } },
				},
			});
			expect(response.ok).toBe(true);
			if (!response.ok) return;
			expect(response.staticData).toMatchObject({
				global: { other: 1 },
				// A manual poll reads its cursor; it moves it only in production runs.
				'node:RSS Feed Trigger': {},
			});
		});
	});
});
