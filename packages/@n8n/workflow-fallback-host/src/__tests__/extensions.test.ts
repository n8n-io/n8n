/**
 * Community and custom nodes: the host loads them as n8n does, from an
 * installed package (`<nodes dir>/node_modules/n8n-nodes-acme`) and from a
 * custom folder, with the credential type of the package.
 *
 * The fixture (`test-fixtures/`) has a programmatic node, a declarative node,
 * a credential type with a generic `authenticate`, and a custom-folder node.
 */
import { cpSync, mkdtempSync, rmSync } from 'node:fs';
import { createServer, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

// The host reads the extension folders at its first step, after the lines below set them.
import { NodeStepRunner, parseNodeStepArgs } from '../node-step';

const fixtures = join(__dirname, '..', '..', 'test-fixtures');
const work = mkdtempSync(join(tmpdir(), 'wf-host-extensions-'));
cpSync(join(fixtures, 'n8n-nodes-acme'), join(work, 'nodes', 'node_modules', 'n8n-nodes-acme'), {
	recursive: true,
});
// The folders that n8n gives the host (`WF_FALLBACK_NODES_DIR`, `WF_FALLBACK_CUSTOM_EXTENSIONS`).
process.env.WF_FALLBACK_NODES_DIR = join(work, 'nodes');
process.env.WF_FALLBACK_CUSTOM_EXTENSIONS = join(fixtures, 'custom');

describe('community and custom nodes', () => {
	let server: Server;
	let url = '';
	const keys: Array<string | undefined> = [];

	beforeAll(async () => {
		server = createServer((request, response) => {
			keys.push(request.headers['x-acme-key']?.toString());
			response.setHeader('content-type', 'application/json');
			response.end(
				request.url === '/items'
					? JSON.stringify([{ id: 1 }, { id: 2 }])
					: JSON.stringify({ hello: 'world' }),
			);
		});
		await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
		url = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
	});

	afterAll(async () => {
		await new Promise((resolve) => server.close(resolve));
		rmSync(work, { recursive: true, force: true });
	});

	const runner = () =>
		new NodeStepRunner({ credentials: { get: async () => ({ url, apiKey: 'k-123' }) } });

	it('runs a programmatic node of a community package with its credential type', async () => {
		keys.length = 0;
		const out = await runner().run(
			parseNodeStepArgs({
				name: 'Acme',
				type: 'n8n-nodes-acme.acme',
				typeVersion: 1,
				parameters: { path: '/hello' },
				credential: 'acme',
				items: [{}],
			}),
			{ step: 'Acme', key: 'k1' },
		);
		expect(out).toEqual([{ hello: 'world', item: 0 }]);
		expect(keys).toEqual(['k-123']);
	});

	it('runs a declarative node of a community package through n8n routing', async () => {
		keys.length = 0;
		const out = await runner().run(
			parseNodeStepArgs({
				name: 'Acme Items',
				type: 'n8n-nodes-acme.acmeItems',
				typeVersion: 1,
				parameters: { operation: 'list' },
				credential: 'acme',
				items: [{}],
			}),
			{ step: 'Acme Items', key: 'k2' },
		);
		expect(out).toEqual([{ id: 1 }, { id: 2 }]);
		expect(keys).toEqual(['k-123']);
	});

	it('runs a node of a custom extension folder', async () => {
		const out = await runner().run(
			parseNodeStepArgs({
				name: 'Echo',
				type: 'CUSTOM.acmeEcho',
				typeVersion: 1,
				parameters: { mark: 'seen' },
				items: [{ a: 1 }],
			}),
			{ step: 'Echo', key: 'k3' },
		);
		expect(out).toEqual([{ a: 1, mark: 'seen' }]);
	});
});
