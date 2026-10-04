import { Readable } from 'node:stream';
import type { IBinaryData, IHttpRequestOptions, INode } from 'n8n-workflow';

import { generateNodeModule } from '../entry/codegen';
import { lintContract, toContract } from '../entry/registry';
import { defineNode, t, validate, type AnySchema, type Binary } from '../index';
import { executorOf, type BinaryStore, type ExecutorHost } from '../runtime';

const files = defineNode({ id: 'files', displayName: 'Files' });

const node: INode = {
	id: '1',
	name: 'Files',
	type: 'files',
	typeVersion: 1,
	position: [0, 0],
	parameters: {},
};

const once = { effect: 'write', cardinality: 'per-item' } as const;

const csv: IBinaryData = {
	data: Buffer.from('id,total\n1,42\n').toString('base64'),
	mimeType: 'text/csv',
	fileName: 'q3.csv',
};

async function bytesOf(stream: AsyncIterable<unknown>) {
	const chunks: Uint8Array[] = [];
	for await (const chunk of stream) chunks.push(chunk as Uint8Array);
	return Buffer.concat(chunks).toString();
}

/** A store in memory. `writes` counts the files it stored. */
function memoryStore(input: Record<string, IBinaryData> = {}) {
	const writes: IBinaryData[] = [];
	const store: BinaryStore = {
		input: async (_itemIndex, value) => {
			const found = typeof value === 'string' ? input[value] : undefined;
			if (!found) throw new Error(`The item has no binary field '${String(value)}'`);
			return { ...found, bytes: Buffer.from(found.data, 'base64').length };
		},
		read: async (entry) => Readable.from([Buffer.from(entry.data, 'base64')]),
		write: async (stream, meta) => {
			const text = await bytesOf(stream);
			const entry = {
				data: Buffer.from(text).toString('base64'),
				mimeType: meta.mimeType ?? 'application/octet-stream',
				...(meta.fileName ? { fileName: meta.fileName } : {}),
				bytes: text.length,
			};
			writes.push(entry);
			return entry;
		},
	};
	return { store, writes };
}

function hostOf(
	parameters: Record<string, unknown>,
	replies: unknown[],
	overrides: Partial<ExecutorHost> = {},
) {
	const requests: IHttpRequestOptions[] = [];
	const bodies: string[] = [];
	const host: ExecutorHost = {
		items: [{ json: {} }],
		node,
		parameter: (name) => parameters[name],
		request: async (options) => {
			requests.push(options);
			if (options.body instanceof Readable) bodies.push(await bytesOf(options.body));
			const reply = replies[requests.length - 1];
			if (reply instanceof Error) throw reply;
			return typeof reply === 'function' ? reply() : reply;
		},
		continueOnFail: () => false,
		wait: async () => {},
		...overrides,
	};
	return { host, requests, bodies };
}

const streamed = (text: string, headers: Record<string, string>) => () => ({
	body: Readable.from([Buffer.from(text)]),
	headers,
	statusCode: 200,
});

describe('binary data', () => {
	const convert = files.action('convert', {
		action: 'Convert a file',
		summary: 'Convert a file.',
		flow: once,
		egress: { hosts: ['convert.test'] },
		input: { file: t.binary() },
		output: t.obj({ converted: t.binary(), size: t.str() }),
		async run({ input, http }) {
			const converted = await http.request({
				method: 'POST',
				url: 'https://convert.test/png',
				body: input.file,
				response: 'binary',
			});
			return { converted, size: String(input.file.meta.bytes) };
		},
	});

	it('streams an input binary as the body and stores a binary response', async () => {
		const { store, writes } = memoryStore({ data: csv });
		const { host, requests, bodies } = hostOf(
			{ file: 'data' },
			[
				streamed('PNG', {
					'content-type': 'image/png; charset=binary',
					'content-disposition': 'attachment; filename="chart 1.png"',
				}),
			],
			{ binary: store },
		);

		const [items] = await executorOf(convert)(host);

		expect(bodies).toEqual(['id,total\n1,42\n']);
		expect(requests[0]).toMatchObject({
			headers: { 'content-type': 'text/csv', 'content-length': 14, accept: '*/*' },
			json: false,
			encoding: 'stream',
			returnFullResponse: true,
			// A redirect needs the whole body in memory.
			disableFollowRedirect: true,
		});
		expect(writes).toHaveLength(1);
		expect(items).toEqual([
			{
				json: { size: '14' },
				binary: {
					converted: {
						data: Buffer.from('PNG').toString('base64'),
						mimeType: 'image/png',
						fileName: 'chart 1.png',
						bytes: 3,
					},
				},
				pairedItem: { item: 0 },
			},
		]);
	});

	it('opens the body again for a retry', async () => {
		const upload = files.action('upload', {
			action: 'Upload a file',
			summary: 'Upload a file.',
			flow: { ...once, idempotent: true },
			egress: { hosts: ['up.test'] },
			input: { file: t.binary() },
			output: t.json(),
			async run({ input, http }) {
				const body = await http.request({
					method: 'PUT',
					url: 'https://up.test',
					body: input.file,
				});
				return { body };
			},
		});
		const errorBody = Readable.from(['busy']);
		const unavailable = Object.assign(new Error('503'), {
			response: { status: 503, headers: {}, data: errorBody },
		});
		const { store } = memoryStore({ data: csv });
		const { host, bodies } = hostOf({ file: 'data' }, [unavailable, { ok: true }], {
			binary: store,
		});

		expect(await executorOf(upload)(host)).toEqual([
			[{ json: { body: { ok: true } }, pairedItem: { item: 0 } }],
		]);
		expect(bodies).toEqual(['id,total\n1,42\n', 'id,total\n1,42\n']);
		expect(errorBody.destroyed).toBe(true);
	});

	it('creates a binary from chunks, reads it back, and resolves binaries in variants and lists', async () => {
		const bundle = files.action('bundle', {
			action: 'Bundle files',
			summary: 'Bundle files.',
			flow: once,
			input: {
				parts: t.arr(t.binary()),
				cover: t.variant('kind', { file: { file: t.binary() }, none: {} }),
			},
			output: t.obj({ bundle: t.binary() }),
			async run({ input, binary: binaries }) {
				const cover = input.cover.kind === 'file' ? [input.cover.file] : [];
				async function* chunks() {
					for (const part of [...cover, ...input.parts]) {
						yield `${part.meta.fileName}:`;
						yield* part.read();
					}
				}
				const created = await binaries.create({ mimeType: 'text/plain' }, chunks());
				const again = await bytesOf(created.read());
				return {
					bundle: await binaries.create({ mimeType: 'text/plain', fileName: 'all.txt' }, [again]),
				};
			},
		});
		const { store } = memoryStore({ data: csv, note: { ...csv, fileName: 'note.txt' } });
		const { host } = hostOf({ parts: ['data'], cover: { kind: 'file', file: 'note' } }, [], {
			binary: store,
		});

		const [[item] = []] = await executorOf(bundle)(host);

		expect(Buffer.from(item?.binary?.bundle?.data ?? '', 'base64').toString()).toBe(
			'note.txt:id,total\n1,42\nq3.csv:id,total\n1,42\n',
		);
		expect(item?.binary?.bundle).toMatchObject({ fileName: 'all.txt', mimeType: 'text/plain' });
	});

	it('refuses a binary that is not from the run, a missing binary, and a host without a store', async () => {
		const forged = files.action('forge', {
			action: 'Forge',
			summary: 'Forge.',
			flow: once,
			input: {},
			output: t.obj({ file: t.binary() }),
			async run() {
				const file: Binary = { meta: { mimeType: 'text/plain' }, async *read() {} };
				return { file };
			},
		});
		const { store } = memoryStore();
		await expect(executorOf(forged)(hostOf({}, [], { binary: store }).host)).rejects.toThrow(
			'output[0].file: must be a binary of this run',
		);
		await expect(
			executorOf(convert)(hostOf({ file: 'other' }, [], { binary: store }).host),
		).rejects.toThrow("The item has no binary field 'other'");
		await expect(executorOf(convert)(hostOf({ file: 'data' }, []).host)).rejects.toThrow(
			'this host has no binary store',
		);
	});

	it('takes the key of a binary of the input item, not the binary that an expression gives', async () => {
		const { store } = memoryStore({ data: csv });
		const run = async (parameters: Record<string, unknown>) =>
			await executorOf(convert)(hostOf(parameters, [], { binary: store }).host);
		const hint =
			'must be the key of a binary of the input item, e.g. "data". Write (item) => item.binary.data';

		await expect(run({ file: csv })).rejects.toThrow(`input.file: ${hint}`);
		await expect(run({ file: '={{ $binary.data }}' })).rejects.toThrow(`input.file: ${hint}`);
		expect(
			validate({ file: '={{ $binary.data }}' }, toContract(convert).input, {
				allowExpressions: true,
			}),
		).toEqual([`input.file: ${hint}`]);
		expect(
			validate({ file: 'data' }, toContract(convert).input, { allowExpressions: true }),
		).toEqual([]);
	});

	it('moves the binaries of an indexed key pattern to item.binary, also in a union branch', async () => {
		const unpack = files.action('unpack', {
			action: 'Unpack',
			summary: 'Unpack.',
			flow: once,
			input: { count: t.int() },
			output: t.union(
				t.obj({ empty: t.lit(true) }),
				t.indexedBinaries(t.obj({ name: t.str() }), 'attachment_'),
			),
			async run({ input, binary: binaries }) {
				if (input.count === 0) return { empty: true as const };
				const created = await Promise.all(
					Array.from({ length: input.count }, async (_, index) => [
						`attachment_${index}` as const,
						await binaries.create({ mimeType: 'text/plain', fileName: `${index}.txt` }, [
							`part ${index}`,
						]),
					]),
				);
				return { name: 'mail', ...Object.fromEntries(created) };
			},
		});
		const { store } = memoryStore();
		const run = async (count: number) =>
			await executorOf(unpack)(hostOf({ count }, [], { binary: store }).host);

		const [[item] = []] = await run(2);

		expect(item?.json).toEqual({ name: 'mail' });
		expect(item?.binary).toEqual({
			attachment_0: expect.objectContaining({ fileName: '0.txt', mimeType: 'text/plain' }),
			attachment_1: expect.objectContaining({ fileName: '1.txt', mimeType: 'text/plain' }),
		});
		expect(await run(0)).toEqual([[{ json: { empty: true }, pairedItem: { item: 0 } }]]);
		expect(lintContract(toContract(unpack))).toEqual([]);
	});

	it('moves the binaries of open keys to item.binary, and keeps each field in the JSON', async () => {
		const upload = files.action('upload', {
			action: 'Upload',
			summary: 'Upload.',
			flow: once,
			input: { fields: t.arr(t.str()) },
			output: t.openBinaries(t.obj({ name: t.str(), 'name.x': t.str().optional() })),
			async run({ input, binary: binaries }) {
				const created = await Promise.all(
					input.fields.map(async (field) => [
						field,
						await binaries.create({ mimeType: 'text/plain' }, [field]),
					]),
				);
				return { name: 'form', 'name.x': 'x', ...Object.fromEntries(created) };
			},
		});
		const { store } = memoryStore();
		const [[item] = []] = await executorOf(upload)(
			hostOf({ fields: ['image', 'my file'] }, [], { binary: store }).host,
		);

		expect(item?.json).toEqual({ name: 'form', 'name.x': 'x' });
		expect(Object.keys(item?.binary ?? {})).toEqual(['image', 'my file']);
		expect(lintContract(toContract(upload))).toEqual([]);
		const text = generateNodeModule('files', [
			{ contract: toContract(upload), operation: 'upload', nodeType: 'files.upload' },
		]);
		expect(text).toContain('binary: { [key: string]: Binary } };');
	});

	it('refuses a binary under a key that the pattern does not match', async () => {
		const unpack = files.action('unpack', {
			action: 'Unpack',
			summary: 'Unpack.',
			flow: once,
			input: {},
			output: t.indexedBinaries(t.obj({ name: t.str() }), 'attachment_'),
			async run({ binary: binaries }) {
				const file = await binaries.create({ mimeType: 'text/plain' }, ['x']);
				return { name: 'mail', ...Object.fromEntries([['file_0', file]]) };
			},
		});
		const { store } = memoryStore();
		await expect(executorOf(unpack)(hostOf({}, [], { binary: store }).host)).rejects.toThrow(
			'output[0]: unknown field(s) file_0. Allowed: name',
		);
		const warned = hostOf({}, [], { binary: store, warn: () => {} }).host;
		await expect(executorOf(unpack)(warned)).rejects.toThrow(
			'output[0].file_0: holds a binary, and the contract declares no binary under this key',
		);
	});

	it('refuses an undeclared binary key of an action with fixed binary fields', async () => {
		const extra = files.action('extra', {
			action: 'Extra',
			summary: 'Extra.',
			flow: once,
			input: {},
			output: t.obj({ data: t.binary() }),
			async run({ binary: binaries }) {
				const data = await binaries.create({ mimeType: 'text/plain' }, ['x']);
				return { data, attachment_0: data };
			},
		});
		const { store } = memoryStore();
		await expect(executorOf(extra)(hostOf({}, [], { binary: store }).host)).rejects.toThrow(
			'output[0]: unknown field(s) attachment_0. Allowed: data',
		);
		const warned = hostOf({}, [], { binary: store, warn: () => {} }).host;
		await expect(executorOf(extra)(warned)).rejects.toThrow(
			'output[0].attachment_0: holds a binary, and the contract declares no binary under this key',
		);
	});

	it('gives no binary data to an action without a binary field', async () => {
		const sneaky = files.action('sneaky', {
			action: 'Sneaky',
			summary: 'Sneaky.',
			flow: once,
			egress: { hosts: ['x.test'] },
			input: {},
			output: t.json(),
			async run({ http }) {
				return { file: await http.request({ url: 'https://x.test', response: 'binary' }) };
			},
		});
		const { store } = memoryStore();
		await expect(executorOf(sneaky)(hostOf({}, [], { binary: store }).host)).rejects.toThrow(
			'files.sneaky has no binary() field, so it targets Node Contract 2.1.0',
		);
	});
});

describe('binary contracts', () => {
	it('lint a binary output below the top level and a JSON field named binary', () => {
		const nested = files.action('nested', {
			action: 'Nested',
			summary: 'Nested.',
			flow: once,
			input: { file: t.nullable(t.binary()) },
			output: t.obj({ result: t.obj({ file: t.binary() }), binary: t.str() }),
			async run() {
				throw new Error('not run');
			},
		});
		expect(lintContract(toContract(nested))).toEqual([
			'files.nested: output.result holds a binary below the top level',
			'files.nested: output field "binary" is reserved for binaries',
			'files.nested: an input binary must be a field, a list item, or in a variant branch',
		]);
		const keyed = files.action('keyed', {
			action: 'Keyed',
			summary: 'Keyed.',
			flow: once,
			input: {},
			output: t.record(t.binary()),
			async run() {
				throw new Error('not run');
			},
		});
		expect(lintContract(toContract(keyed))).toEqual([
			'files.keyed: a binary output must be a top-level field of an object',
		]);
	});

	it('lint an indexed binary key pattern in the input, below the top level, or over a field', () => {
		const lintOf = (output: AnySchema) =>
			lintContract(
				toContract(
					files.action('odd', {
						action: 'Odd',
						summary: 'Odd.',
						flow: once,
						input: {},
						output,
						async run() {
							throw new Error('not run');
						},
					}),
				),
			);
		expect(
			lintOf(t.obj({ mail: t.indexedBinaries(t.obj({ id: t.str() }), 'attachment_') })),
		).toEqual(['files.odd: output.mail holds a binary below the top level']);
		expect(lintOf(t.indexedBinaries(t.obj({ line1: t.str() })))).toEqual([
			'files.odd: output.line1 is no binary, but the output takes its key as a binary',
		]);
		const inputPattern = files.action('inputPattern', {
			action: 'Input pattern',
			summary: 'Input pattern.',
			flow: once,
			input: { files: t.indexedBinaries(t.obj({}), 'file_') },
			output: t.obj({ id: t.str() }),
			async run() {
				throw new Error('not run');
			},
		});
		expect(lintContract(toContract(inputPattern))).toEqual([
			'files.inputPattern: an input binary must be a field, a list item, or in a variant branch',
		]);
	});

	it('generate Binary fields: a lambda input and item.binary in the output', () => {
		const download = files.action('download', {
			action: 'Download',
			summary: 'Download.',
			flow: once,
			input: { url: t.str(), file: t.binary().optional() },
			output: t.obj({ data: t.binary(), status: t.str() }),
			async run() {
				throw new Error('not run');
			},
		});
		const text = generateNodeModule('files', [
			{ contract: toContract(download), operation: 'download', nodeType: 'files.download' },
		]);
		expect(text).toContain(
			"import { binaryKeys, contractStep, type Binary, type DeepPartial, type Dollar, type Exact, type NodeSettings, type OutputOf, type Sampled, type Step, type Value } from '@n8n/workflow-sdk/next';",
		);
		expect(text).toContain('contractStep("files.download", binaryKeys(config, [["file"]]))');
		expect(text).toContain(
			'export type FilesDownloadInput<I, C> = { url: Value<I, C, string>; file?: ((item: I, $: Dollar<C>) => Binary) };',
		);
		expect(text).toContain(
			'export type FilesDownloadOutput = { status: string; binary: { data: Binary } };',
		);
	});

	it('generate indexed binary keys as a template literal under item.binary', () => {
		const unpack = (prefix?: string) =>
			files.action('unpack', {
				action: 'Unpack',
				summary: 'Unpack.',
				flow: once,
				input: {},
				output: t.union(
					t.obj({ empty: t.bool() }),
					t.indexedBinaries(t.obj({ name: t.str(), data: t.binary() }), prefix),
				),
				async run() {
					throw new Error('not run');
				},
			});
		const slot = (type: string) => `\${${type}}`;
		const outputOf = (prefix?: string) =>
			generateNodeModule('files', [
				{ contract: toContract(unpack(prefix)), operation: 'unpack', nodeType: 'files.unpack' },
			]);
		expect(outputOf('attachment_')).toContain(
			`binary: { data: Binary; [key: \`attachment_${slot('number')}\`]: Binary };`,
		);
		expect(outputOf()).toContain(`[key: \`${slot('string')}${slot('number')}\`]: Binary`);
	});
});

describe('binary egress', () => {
	const hosted = defineNode({
		id: 'hosted',
		displayName: 'Hosted',
		baseUrl: 'https://api.hosted.test',
	});

	const upload = hosted.action('upload', {
		action: 'Upload a file',
		summary: 'Upload a file.',
		flow: once,
		input: { file: t.binary(), url: t.str() },
		output: t.obj({ ok: t.str() }),
		async run({ input, http }) {
			await http.request({ method: 'POST', url: input.url, body: input.file });
			return { ok: 'yes' };
		},
	});

	const fetchFile = hosted.action('fetchFile', {
		action: 'Fetch a file',
		summary: 'Fetch a file.',
		flow: once,
		input: { url: t.str() },
		output: t.obj({ file: t.binary() }),
		async run({ input, http }) {
			return { file: await http.request({ url: input.url, response: 'binary' }) };
		},
	});

	it('refuses a binary body to a host outside the allowed hosts', async () => {
		const { store, writes } = memoryStore({ data: csv });
		const { host, requests } = hostOf({ file: 'data', url: 'https://other.test/up' }, [], {
			binary: store,
		});

		await expect(executorOf(upload)(host)).rejects.toThrow(
			'Host not allowed: hosted.upload may send requests to api.hosted.test, not to other.test',
		);
		expect(requests).toEqual([]);
		expect(writes).toEqual([]);
	});

	it('stops a binary download at the response limit, and reads no more of it', async () => {
		const pulled = { chunks: 0 };
		function* chunks() {
			for (const _ of Array.from({ length: 1000 })) {
				pulled.chunks += 1;
				yield Buffer.alloc(1024);
			}
		}
		const { store, writes } = memoryStore();
		const reply = () => ({ body: Readable.from(chunks()), headers: {}, statusCode: 200 });
		const { host } = hostOf({ url: 'https://api.hosted.test/big' }, [reply], {
			binary: store,
			maxResponseBytes: 4096,
		});

		await expect(executorOf(fetchFile)(host)).rejects.toThrow(
			'hosted.fetchFile got a response larger than 4096 bytes',
		);
		expect(pulled.chunks).toBeLessThan(64);
		expect(writes).toEqual([]);
	});

	it('refuses a binary download whose declared length is over the limit, before it reads', async () => {
		const pulled = { chunks: 0 };
		function* chunks() {
			pulled.chunks += 1;
			yield Buffer.alloc(8192);
		}
		const { store } = memoryStore();
		const reply = () => ({
			body: Readable.from(chunks()),
			headers: { 'content-length': '8192' },
			statusCode: 200,
		});
		const { host } = hostOf({ url: 'https://api.hosted.test/big' }, [reply], {
			binary: store,
			maxResponseBytes: 4096,
		});

		await expect(executorOf(fetchFile)(host)).rejects.toThrow(
			'hosted.fetchFile got a response larger than 4096 bytes',
		);
		expect(pulled.chunks).toBe(0);
	});

	it('stores a binary download of exactly the limit, and gives the client no limit for it', async () => {
		const { store, writes } = memoryStore();
		const { host, requests } = hostOf(
			{ url: 'https://api.hosted.test/file' },
			[streamed('x'.repeat(4096), { 'content-length': '4096' })],
			{ binary: store, maxResponseBytes: 4096 },
		);

		await executorOf(fetchFile)(host);

		expect(writes.map(({ bytes }) => bytes)).toEqual([4096]);
		expect(requests[0]).not.toHaveProperty('maxResponseBytes');
	});

	it('refuses a binary response from a host outside the allowed hosts', async () => {
		const { store, writes } = memoryStore();
		const { host, requests } = hostOf({ url: 'https://other.test/file.png' }, [], {
			binary: store,
		});

		await expect(executorOf(fetchFile)(host)).rejects.toThrow(
			'Host not allowed: hosted.fetchFile may send requests to api.hosted.test, not to other.test',
		);
		expect(requests).toEqual([]);
		expect(writes).toEqual([]);
	});
});
