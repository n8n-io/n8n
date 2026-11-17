/**
 * The response format "file" of the HTTP Request node against v1. Each case runs the v1
 * workflow in n8n's engine against a local server that serves files, and the converted
 * workflow on the reference runner with the same responses. The JSON of the items and the
 * names, types and sizes of their files must be the same. The runtime stores the file
 * (`responseBinary`, spec 7.1); the reference runner makes the same handle from the bytes.
 */
import { createServer, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';

import { runOracle } from '../../convert/__tests__/behaviour/oracle-engine.ts';
import { convertWorkflow } from '../../convert/index.ts';
import type { NodeSources } from '../../node-compile/convert.ts';
import { runReference } from '../../reference/runner.ts';

interface File {
	type?: string;
	disposition?: string;
	base64: string;
}

const PNG =
	'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';

const FILES: Record<string, File> = {
	'/files/dot.png': { type: 'image/png', base64: PNG },
	'/download': { type: 'image/png', base64: PNG },
	'/report': {
		type: 'application/pdf',
		disposition: 'attachment; filename="report 2024.pdf"',
		base64: Buffer.from('%PDF-1.4 made up').toString('base64'),
	},
	'/notes.txt': {
		type: 'text/plain; charset=utf-8',
		base64: Buffer.from('hello').toString('base64'),
	},
	'/data.json': { type: 'application/json', base64: Buffer.from('{"a":1}').toString('base64') },
	'/': { type: 'text/csv', base64: Buffer.from('a,b\n1,2\n').toString('base64') },
	'/moved': { type: 'image/png', base64: PNG },
};

interface Case {
	name: string;
	path: string;
	response?: Record<string, unknown>;
	onError?: string;
}

const CASES: Case[] = [
	{ name: 'a file with its name in the path', path: '/files/dot.png' },
	{ name: 'a file without an extension in the path', path: '/download' },
	{ name: 'a file with a name in the content disposition', path: '/report' },
	{ name: 'a text file', path: '/notes.txt' },
	{ name: 'a JSON file', path: '/data.json' },
	{ name: 'a file at the root path', path: '/' },
	{ name: 'a file with a query in the URL', path: '/files/dot.png?size=1' },
	{ name: 'another output name', path: '/download', response: { outputPropertyName: 'image' } },
	{ name: 'the full response', path: '/files/dot.png', response: { fullResponse: true } },
	{ name: 'a file after a redirect', path: '/redirect' },
	{ name: 'a file that is not there', path: '/missing' },
	{
		name: 'a file that is not there, continue on fail',
		path: '/missing',
		onError: 'continueRegularOutput',
	},
];

interface Served {
	status: number;
	headers: Record<string, string>;
	body: unknown;
}

let server: Server;
let base = '';
let log: Served[] = [];

beforeAll(async () => {
	server = createServer((request, response) => {
		const path = (request.url ?? '/').split('?')[0];
		if (path === '/redirect') {
			const headers = { location: `${base}/moved`, 'content-type': 'text/plain' };
			log.push({ status: 302, headers, body: '' });
			response.writeHead(302, headers);
			response.end();
			return;
		}
		const file = FILES[path];
		if (file === undefined) {
			const headers = { 'content-type': 'application/json' };
			log.push({ status: 404, headers, body: { message: 'no such file' } });
			response.writeHead(404, headers);
			response.end('{"message":"no such file"}');
			return;
		}
		const headers: Record<string, string> = {};
		if (file.type) headers['content-type'] = file.type;
		if (file.disposition) headers['content-disposition'] = file.disposition;
		log.push({ status: 200, headers, body: { $base64: file.base64 } });
		response.writeHead(200, headers);
		response.end(Buffer.from(file.base64, 'base64'));
	});
	await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
	base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});

afterAll(async () => {
	await new Promise((resolve) => server.close(resolve));
});

const nodeSources: NodeSources = {
	entry: () => undefined,
	readFile: () => undefined,
	description: () => undefined,
	storesResponses: true,
};

function workflow(c: Case, parameters: Record<string, unknown> = {}) {
	return {
		name: 'HTTP files',
		nodes: [
			{
				name: 'T',
				type: 'n8n-nodes-base.manualTrigger',
				typeVersion: 1,
				position: [0, 0],
				parameters: {},
			},
			{
				name: 'Items',
				type: 'n8n-nodes-base.code',
				typeVersion: 2,
				position: [200, 0],
				parameters: {
					jsCode:
						"return [{ json: { id: 7, label: 'x' }, binary: { old: { data: 'aGk=', mimeType: 'text/plain', fileName: 'old.txt' } } }];",
				},
			},
			{
				name: 'H',
				type: 'n8n-nodes-base.httpRequest',
				typeVersion: 4.2,
				position: [400, 0],
				parameters: {
					url: `${base}${c.path}`,
					options: { response: { response: { responseFormat: 'file', ...c.response } } },
					...parameters,
				},
				...(c.onError ? { onError: c.onError } : {}),
			},
		],
		connections: {
			T: { main: [[{ node: 'Items', type: 'main', index: 0 }]] },
			Items: { main: [[{ node: 'H', type: 'main', index: 0 }]] },
		},
		settings: { executionOrder: 'v1' },
	};
}

/** The items with the members of each file that v1 and the runtime both have. */
function files(items: unknown): unknown {
	if (!Array.isArray(items)) return items;
	return items.map((item: Record<string, unknown>) => {
		const { $binary, ...json } = item;
		const clean = JSON.parse(
			JSON.stringify(json, (key, v: unknown) =>
				// The fixture has the headers that the test server sets itself.
				['stack', 'date', 'connection', 'transfer-encoding'].includes(key) ? undefined : v,
			),
		) as Record<string, unknown>;
		if (typeof $binary !== 'object' || $binary === null) return clean;
		const names = Object.fromEntries(
			Object.entries($binary as Record<string, Record<string, unknown>>).map(([key, file]) => [
				key,
				{
					mimeType: file.mimeType,
					fileName: file.fileName,
					fileExtension: file.fileExtension,
					fileType: file.fileType,
					// The Code node of the test gives its file no size.
					fileSize: key === 'old' ? undefined : file.fileSize,
				},
			]),
		);
		return { ...clean, $binary: names };
	});
}

describe('HTTP Request response format "file" and v1', () => {
	it.each(CASES.map((c) => ({ ...c, label: c.name })))(
		'$label',
		async (c) => {
			log = [];
			const v1 = await runOracle(workflow(c), {
				start: 'T',
				item: {},
				mode: 'trigger',
				timeoutMs: 20_000,
				withBinary: true,
			});
			const served = log;
			const converted = convertWorkflow(workflow(c), { trace: 'all', nodeSources });
			expect(converted.diagnostics.filter((d) => d.severity === 'error')).toEqual([]);
			expect(converted.fallbackNodes).toEqual([]);
			const out = await runReference(converted.source, {
				trigger: { body: {} },
				now: 0,
				seed: 1,
				effects: { H: served },
				trace: true,
			});
			const traced = (out.trace ?? []).find((t) => t.step === 'H')?.items;
			if (v1.error !== null) {
				expect(out.status).toBe('error');
				const failure = traced as { $error?: { message?: string } } | undefined;
				expect(failure?.$error?.message).toBe(v1.error);
				return;
			}
			expect(out.status).toBe('ok');
			expect(files(traced)).toEqual(files(v1.nodes.H?.[0]));
		},
		40_000,
	);

	it('runs the v1 node in the fallback host for a file over the largest size of the runtime', async () => {
		const c = { name: 'large', path: '/files/dot.png' };
		const converted = convertWorkflow(workflow(c), { trace: 'all', nodeSources });
		expect(converted.fallbackNodes).toEqual([]);
		const hosted: string[] = [];
		const out = await runReference(
			converted.source,
			{
				trigger: { body: {} },
				now: 0,
				seed: 1,
				effects: {
					H: [{ $error: 'http: the body is larger than 64 MB (limit: binary-max-file)' }],
				},
				trace: true,
			},
			{
				answer: async (effect) => {
					if (effect.kind !== 'node' || !effect.step.startsWith('H')) return undefined;
					hosted.push(effect.step);
					return [{ id: 7, label: 'x', fromHost: true }];
				},
			},
		);
		expect(out.status).toBe('ok');
		expect(hosted).toHaveLength(1);
		expect((out.trace ?? []).find((t) => t.step === 'H')?.items).toEqual([
			{ id: 7, label: 'x', fromHost: true },
		]);
	});

	it.each([
		{ label: 'a runtime that stores no response', sources: undefined, parameters: {} },
		{ label: 'another method', sources: nodeSources, parameters: { method: 'POST' } },
		{
			label: 'never error',
			sources: nodeSources,
			parameters: {
				options: { response: { response: { responseFormat: 'file', neverError: true } } },
			},
		},
	])('keeps the v1 node in the host: $label', (c) => {
		const converted = convertWorkflow(
			workflow({ name: c.label, path: '/download' }, c.parameters),
			c.sources ? { nodeSources: c.sources } : {},
		);
		expect(converted.ok).toBe(true);
		expect(converted.fallbackNodes).toEqual(['H']);
	});
});
