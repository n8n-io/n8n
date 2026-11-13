/**
 * File and multipart bodies of the HTTP Request node against v1 (spec 7.1).
 * Each case runs the v1 workflow in n8n's engine against a local server,
 * which keeps the bytes of the request. The converted workflow runs on the
 * reference runner; its `http` effect is written as the runtime writes it
 * (`MultipartBody` in `workflow-runtime/src/shell/request.zig`). The bytes
 * must be the same, with the boundary of each side replaced by `BOUNDARY`,
 * and the part header names in lower case (they do not depend on case,
 * RFC 7578).
 */
import { createServer, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';

import { runOracle } from '../../convert/__tests__/behaviour/oracle-engine.ts';
import { convertWorkflow } from '../../convert/index.ts';
import { runReference } from '../../reference/runner.ts';

interface Case {
	name: string;
	version: number;
	parameters: Record<string, unknown>;
}

const PNG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0xff, 0x22, 0x0d]);
const TEXT = Buffer.from('héllo, "world"\r\n', 'utf8');
const BINARY = {
	data: { data: PNG.toString('base64'), mimeType: 'image/png', fileName: 'dir/pic.png' },
	doc: { data: TEXT.toString('base64'), mimeType: 'text/plain' },
};

const row = (name: string, value: string) => ({ name, value });
const file = (name: string, field: string) => ({
	parameterType: 'formBinaryData',
	name,
	inputDataFieldName: field,
});

const CASES: Case[] = [
	{
		name: 'a file body',
		version: 4.2,
		parameters: {
			method: 'POST',
			sendBody: true,
			contentType: 'binaryData',
			inputDataFieldName: 'data',
		},
	},
	{
		name: 'a file body without a MIME type, with a content-type header',
		version: 4.2,
		parameters: {
			method: 'PUT',
			sendBody: true,
			contentType: 'binaryData',
			inputDataFieldName: '={{ "doc" }}',
			sendHeaders: true,
			headerParameters: { parameters: [row('Content-Type', 'application/x-custom')] },
		},
	},
	{
		name: 'multipart with text and files',
		version: 4.2,
		parameters: {
			method: 'POST',
			sendBody: true,
			contentType: 'multipart-form-data',
			bodyParameters: {
				parameters: [
					{ name: 'title', value: '={{ $json.title }}' },
					file('upload', 'data'),
					row('note', 'ünïcode "q"'),
					file('other', 'doc'),
					row('title', 'second'),
				],
			},
		},
	},
	{
		name: 'multipart before version 4.2: a repeated name keeps its first place',
		version: 4.1,
		parameters: {
			method: 'POST',
			sendBody: true,
			contentType: 'multipart-form-data',
			bodyParameters: {
				parameters: [
					row('a', '1'),
					file('f', 'data'),
					row('b', '2'),
					row('a', '3'),
					file('skip', ''),
				],
			},
		},
	},
];

let server: Server;
let base = '';
let log: Array<{ method: string; contentType: string; body: string }> = [];

beforeAll(async () => {
	server = createServer((request, response) => {
		const chunks: Buffer[] = [];
		request.on('data', (chunk: Buffer) => chunks.push(chunk));
		request.on('end', () => {
			const contentType = String(request.headers['content-type'] ?? '');
			const boundary = /boundary=(.+)$/.exec(contentType)?.[1];
			let body = Buffer.concat(chunks).toString('latin1');
			if (boundary) {
				body = body
					.split(boundary)
					.join('BOUNDARY')
					.replaceAll('\r\nContent-Disposition: ', '\r\ncontent-disposition: ')
					.replaceAll('\r\nContent-Type: ', '\r\ncontent-type: ');
			}
			log.push({
				method: request.method ?? '',
				contentType: boundary ? 'multipart/form-data' : contentType,
				body,
			});
			response.setHeader('content-type', 'application/json');
			response.end('{"ok":true}');
		});
	});
	await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
	base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});

afterAll(async () => {
	await new Promise((resolve) => server.close(resolve));
});

function workflow(c: Case) {
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
					jsCode: `return [{ json: { title: 'Täst' }, binary: ${JSON.stringify(BINARY)} }];`,
				},
			},
			{
				name: 'H',
				type: 'n8n-nodes-base.httpRequest',
				typeVersion: c.version,
				position: [400, 0],
				parameters: { url: `${base}/up`, options: {}, ...c.parameters },
			},
		],
		connections: {
			T: { main: [[{ node: 'Items', type: 'main', index: 0 }]] },
			Items: { main: [[{ node: 'H', type: 'main', index: 0 }]] },
		},
		settings: { executionOrder: 'v1' },
	};
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** The bytes of a `multipart` effect as the runtime writes them, as latin1 text. */
function runtimeMultipart(parts: unknown): string {
	const escape = (text: string) =>
		text.replaceAll('"', '%22').replaceAll('\r', '%0D').replaceAll('\n', '%0A');
	const utf8 = (text: string) => Buffer.from(text, 'utf8').toString('latin1');
	let out = '';
	for (const part of Array.isArray(parts) ? parts : []) {
		if (!isRecord(part)) continue;
		out += `--BOUNDARY\r\ncontent-disposition: form-data; name="${utf8(escape(String(part.name)))}"`;
		if (isRecord(part.binary)) {
			const b = part.binary;
			if (typeof b.fileName === 'string') out += `; filename="${utf8(escape(b.fileName))}"`;
			out += '\r\n';
			if (typeof b.mimeType === 'string') out += `content-type: ${b.mimeType}\r\n`;
			out += `\r\n${Buffer.from(String(b.data), 'base64').toString('latin1')}`;
		} else {
			out += `\r\n\r\n${utf8(String(part.value))}`;
		}
		out += '\r\n';
	}
	return `${out}--BOUNDARY--\r\n`;
}

/** The request of an `http` effect as the runtime sends it. */
function runtimeRequest(args: Record<string, unknown>) {
	const headers = isRecord(args.headers) ? args.headers : {};
	const typed = Object.entries(headers).find(([k]) => k.toLowerCase() === 'content-type');
	if (args.multipart !== undefined) {
		return {
			method: String(args.method),
			contentType: 'multipart/form-data',
			body: runtimeMultipart(args.multipart),
		};
	}
	const ref = isRecord(args.body) && isRecord(args.body.$binary) ? args.body.$binary : {};
	return {
		method: String(args.method),
		contentType: typed ? String(typed[1]) : typeof ref.mimeType === 'string' ? ref.mimeType : '',
		body: Buffer.from(String(ref.data), 'base64').toString('latin1'),
	};
}

describe('HTTP Request file and multipart bodies and v1', () => {
	it.each(CASES.map((c) => ({ ...c, label: c.name })))('$label', async (c) => {
		log = [];
		const v1 = await runOracle(workflow(c), {
			start: 'T',
			item: {},
			mode: 'trigger',
			timeoutMs: 10_000,
		});
		expect(v1.error).toBeFalsy();
		const served = log;
		expect(served).toHaveLength(1);
		const converted = convertWorkflow(workflow(c), { trace: 'all', codeNodes: 'host' });
		expect(converted.fallbackNodes).not.toContain('H');
		const out = await runReference(converted.source, {
			trigger: { body: {} },
			now: 0,
			seed: 1,
			effects: {
				Items: [[{ title: 'Täst', $binary: BINARY }]],
				H: [{ status: 200, headers: { 'content-type': 'application/json' }, body: { ok: true } }],
			},
			trace: true,
		});
		expect(out.status).toBe('ok');
		const sent = out.effects
			.filter((e) => e.step === 'H' && e.kind === 'http')
			.map((e) => runtimeRequest(isRecord(e.args) ? e.args : {}));
		expect(sent).toEqual(served);
	});
});
