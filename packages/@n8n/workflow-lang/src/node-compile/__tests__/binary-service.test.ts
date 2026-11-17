import { compile } from '../../compiler/index.ts';
import { decodeModule } from '../../compiler/decode.ts';
import { RUNS_IN_HOST } from '../../convert/helpers.ts';
import { runReference } from '../../reference/runner.ts';
import { runModule } from '../../testing/vm.ts';
import { specialiseNode } from '../specialise.ts';

const ENTRY = '/probe/Probe.node.ts';
const HELLO = Buffer.from('hello bytes').toString('base64');
const FILE = { data: HELLO, mimeType: 'text/plain', fileName: 'hello.txt' };
const STORED_ID = 'filesystem-v2:workflows/w/executions/e/binary_data/f';
const STORED = { ...FILE, data: 'filesystem-v2', id: STORED_ID, bytes: 11 };
const OK = { status: 200, headers: {}, body: { ok: true } };

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

async function run(body: string, items: unknown[], answers: unknown[]) {
	const result = probe(body);
	expect(result.errors).toEqual([]);
	expect(result.marksFileLimit).toBe(true);
	const nodes = { 'nodes/compiled-node.ts': result.source ?? '' };
	const compiled = compile(workflowSource(items), { nodes });
	expect(compiled.diagnostics).toEqual([]);
	const fixture = {
		trigger: { body: {}, headers: {}, query: {} },
		now: 0,
		seed: 1,
		effects: { Node: answers },
	};
	const reference = await runReference(workflowSource(items), fixture, { nodes });
	const bytecode = runModule(decodeModule(compiled.module ?? new Uint8Array()), fixture);
	expect(JSON.stringify(bytecode)).toBe(JSON.stringify(reference));
	return reference;
}

function opsOf(out: Awaited<ReturnType<typeof run>>): unknown[] {
	return out.effects.map((effect) => {
		const args: unknown = effect.args;
		return typeof args === 'object' && args !== null && 'op' in args ? args.op : effect.kind;
	});
}

const ATTACH = `const binaryData = this.helpers.assertBinaryData(i, 'data');
			const dataBuffer = await this.helpers.getBinaryDataBuffer(i, 'data');
			const response = await this.helpers.request({ method: 'POST', uri: 'https://api.example.com/mail', body: { content: dataBuffer.toString('base64'), filename: binaryData.fileName }, json: true });
			returnData.push({ json: response });`;

const STREAMED = `const binaryData = this.helpers.assertBinaryData(i, 'data');
			let fileBase64;
			if (binaryData.id) {
				const stream = await this.helpers.getBinaryStream(binaryData.id, 262144);
				const buffer = await this.helpers.binaryToBuffer(stream);
				fileBase64 = buffer.toString('base64');
			} else {
				fileBase64 = binaryData.data;
			}
			const response = await this.helpers.request({ method: 'POST', uri: 'https://api.example.com/mail', body: { content: fileBase64 }, json: true });
			returnData.push({ json: response });`;

const DOWNLOAD = `const response = await this.helpers.request({ method: 'GET', uri: 'https://api.example.com/file', json: true });
			const binary = await this.helpers.prepareBinaryData(Buffer.from(response.content as string, 'base64'), response.path as string);
			returnData.push({ json: { path: response.path }, binary: { data: binary } });`;

const COPY = `const buffer = await this.helpers.getBinaryDataBuffer(i, 'data');
			const binary = await this.helpers.prepareBinaryData(buffer, 'copy.txt', 'text/plain');
			returnData.push({ json: {}, binary: { copy: binary } });`;

describe('file bytes of an item through the binaryData service', () => {
	it('reads the base64 text of an inline file for a JSON body', async () => {
		const out = await run(ATTACH, [{ $binary: { data: FILE } }], [{ data: HELLO }, OK]);
		expect(out.status).toBe('ok');
		expect(out.effects.map((e) => e.kind)).toEqual(['service', 'http']);
		expect(out.effects[0]?.args).toEqual({
			service: 'binaryData',
			op: 'read',
			args: { as: 'base64', limit: 262144, data: HELLO },
		});
		expect(out.effects[1]?.args).toMatchObject({
			method: 'POST',
			body: { content: HELLO, filename: 'hello.txt' },
		});
	});

	it('reads the base64 text of a stored file by its id', async () => {
		const out = await run(ATTACH, [{ $binary: { data: STORED } }], [{ data: HELLO }, OK]);
		expect(out.status).toBe('ok');
		expect(out.effects[0]?.args).toEqual({
			service: 'binaryData',
			op: 'read',
			args: { as: 'base64', limit: 262144, id: STORED_ID },
		});
		expect(out.effects[1]?.args).toMatchObject({ body: { content: HELLO } });
	});

	it('reads the base64 text of the stream of a stored file', async () => {
		const out = await run(STREAMED, [{ $binary: { data: STORED } }], [{ data: HELLO }, OK]);
		expect(out.status).toBe('ok');
		expect(out.effects[0]?.args).toMatchObject({ op: 'read', args: { id: STORED_ID } });
		expect(out.effects[1]?.args).toMatchObject({ body: { content: HELLO } });
	});

	it('hands the node over to the host for a file above the limit, with no call', async () => {
		const large = { ...STORED, bytes: 262145 };
		const out = await run(ATTACH, [{ $binary: { data: large } }], [OK]);
		expect(out.status).toBe('error');
		expect(out.effects).toEqual([]);
		expect(JSON.stringify(out.result)).toContain(RUNS_IN_HOST);
	});

	it('hands the node over to the host when the service names a reason', async () => {
		const out = await run(
			ATTACH,
			[{ $binary: { data: STORED } }],
			[{ host: 'the file has more than 262144 bytes' }, OK],
		);
		expect(out.status).toBe('error');
		expect(out.effects.map((e) => e.kind)).toEqual(['service']);
		expect(JSON.stringify(out.result)).toContain(RUNS_IN_HOST);
	});

	it('hands the node over to the host for a file store that is not the file system', async () => {
		const other = { ...STORED, data: 's3', id: 's3:workflows/w/executions/e/binary_data/f' };
		const out = await run(STREAMED, [{ $binary: { data: other } }], [OK]);
		expect(out.status).toBe('error');
		expect(out.effects).toEqual([]);
		expect(JSON.stringify(out.result)).toContain(RUNS_IN_HOST);
	});

	it('makes binary data from the base64 text of a response with the store call', async () => {
		const entry = { data: HELLO, mimeType: 'text/plain', fileName: 'a.txt', fileSize: '11 B' };
		const body = { content: `${HELLO.slice(0, 4)}\n${HELLO.slice(4)}`, path: 'docs/a.txt' };
		const out = await run(DOWNLOAD, [{}], [{ status: 200, headers: {}, body }, { entry }]);
		expect(out.status).toBe('ok');
		expect(out.effects.map((e) => e.kind)).toEqual(['http', 'service']);
		expect(out.effects[1]?.args).toEqual({
			service: 'binaryData',
			op: 'store',
			args: { data: body.content, limit: 262144, fileName: 'docs/a.txt' },
		});
		expect(out.result).toEqual([{ path: 'docs/a.txt', $binary: { data: entry } }]);
	});

	it('makes binary data from the bytes of a stored file with a read and a store call', async () => {
		const entry = { data: HELLO, mimeType: 'text/plain', fileName: 'copy.txt' };
		const out = await run(COPY, [{ $binary: { data: STORED } }], [{ data: HELLO }, { entry }]);
		expect(out.status).toBe('ok');
		expect(opsOf(out)).toEqual(['read', 'store']);
		expect(out.result).toEqual([{ $binary: { copy: entry } }]);
	});

	it('keeps other reads of file bytes as compile errors', () => {
		const result = probe(`const buffer = await this.helpers.getBinaryDataBuffer(i, 'data');
			returnData.push({ json: { text: buffer.toString('hex') } });`);
		expect(result.errors.join('\n')).toContain('file bytes have a compiled form only');
	});
});
