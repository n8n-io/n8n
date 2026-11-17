import { createHash } from 'node:crypto';

import { compile } from '../../compiler/index.ts';
import { decodeModule } from '../../compiler/decode.ts';
import { runReference } from '../../reference/runner.ts';
import { runModule } from '../../testing/vm.ts';
import { specialiseNode } from '../specialise.ts';

const ENTRY = '/probe/Probe.node.ts';
const HELLO = Buffer.from('hello bytes').toString('base64');
const FILE = { data: HELLO, mimeType: 'text/plain', fileName: 'notes/hello.txt' };
const STORED_ID = 'filesystem-v2:workflows/w/executions/e/binary_data/f';

function probe(body: string) {
	const source = `export class Probe {
	async execute(this: any) {
		const items = this.getInputData();
		const returnData: any[] = [];
		for (let i = 0; i < items.length; i++) {
			${body}
		}
		return [returnData];
	}
}`;
	return specialiseNode({
		type: 'n8n-nodes-base.probe',
		version: 1,
		entry: ENTRY,
		readFile: (path) => (path === ENTRY ? source : undefined),
		parameters: {},
		aliases: {},
		instanceId: null,
	});
}

function workflowSource(items: unknown[]): string {
	return `import { webhook, workflow } from '@n8n/workflow-lang';

export default workflow({
	triggers: [webhook({ path: 'probe' })],
	async run(ctx) {
		return await ctx.node({
			name: 'Node',
			type: 'n8n-nodes-base.probe',
			typeVersion: 1,
			parameters: {},
			items: ${JSON.stringify(items)},
		});
	},
});
`;
}

const fixture = {
	trigger: { body: {}, headers: {}, query: {} },
	now: 0,
	seed: 1,
	effects: { Node: [{ status: 200, headers: {}, body: { ok: true } }] },
};

async function run(body: string, items: unknown[], answers?: unknown[]) {
	const result = probe(body);
	expect(result.errors).toEqual([]);
	const nodes = { 'nodes/compiled-node.ts': result.source ?? '' };
	const compiled = compile(workflowSource(items), { nodes });
	expect(compiled.diagnostics).toEqual([]);
	const used = answers === undefined ? fixture : { ...fixture, effects: { Node: answers } };
	const reference = await runReference(workflowSource(items), used, { nodes });
	const bytecode = runModule(decodeModule(compiled.module ?? new Uint8Array()), used);
	expect(JSON.stringify(bytecode)).toBe(JSON.stringify(reference));
	return reference;
}

function requestOf(out: Awaited<ReturnType<typeof run>>): Record<string, unknown> {
	const args: unknown = out.effects[0]?.args;
	return typeof args === 'object' && args !== null ? { ...args } : {};
}

const upload = (formData: string, helper = 'request') => `
			const binaryData = this.helpers.assertBinaryData(i, 'data');
			let uploadData: any;
			let fileSize: number;
			if (binaryData.id) {
				uploadData = await this.helpers.getBinaryStream(binaryData.id);
				const metadata = await this.helpers.getBinaryMetadata(binaryData.id);
				fileSize = metadata.fileSize;
			} else {
				uploadData = Buffer.from(binaryData.data, 'base64');
				fileSize = uploadData.length;
			}
			const response = await this.helpers.${helper}({
				method: 'POST',
				uri: 'https://example.com/upload',
				headers: { 'Content-Type': 'multipart/form-data' },
				formData: ${formData},
				json: true,
			});
			returnData.push({ json: { size: fileSize, response } });`;

const WITH_OPTIONS =
	"{ channel: 'C1', count: 3, file: { value: uploadData, options: { filename: binaryData.fileName, contentType: binaryData.mimeType } } }";

describe('node compiler: binary data', () => {
	it('sends a binary property as a file of a multipart request', async () => {
		const out = await run(upload(WITH_OPTIONS), [{ $binary: { data: FILE } }]);
		expect(out.status).toBe('ok');
		expect(out.result).toEqual([{ size: 11, response: { ok: true } }]);
		const request = requestOf(out);
		expect(request.body).toBeUndefined();
		expect(request.headers).toEqual({ 'Content-Type': 'multipart/form-data' });
		expect(request.multipart).toEqual([
			{ name: 'channel', value: 'C1' },
			{ name: 'count', value: '3' },
			{ name: 'file', binary: { data: HELLO, mimeType: 'text/plain', fileName: 'hello.txt' } },
		]);
	});

	it('sends file bytes without options as form-data does', async () => {
		const out = await run(upload('{ file: uploadData, list: [1, "b"] }'), [
			{ $binary: { data: FILE } },
		]);
		expect(requestOf(out).multipart).toEqual([
			{ name: 'file', binary: { data: HELLO, mimeType: 'application/octet-stream' } },
			{ name: 'list', value: '1' },
			{ name: 'list', value: 'b' },
		]);
	});

	it('gives the size of padded base64 text', async () => {
		const sizes: unknown[] = [];
		for (const text of ['', 'a', 'ab', 'abc', 'abcd']) {
			const data = Buffer.from(text).toString('base64');
			const out = await run(upload(WITH_OPTIONS), [{ $binary: { data: { ...FILE, data } } }]);
			sizes.push(Array.isArray(out.result) ? out.result[0].size : undefined);
		}
		expect(sizes).toEqual([0, 1, 2, 3, 4]);
	});

	it('fails as v1 when the item has no binary data', async () => {
		const out = await run(upload(WITH_OPTIONS), [{ a: 1 }]);
		expect(out.status).toBe('error');
		expect(out.effects).toEqual([]);
		expect(JSON.stringify(out.result)).toContain(
			"This operation expects the node's input data to contain a binary file 'data', but none was found [item 0]",
		);
	});

	it('fails as v1 when the item does not have the binary property', async () => {
		const out = await run(upload(WITH_OPTIONS), [{ $binary: { other: FILE } }]);
		expect(out.status).toBe('error');
		expect(JSON.stringify(out.result)).toContain("The item has no binary field 'data' [item 0]");
	});

	it('reads the metadata of a file in a file store with a service call of the runtime', async () => {
		const stored = { ...FILE, data: 'filesystem-v2', id: STORED_ID };
		const metadata = { fileName: 'hello.txt', mimeType: 'text/plain', fileSize: 2048 };
		const out = await run(
			upload(WITH_OPTIONS),
			[{ $binary: { data: stored } }],
			[metadata, { status: 200, headers: {}, body: { ok: true } }],
		);
		expect(out.status).toBe('ok');
		expect(out.result).toEqual([{ size: 2048, response: { ok: true } }]);
		expect(out.effects.map((e) => e.kind)).toEqual(['service', 'http']);
		expect(out.effects[0]?.args).toEqual({
			service: 'binaryData',
			op: 'metadata',
			args: { id: STORED_ID },
		});
		const request: unknown = out.effects[1]?.args;
		expect(request).toMatchObject({
			multipart: [
				{ name: 'channel', value: 'C1' },
				{ name: 'count', value: '3' },
				{
					name: 'file',
					binary: {
						data: 'filesystem-v2',
						id: STORED_ID,
						mimeType: 'text/plain',
						fileName: 'hello.txt',
					},
				},
			],
		});
	});

	it('fails the step when the runtime cannot read the metadata', async () => {
		const stored = { ...FILE, data: 'filesystem-v2', id: STORED_ID };
		const out = await run(
			upload(WITH_OPTIONS),
			[{ $binary: { data: stored } }],
			[{ $error: 'service: binaryData.metadata: the id is not an id of the file system store' }],
		);
		expect(out.status).toBe('needs_attention');
		expect(out.effects.map((e) => e.kind)).toEqual(['service']);
	});

	it('sends a file of the file store by its id', async () => {
		const stored = { ...FILE, data: 'filesystem-v2', id: STORED_ID };
		const body = `
			const binaryData = this.helpers.assertBinaryData(i, 'data');
			const stream = await this.helpers.getBinaryStream(binaryData.id);
			await this.helpers.request({
				method: 'POST',
				uri: 'https://example.com/upload',
				formData: { file: { value: stream, options: { filename: 'a.bin', contentType: 'x/y' } } },
			});
			returnData.push({ json: {} });`;
		const out = await run(body, [{ $binary: { data: stored } }]);
		expect(requestOf(out).multipart).toEqual([
			{
				name: 'file',
				binary: { data: 'filesystem-v2', id: STORED_ID, mimeType: 'x/y', fileName: 'a.bin' },
			},
		]);
	});

	it.each([
		{ label: 'a store that is not the file system', id: 'database:abcd' },
		{ label: 'an id without a store', id: 'abcd' },
	])('stops for $label', async ({ id }) => {
		const body = `
			const stream = await this.helpers.getBinaryStream(${JSON.stringify(id)});
			await this.helpers.request({ method: 'POST', uri: 'https://example.com/u', formData: { file: stream } });
			returnData.push({ json: {} });`;
		const out = await run(body, [{}]);
		expect(out.status).toBe('error');
		expect(out.effects).toEqual([]);
		expect(JSON.stringify(out.result)).toContain('has no compiled form');
	});

	it.each([
		{
			label: 'a file name without a content type',
			form: '{ file: { value: uploadData, options: { filename: "a.txt" } } }',
		},
		{
			label: 'text with a file name',
			form: '{ file: { value: "text", options: { filename: "a.txt" } } }',
		},
		{ label: 'a value that is not text or bytes', form: '{ flag: true }' },
		{
			label: 'a file path',
			form: '{ file: { value: uploadData, options: { filepath: "a/b.txt" } } }',
		},
	])('stops for a form field with $label', async ({ form }) => {
		const out = await run(upload(form), [{ $binary: { data: FILE } }]);
		expect(out.status).toBe('error');
		expect(out.effects).toEqual([]);
		expect(JSON.stringify(out.result)).toContain('has no compiled form');
	});

	it('stops for file bytes as the whole request body', async () => {
		const body = `
			const buffer = await this.helpers.getBinaryDataBuffer(i, 'data');
			await this.helpers.request({ method: 'PUT', uri: 'https://example.com/u', body: buffer });
			returnData.push({ json: { size: buffer.length } });`;
		const out = await run(body, [{ $binary: { data: FILE } }]);
		expect(out.status).toBe('error');
		expect(out.effects).toEqual([]);
		expect(JSON.stringify(out.result)).toContain(
			'a request body of file bytes has no compiled form',
		);
	});

	it('does not read `formData` for a request helper that v1 does not read it for', async () => {
		const out = await run(upload("{ channel: 'C1' }", 'httpRequest'), [
			{ $binary: { data: FILE } },
		]);
		expect(requestOf(out).multipart).toBeUndefined();
	});

	it('reads the binary data of an item as `binary`', async () => {
		const body =
			"const files = items[i].binary; returnData.push({ json: { r: files === undefined ? 'none' : files.data.fileName } });";
		const out = await run(body, [{}, { $binary: { data: FILE } }]);
		expect(out.result).toEqual([{ r: 'none' }, { r: 'notes/hello.txt' }]);
	});

	it.each([
		{
			label: 'the text of file bytes in a variable',
			body: "const buffer = Buffer.from(items[i].json.text, 'base64'); returnData.push({ json: { r: buffer.toString('latin1') } });",
		},
		{
			label: 'the text of file bytes of an input item',
			body: "const buffer = await this.helpers.getBinaryDataBuffer(i, 'data'); returnData.push({ json: { r: buffer.toString() } });",
		},
		{
			label: 'a byte of file bytes',
			body: "returnData.push({ json: { r: Buffer.from(items[i].json.text, 'base64')[0] } });",
		},
		{
			label: 'new binary data',
			body: "returnData.push({ json: {}, binary: { data: await this.helpers.prepareBinaryData(Buffer.from(items[i].json.text, 'base64')) } });",
		},
	])('does not compile $label', ({ body }) => {
		expect(probe(body).errors.length).toBeGreaterThan(0);
	});
});

const BYTES_HASH = createHash('sha256').update('hello bytes').digest('hex');
const BYTES_ID = `filesystem-v2:workflows/reference/executions/reference/binary_data/${BYTES_HASH}`;
const PDF = { status: 200, headers: { 'content-type': 'application/pdf' }, body: 'hello bytes' };
const DOWNLOAD =
	"const response = await this.helpers.request({ uri: 'https://x.io/files/7', encoding: null, resolveWithFullResponse: true });";

const MADE = `${DOWNLOAD} const made = await this.helpers.prepareBinaryData(response.body, 'a.pdf', 'application/pdf');`;

function download(fileName: string, mimeType: string): string {
	return `${DOWNLOAD} returnData.push({ json: { status: response.statusCode }, binary: { data: await this.helpers.prepareBinaryData(response.body, ${fileName}, ${mimeType}) } });`;
}

describe('node compiler: binary data of a response', () => {
	it('asks the runtime to store the body and gives the binary data of v1', async () => {
		const out = await run(
			download("'reports/summary.pdf'", "response.headers['content-type']"),
			[{}],
			[PDF],
		);
		expect(requestOf(out).responseBinary).toEqual({});
		expect(out.result).toEqual([
			{
				status: 200,
				$binary: {
					data: {
						mimeType: 'application/pdf',
						fileType: 'pdf',
						fileExtension: 'pdf',
						data: 'filesystem-v2',
						directory: 'reports',
						fileName: 'summary.pdf',
						id: BYTES_ID,
						fileSize: '11 B',
						bytes: 11,
					},
				},
			},
		]);
	});

	it('finds the extension of a MIME type and the MIME type of a file name', async () => {
		const typed = await run(download("'summary'", "'image/png; charset=binary'"), [{}], [PDF]);
		expect(typed.result).toMatchObject([
			{ $binary: { data: { fileName: 'summary', fileExtension: 'png', fileType: 'image' } } },
		]);
		const named = await run(download("'a.b/Photo.JPEG'", 'undefined'), [{}], [PDF]);
		expect(named.result).toMatchObject([
			{
				$binary: {
					data: { mimeType: 'image/jpeg', fileName: 'Photo.JPEG', fileExtension: 'JPEG' },
				},
			},
		]);
		const unnamed = await run(download('undefined', "'application/x-none'"), [{}], [PDF]);
		expect(unnamed.result).toEqual([
			{
				status: 200,
				$binary: {
					data: {
						mimeType: 'application/x-none',
						data: 'filesystem-v2',
						id: BYTES_ID,
						fileSize: '11 B',
						bytes: 11,
					},
				},
			},
		]);
	});

	it('gives the body without the full response', async () => {
		const body =
			"const bytes = await this.helpers.request({ uri: 'https://x.io/f', encoding: null }); returnData.push({ json: {}, binary: { file: await this.helpers.prepareBinaryData(Buffer.from(bytes), 'a.txt') } });";
		const out = await run(body, [{}], [PDF]);
		expect(out.result).toMatchObject([
			{ $binary: { file: { mimeType: 'text/plain', fileName: 'a.txt', id: BYTES_ID } } },
		]);
	});

	it('keeps the binary data of the input item', async () => {
		const body = `${DOWNLOAD} const item = { json: items[i].json, binary: {} }; Object.assign(item.binary, items[i].binary); item.binary.copy = await this.helpers.prepareBinaryData(response.body, 'b.pdf', 'application/pdf'); returnData.push(item);`;
		const out = await run(body, [{ a: 1, $binary: { data: FILE } }], [PDF]);
		expect(out.result).toMatchObject([
			{ a: 1, $binary: { data: FILE, copy: { id: BYTES_ID, fileName: 'b.pdf' } } },
		]);
	});

	it.each([
		{
			label: 'a MIME type that v1 reads from the bytes',
			body: download("'summary'", 'undefined'),
			message: 'binary data with a MIME type that comes from the bytes has no compiled form',
		},
		{
			label: 'bytes in the JSON of an output item',
			body: `${MADE} returnData.push({ json: { file: response.body }, binary: { data: made } });`,
			message: 'file bytes inside JSON data has no compiled form',
		},
		{
			label: 'bytes inside a JSON request body',
			body: `${MADE} await this.helpers.request({ method: 'POST', uri: 'https://x.io/u', body: { nested: { file: response.body, made } }, json: true });`,
			message: 'file bytes inside JSON data has no compiled form',
		},
		{
			label: 'bytes as a binary property',
			body: `${MADE} returnData.push({ json: {}, binary: { data: made, other: response.body } });`,
			message: 'a binary property of an output item that is not binary data has no compiled form',
		},
	])('stops for $label', async ({ body, message }) => {
		const out = await run(body, [{}], [PDF]);
		expect(out.status).toBe('error');
		expect(JSON.stringify(out.result)).toContain(message);
	});

	it('keeps a failed download as the error of v1', async () => {
		const out = await run(
			download("'a.pdf'", "'application/pdf'"),
			[{}],
			[{ status: 404, headers: {}, body: { message: 'gone' } }],
		);
		expect(out.status).toBe('error');
		expect(JSON.stringify(out.result)).toContain('"statusCode":404');
	});

	it.each([
		{
			label: 'the text of a Buffer of a response',
			body: `${DOWNLOAD} const data = Buffer.from(response.body); returnData.push({ json: { r: data.toString() } });`,
		},
		{
			label: 'a Buffer of a response that is not made into binary data',
			body: `${DOWNLOAD} const data = Buffer.from(response.body); returnData.push({ json: { r: data } });`,
		},
		{
			label: 'binary data from the bytes of an input item',
			body: "const bytes = await this.helpers.getBinaryDataBuffer(i, 'data'); returnData.push({ json: {}, binary: { data: await this.helpers.prepareBinaryData(bytes, 'a.txt', 'text/plain') } });",
		},
	])('does not compile $label', ({ body }) => {
		expect(probe(body).errors.length).toBeGreaterThan(0);
	});

	it('keeps the body of a response as it is when the node does not make binary data', async () => {
		const out = await run(
			`${DOWNLOAD} returnData.push({ json: { body: response } });`,
			[{}],
			[PDF],
		);
		expect(requestOf(out).responseBinary).toBeUndefined();
		expect(out.result).toEqual([{ body: 'hello bytes' }]);
	});
});

describe('node compiler: the file size limit of the runtime', () => {
	const source = `export class Probe {
	async execute(this: any) {
		const items = this.getInputData();
		const returnData: any[] = [];
		for (let i = 0; i < items.length; i++) {
			const download = this.getNodeParameter('download', i) as boolean;
			const options: any = { uri: 'https://x.io/files/7' };
			if (download) options.encoding = null;
			const response = await this.helpers.request(options);
			if (download) {
				returnData.push({ json: {}, binary: { data: await this.helpers.prepareBinaryData(Buffer.from(response), 'a.txt') } });
			} else {
				returnData.push({ json: { response } });
			}
		}
		return [returnData];
	}
}`;
	const compileWith = (download: boolean) =>
		specialiseNode({
			type: 'n8n-nodes-base.probe',
			version: 1,
			entry: ENTRY,
			readFile: (path) => (path === ENTRY ? source : undefined),
			parameters: { download },
			aliases: {},
			instanceId: null,
		});

	it('counts the requests only in a module that can ask for the bytes of a response', () => {
		const stores = compileWith(true);
		expect(stores.errors).toEqual([]);
		expect(stores.marksFileLimit).toBe(true);
		expect(stores.source).toContain('__repeats');
		const plain = compileWith(false);
		expect(plain.errors).toEqual([]);
		expect(plain.marksFileLimit).toBe(false);
		expect(plain.source).not.toContain('__repeats');
		expect(plain.source).not.toContain('__isFileLimit');
		expect(plain.source).not.toContain('__isLimit');
	});
});
