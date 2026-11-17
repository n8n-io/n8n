/**
 * RSS Read by node version in the converter. Version 1.2 and version 1.1 run as the library
 * node: version 1.1 sends the Accept header of rss-parser. Version 1 reads the feed once for
 * all items, which the library node does not do: it runs in the fallback host.
 */
import { compile } from '../../compiler/index.ts';
import { runReference } from '../../reference/runner.ts';
import { convertWorkflow } from '../index.ts';

function workflow(typeVersion: number) {
	return {
		name: 'Feed',
		nodes: [
			{
				name: 'Hook',
				type: 'n8n-nodes-base.webhook',
				typeVersion: 2,
				position: [0, 0],
				parameters: { path: 'p' },
			},
			{
				name: 'Read',
				type: 'n8n-nodes-base.rssFeedRead',
				typeVersion,
				position: [200, 0],
				parameters: { url: 'https://feeds.example.com/feed.xml', options: {} },
			},
		],
		connections: { Hook: { main: [[{ node: 'Read', type: 'main', index: 0 }]] } },
	};
}

const feed = {
	status: 200,
	headers: { 'content-type': 'application/rss+xml' },
	body: '<rss version="2.0"><channel><item><title>One</title></item></channel></rss>',
};

async function acceptOf(typeVersion: number): Promise<unknown> {
	const out = convertWorkflow(workflow(typeVersion));
	expect(out.ok).toBe(true);
	expect(compile(out.source).diagnostics).toEqual([]);
	expect(out.fallbackNodes).toEqual([]);
	const run = await runReference(out.source, {
		trigger: { body: {}, headers: {}, query: {} },
		now: 0,
		seed: 1,
		effects: { Read: [feed] },
	});
	expect(run.status).toBe('ok');
	expect(run.effects).toHaveLength(1);
	const args = run.effects[0].args as { headers: Record<string, string> };
	return args.headers.Accept;
}

describe('RSS Read by node version in the converter', () => {
	it('sends the Accept header of rss-parser for version 1.1', async () => {
		expect(await acceptOf(1.1)).toBe('application/rss+xml');
	});

	it('keeps the relaxed Accept header for version 1.2', async () => {
		expect(await acceptOf(1.2)).toBe(
			'application/rss+xml, application/rdf+xml;q=0.8, application/atom+xml;q=0.6, application/xml;q=0.4, text/xml;q=0.4',
		);
		expect(convertWorkflow(workflow(1.2)).source).not.toContain('version: 1.2');
	});

	it('runs version 1 in the fallback host', () => {
		expect(convertWorkflow(workflow(1)).fallbackNodes).toEqual(['Read']);
	});
});
