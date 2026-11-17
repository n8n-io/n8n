/**
 * The response format `autodetect` of the HTTP Request node against v1. Each case runs the v1
 * workflow in n8n's engine against a local server, and the converted workflow on the reference
 * runner with the same responses. v1 makes a file from a response whose content type is one of
 * its binary types, JSON from `application/json`, and text from each other response. The
 * runtime decides with the same rule after the head of the response (`responseBinary` with
 * `storeTypes`, spec 7.1); the reference runner applies the rule to the fixture.
 */
import { createServer, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';

import { runOracle } from '../../convert/__tests__/behaviour/oracle-engine.ts';
import { convertWorkflow } from '../../convert/index.ts';
import { runReference } from '../../reference/runner.ts';

interface Answer {
	type?: string;
	disposition?: string;
	status?: number;
	text?: string;
	/** The bytes of a response that v1 makes a file from. */
	base64?: string;
}

const PNG =
	'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';
const base64 = (text: string) => Buffer.from(text).toString('base64');

const ANSWERS: Record<string, Answer> = {
	'/files/dot.png': { type: 'image/png', base64: PNG },
	'/download': { type: 'image/png', base64: PNG },
	'/report': {
		type: 'application/pdf',
		disposition: 'attachment; filename="report 2024.pdf"',
		base64: base64('%PDF-1.4 made up'),
	},
	'/archive.zip': { type: 'application/zip', base64: base64('PK\u0003\u0004 made up') },
	'/blob': { type: 'application/octet-stream', base64: base64('\u0000\u0001\u0002 bytes') },
	'/sheet': {
		type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet; charset=binary',
		base64: base64('PK sheet'),
	},
	'/upper': { type: 'Image/PNG', text: 'not a file for v1' },
	'/bare': { text: 'no content type' },
	'/table.csv': { type: 'text/csv', text: 'a,b\n1,2\n' },
	'/feed': { type: 'application/xml', text: '<a><b>1</b></a>' },
	'/unknown': { type: 'application/x-made-up', text: 'made up' },
	'/wrong': { type: 'text/plain', text: '{"a":1}' },
	'/data': { type: 'application/json; charset=utf-8', text: '{"a":1,"$binary":{"x":1}}' },
	'/empty.png': { type: 'image/png', base64: '' },
	'/empty': { type: 'text/plain', text: '' },
	'/gone.png': { type: 'image/png', status: 404, base64: PNG },
	'/gone': { type: 'application/json', status: 404, text: '{"message":"gone"}' },
};

interface Case {
	name: string;
	path: string;
	response?: Record<string, unknown>;
	method?: string;
	onError?: string;
}

const full = { fullResponse: true };
const never = { neverError: true };

const CASES: Case[] = [
	{ name: 'an image with its name in the path', path: '/files/dot.png' },
	{ name: 'an image without an extension in the path', path: '/download' },
	{ name: 'a PDF with a name in the content disposition', path: '/report' },
	{ name: 'a zip archive', path: '/archive.zip' },
	{ name: 'an octet stream', path: '/blob' },
	{ name: 'a binary type with a parameter', path: '/sheet' },
	{ name: 'an image type in upper case', path: '/upper' },
	{ name: 'no content type', path: '/bare' },
	{ name: 'CSV', path: '/table.csv' },
	{ name: 'XML', path: '/feed' },
	{ name: 'a content type that is not known', path: '/unknown' },
	{ name: 'a JSON body with the content type of text', path: '/wrong' },
	{ name: 'JSON with the key $binary', path: '/data' },
	{ name: 'an empty image', path: '/empty.png' },
	{ name: 'an empty text', path: '/empty' },
	{
		name: 'an image, another output name',
		path: '/download',
		response: { outputPropertyName: 'image' },
	},
	{ name: 'an image from a POST request', path: '/files/dot.png', method: 'POST' },
	{ name: 'an image, the full response', path: '/files/dot.png', response: full },
	{ name: 'a PDF, the full response', path: '/report', response: full },
	{ name: 'CSV, the full response', path: '/table.csv', response: full },
	{ name: 'no content type, the full response', path: '/bare', response: full },
	{ name: 'an empty image, the full response', path: '/empty.png', response: full },
	{ name: 'an image, never error', path: '/files/dot.png', response: never },
	{ name: 'a failed image', path: '/gone.png' },
	{ name: 'a failed image, never error', path: '/gone.png', response: never },
	{ name: 'a failed image, never error, full', path: '/gone.png', response: { ...never, ...full } },
	{ name: 'failed JSON, never error', path: '/gone', response: never },
	{ name: 'failed JSON, never error, full', path: '/gone', response: { ...never, ...full } },
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
		const answer = ANSWERS[path] ?? { status: 404, type: 'text/plain', text: 'no such path' };
		const headers: Record<string, string> = {};
		if (answer.type) headers['content-type'] = answer.type;
		if (answer.disposition) headers['content-disposition'] = answer.disposition;
		const status = answer.status ?? 200;
		// The runtime gives the body of a response that it does not store as JSON or as text.
		const text = answer.text ?? '';
		const body =
			answer.base64 !== undefined
				? { $base64: answer.base64 }
				: (answer.type ?? '').includes('json')
					? (JSON.parse(text) as unknown)
					: text;
		log.push({ status, headers, body });
		response.writeHead(status, headers);
		response.end(answer.base64 !== undefined ? Buffer.from(answer.base64, 'base64') : text);
	});
	await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
	base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});

afterAll(async () => {
	await new Promise((resolve) => server.close(resolve));
});

function workflow(c: Case) {
	return {
		name: 'HTTP autodetect',
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
					...(c.method ? { method: c.method } : {}),
					...(c.response ? { options: { response: { response: c.response } } } : {}),
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

describe('HTTP Request response format "autodetect" and v1', () => {
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
			expect(served).toHaveLength(1);
			const converted = convertWorkflow(workflow(c), { trace: 'all' });
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

	it.each([
		{
			label: 'a file over the largest size of a stored file',
			error:
				'http: the response body is 9 bytes; a stored file can have 8 (--binary-max-file-mb); the fallback host can run the node (limit: binary-max-file)',
		},
		{
			label: 'a body over the largest size of a response',
			error: 'http: the response body from 127.0.0.1:80 is 9 bytes; the limit is 8',
		},
		{
			label: 'a file for a shard without a store',
			error:
				'http: responseBinary needs the binary data store of n8n in filesystem mode (WFRT_BINARY_DATA_STORAGE_PATH is not set)',
		},
		{
			label: 'a file when each row of the store is in use',
			error:
				'http: the response from 127.0.0.1:80 goes to the binary data store, and too many stored responses are in flight (64, --binary-max-transfers) (limit)',
		},
	])('runs the v1 node in the fallback host for $label', async (c) => {
		const converted = convertWorkflow(workflow({ name: c.label, path: '/files/dot.png' }), {
			trace: 'all',
		});
		expect(converted.fallbackNodes).toEqual([]);
		const hosted: string[] = [];
		const out = await runReference(
			converted.source,
			{
				trigger: { body: {} },
				now: 0,
				seed: 1,
				effects: { H: [{ $error: c.error }] },
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

	it('fails a request that is not a GET at a limit of the runtime: the host cannot send it again', async () => {
		const converted = convertWorkflow(
			workflow({ name: 'post', path: '/files/dot.png', method: 'POST' }),
			{ trace: 'all' },
		);
		const out = await runReference(converted.source, {
			trigger: { body: {} },
			now: 0,
			seed: 1,
			effects: {
				H: [{ $error: 'http: the body is larger than 64 MB (limit: binary-max-file)' }],
			},
		});
		expect(out.status).toBe('error');
	});
});
