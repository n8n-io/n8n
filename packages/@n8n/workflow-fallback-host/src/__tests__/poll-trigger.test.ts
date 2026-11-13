/**
 * A polling trigger in a manual run: the host runs the node's `poll` once
 * (`poll: true`), as n8n's engine does, and gives what it finds.
 */
import { createServer, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';

import { NodeStepRunner } from '../node-step';

const FEED = `<?xml version="1.0"?><rss version="2.0"><channel><title>t</title>
<item><title>One</title><link>https://example.test/1</link><pubDate>Thu, 12 Nov 2026 10:00:00 GMT</pubDate></item>
<item><title>Two</title><link>https://example.test/2</link><pubDate>Thu, 12 Nov 2026 11:00:00 GMT</pubDate></item>
</channel></rss>`;

describe('a polling trigger step', () => {
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

	it('polls the feed once and gives its items', async () => {
		const runner = new NodeStepRunner({ credentials: { get: async () => ({}) } });
		const out = await runner.run(
			{
				name: 'RSS Feed Trigger',
				type: 'n8n-nodes-base.rssFeedReadTrigger',
				typeVersion: 1,
				parameters: { feedUrl: url, pollTimes: { item: [{ mode: 'everyMinute' }] } },
				inputs: [[]],
				subNodes: [],
				allOutputs: false,
				poll: true,
			},
			{ step: 'RSS Feed Trigger', key: 'k' },
		);
		// In a manual run the node gives the first item of the feed.
		expect(out.map((x) => x.title)).toEqual(['One']);
	});
});
