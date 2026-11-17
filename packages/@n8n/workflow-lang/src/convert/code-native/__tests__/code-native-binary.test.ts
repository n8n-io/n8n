/**
 * `this.helpers.getBinaryDataBuffer` and `this.helpers.prepareBinaryData` of a native Code
 * node in a converted workflow. The node reads the stored files of its input items with the
 * `binaryData` service before its code runs, and stores the files that its code makes
 * between two runs of the code. Outside the limits, the fallback host runs the node.
 *
 * The last suite compares the node with n8n's real Code node and task runner
 * (`runner-oracle.ts`): the `store` calls get the answer of `runBinaryDataCall` over the
 * real `prepareBinaryData` of n8n-core. The data is made up.
 */
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { beforeAll, describe, expect, it } from 'vitest';

import type { EffectRecord } from '../../../reference/runner.ts';
import { runReference } from '../../../reference/runner.ts';
import type { BinaryDataBackend } from '../../../services/binary-data.ts';
import { runBinaryDataCall } from '../../../services/binary-data.ts';
import { convertWorkflow } from '../../index.ts';
import { runnerCode, startRunner, taskRunnerAvailable } from './runner-oracle.ts';

const hook = {
	name: 'Hook',
	type: 'n8n-nodes-base.webhook',
	typeVersion: 2,
	position: [0, 0],
	parameters: { path: 'a' },
};

function code(name: string, jsCode: string, extra: Record<string, unknown> = {}) {
	return {
		name,
		type: 'n8n-nodes-base.code',
		typeVersion: 2,
		position: [200, 0],
		parameters: { jsCode },
		...extra,
	};
}

const chain = (names: string[]) =>
	Object.fromEntries(
		names
			.slice(0, -1)
			.map((n, k) => [n, { main: [[{ node: names[k + 1], type: 'main', index: 0 }]] }]),
	);

const base64 = (text: string) => Buffer.from(text, 'utf8').toString('base64');
const STORED_ID = 'filesystem-v2:workflows/w/executions/e/binary_data/f1';
const OTHER_ID = 'filesystem-v2:workflows/w/executions/e/binary_data/f2';
const inline = { data: base64('inline text'), mimeType: 'text/plain', fileName: 'a.txt' };
const stored = (id: string, bytes: number) => ({
	data: 'filesystem-v2',
	id,
	bytes,
	mimeType: 'text/plain',
	fileName: 'b.txt',
});

/** A Code node that gives the items of the test as its output, with their binary data. */
const files = (items: Array<Record<string, unknown>>) =>
	code('Files', `return ${JSON.stringify(items.map((binary, k) => ({ json: { k }, binary })))};`);

const READ = `const out = [];
for (let k = 0; k < items.length; k++) {
	const buf = await this.helpers.getBinaryDataBuffer(k, 'data');
	out.push({ json: { text: buf.toString('utf8'), n: buf.length } });
}
return out;`;

interface Run {
	fallback: string[];
	status: string;
	result: unknown;
	items: unknown;
	effects: EffectRecord[];
}

/** Converts and runs the workflow `Hook -> Files -> Read`. `answer` answers each effect. */
async function run(
	items: Array<Record<string, unknown>>,
	jsCode: string,
	answer: (effect: EffectRecord) => unknown,
	extra: Record<string, unknown> = {},
	options: Record<string, unknown> = {},
): Promise<Run> {
	const wf = {
		name: 'Binary',
		nodes: [hook, files(items), code('Read', jsCode, extra)],
		connections: chain(['Hook', 'Files', 'Read']),
	};
	const out = convertWorkflow(wf, { trace: 'all', ...options });
	expect(out.ok).toBe(true);
	const ran = await runReference(
		out.source,
		{ trigger: { body: {} }, now: 0, seed: 1, effects: {}, trace: true },
		{ answer: async (effect) => answer(effect) },
	);
	return {
		fallback: out.fallbackNodes,
		status: ran.status,
		result: ran.result,
		items: (ran.trace ?? []).find((t) => t.step === 'Read')?.items,
		effects: ran.effects,
	};
}

const argsOf = (effect: EffectRecord): Record<string, unknown> =>
	typeof effect.args === 'object' && effect.args !== null ? { ...effect.args } : {};

/** Answers the `read` calls from `stored`, and a host step with `hostItems`. */
const answers =
	(storedText: Record<string, string>, hostItems: unknown[] = []) =>
	(effect: EffectRecord): unknown => {
		const args = argsOf(effect);
		if (effect.kind === 'service' && args.service === 'binaryData' && args.op === 'read') {
			const call = typeof args.args === 'object' && args.args !== null ? { ...args.args } : {};
			const id = 'id' in call && typeof call.id === 'string' ? call.id : '';
			return Object.hasOwn(storedText, id)
				? { data: base64(storedText[id]) }
				: { host: 'the file is not there' };
		}
		return hostItems;
	};

describe('getBinaryDataBuffer of a native Code node', () => {
	it('reads inline bytes with no service call', async () => {
		const out = await run([{ data: inline }], READ, answers({}));
		expect(out.fallback).toEqual([]);
		expect(out.status).toBe('ok');
		expect(out.effects).toEqual([]);
		expect(out.items).toEqual([{ text: 'inline text', n: 11 }]);
	});

	it('reads each stored file of the named property once, before the code runs', async () => {
		const out = await run(
			[
				{ data: stored(STORED_ID, 6), other: stored(OTHER_ID, 5) },
				{ data: inline },
				{ data: stored(STORED_ID, 6) },
			],
			READ,
			answers({ [STORED_ID]: 'stored', [OTHER_ID]: 'other' }),
		);
		expect(out.fallback).toEqual([]);
		expect(out.status).toBe('ok');
		expect(out.effects.map((e) => argsOf(e).args)).toEqual([
			{ id: STORED_ID, as: 'base64', limit: 262144 },
		]);
		expect(out.items).toEqual([
			{ text: 'stored', n: 6 },
			{ text: 'inline text', n: 11 },
			{ text: 'stored', n: 6 },
		]);
	});

	it('reads the stored files of every property when the code computes the name', async () => {
		const jsCode = `const name = ['other'][0];
const buf = await this.helpers.getBinaryDataBuffer(0, name);
return [{ json: { text: buf.toString() } }];`;
		const out = await run(
			[{ data: stored(STORED_ID, 6), other: stored(OTHER_ID, 5) }],
			jsCode,
			answers({ [STORED_ID]: 'stored', [OTHER_ID]: 'other' }),
		);
		expect(out.status).toBe('ok');
		expect(out.effects.length).toBe(2);
		expect(out.items).toEqual([{ text: 'other' }]);
	});

	it.each([
		{ label: 'a stored file above the limit', items: [{ data: stored(STORED_ID, 262145) }] },
		{
			label: 'an inline file above the limit',
			items: [{ data: { ...inline, data: 'A'.repeat(349532) } }],
		},
		{ label: 'a file that the service does not read', items: [{ data: stored(OTHER_ID, 5) }] },
	])('runs the node in the fallback host for $label', async ({ items }) => {
		const hostItems = [{ text: 'from the host', n: 13 }];
		const out = await run(items, READ, answers({ [STORED_ID]: 'stored' }, hostItems));
		expect(out.fallback).toEqual([]);
		expect(out.status).toBe('ok');
		const kinds = out.effects.map((e) => e.kind);
		expect(kinds.at(-1)).toBe('code');
		expect(kinds.filter((k) => k === 'code').length).toBe(1);
		expect(out.result).toEqual({ Read: hostItems });
	});

	it.each([
		{ label: 'an error setting that continues', extra: { onError: 'continueRegularOutput' } },
		{ label: '"retry on fail"', extra: { retryOnFail: true } },
	])('keeps the node in the host with $label', async ({ extra }) => {
		const out = await run([{ data: inline }], READ, answers({}, []), extra);
		expect(out.fallback).toContain('Read');
	});

	it('keeps the node in the host when the runtime has no service calls', async () => {
		const out = await run([{ data: inline }], READ, answers({}, []), {}, { services: false });
		expect(out.fallback).toContain('Read');
	});
});

const PREPARE = `const out = [];
for (const item of items) {
	const buf = Buffer.from('id ' + item.json.k, 'utf8');
	const file = await this.helpers.prepareBinaryData(buf, 'file-' + item.json.k + '.txt', 'text/plain');
	out.push({ json: { k: item.json.k, name: file.fileName, size: buf.length }, binary: { data: file } });
}
return out;`;

/** Answers the `store` calls with an entry made from the arguments, and a host step with `hostItems`. */
const stores =
	(hostItems: unknown[] = [], refuse = false) =>
	(effect: EffectRecord): unknown => {
		const args = argsOf(effect);
		if (effect.kind === 'service' && args.service === 'binaryData' && args.op === 'store') {
			if (refuse) return { host: 'the binary data mode of the instance has no compiled form' };
			const call: Record<string, unknown> =
				typeof args.args === 'object' && args.args !== null ? { ...args.args } : {};
			return {
				entry: {
					data: call.data,
					mimeType: call.mimeType,
					fileName: `stored-${String(call.fileName)}`,
				},
			};
		}
		return hostItems;
	};

describe('prepareBinaryData of a native Code node', () => {
	it('stores the files of the first run and gives the code the stored entries', async () => {
		const out = await run([{ data: inline }, { data: inline }], PREPARE, stores());
		expect(out.fallback).toEqual([]);
		expect(out.status).toBe('ok');
		expect(out.effects.map((e) => argsOf(e).args)).toEqual([
			{ data: base64('id 0'), limit: 262144, fileName: 'file-0.txt', mimeType: 'text/plain' },
			{ data: base64('id 1'), limit: 262144, fileName: 'file-1.txt', mimeType: 'text/plain' },
		]);
		expect(out.result).toEqual({
			Read: [0, 1].map((k) => ({
				k,
				name: `stored-file-${k}.txt`,
				size: 4,
				$binary: {
					data: {
						data: base64(`id ${k}`),
						mimeType: 'text/plain',
						fileName: `stored-file-${k}.txt`,
					},
				},
			})),
		});
	});

	it('makes no service call for code that makes no binary data in its run', async () => {
		const jsCode = `if (items.length > 5) {
	const file = await this.helpers.prepareBinaryData(Buffer.from('x'), 'x.txt');
	return [{ json: {}, binary: { data: file } }];
}
return [{ json: { n: items.length } }];`;
		const out = await run([{ data: inline }], jsCode, stores());
		expect(out.fallback).toEqual([]);
		expect(out.effects).toEqual([]);
		expect(out.result).toEqual({ Read: [{ n: 1 }] });
	});

	it.each([
		{
			label: 'code whose second run makes other binary data',
			jsCode: `const first = await this.helpers.prepareBinaryData(Buffer.from('a'), 'a.txt');
const second = await this.helpers.prepareBinaryData(Buffer.from('b'), first.fileName);
return [{ json: {}, binary: { first, second } }];`,
			refuse: false,
		},
		{
			label: 'code that fails in its first run',
			jsCode: `const file = await this.helpers.prepareBinaryData(Buffer.from('a'), 'a.txt');
return [{ json: { upper: file.fileName.toUpperCase() } }];`,
			refuse: false,
		},
		{
			label: 'a file above the limit',
			jsCode: `const file = await this.helpers.prepareBinaryData(Buffer.from('a'.repeat(262145)), 'a.txt');
return [{ json: {}, binary: { data: file } }];`,
			refuse: false,
		},
		{
			label: 'a file name that is not text',
			jsCode: `let made = 0;
try {
	await this.helpers.prepareBinaryData(Buffer.from('a'), 5);
	made = 1;
} catch (e) {}
return [{ json: { made } }];`,
			refuse: false,
		},
		{ label: 'a reason of the service', jsCode: PREPARE, refuse: true },
	])('runs the node in the fallback host for $label', async ({ jsCode, refuse }) => {
		const hostItems = [{ from: 'the host' }];
		const out = await run([{ data: inline }], jsCode, stores(hostItems, refuse));
		expect(out.fallback).toEqual([]);
		expect(out.status).toBe('ok');
		expect(out.effects.at(-1)?.kind).toBe('code');
		expect(out.result).toEqual({ Read: hostItems });
	});

	it('keeps code with a random number in the host', async () => {
		const jsCode = `const file = await this.helpers.prepareBinaryData(Buffer.from(String(Math.random())), 'a.txt');
return [{ json: {}, binary: { data: file } }];`;
		const out = await run([{ data: inline }], jsCode, stores());
		expect(out.fallback).toContain('Read');
	});
});

interface Core {
	prepareBinaryData(
		bytes: Buffer,
		executionId: string,
		workflowId: string,
		filePath?: string,
		mimeType?: string,
	): Promise<unknown>;
	detectBinaryEncoding(bytes: Buffer): string;
}

let backend: BinaryDataBackend | undefined;

/** The `binaryData` service over n8n-core, in the binary data mode `default` (as the oracle). */
function coreBackend(): BinaryDataBackend {
	if (backend) return backend;
	const here = dirname(fileURLToPath(import.meta.url));
	const hostPackage = join(here, '../../../../../workflow-fallback-host/package.json');
	const core = createRequire(hostPackage)('n8n-core') as Core;
	backend = {
		read: async () => {
			throw new Error('The test has no stored file');
		},
		detect: (data) => core.detectBinaryEncoding(Buffer.from(data)) ?? null,
		store: async (data, fileName, mimeType) =>
			await core.prepareBinaryData(Buffer.from(data), '1', 'oracle', fileName, mimeType),
	};
	return backend;
}

/** Answers the calls of the `binaryData` service as n8n does. */
async function serviceAnswer(effect: EffectRecord): Promise<unknown> {
	const args = argsOf(effect);
	if (effect.kind !== 'service' || args.service !== 'binaryData') {
		throw new Error(`The test has no answer for the effect ${effect.kind}`);
	}
	const call: Record<string, unknown> =
		typeof args.args === 'object' && args.args !== null ? { ...args.args } : {};
	const answer = await runBinaryDataCall(coreBackend(), {
		service: 'binaryData',
		op: String(args.op),
		args: call,
	});
	return answer.ok ? answer.result : { $error: answer.error.message };
}

const ORACLE_ITEMS = [
	{
		k: 0,
		$binary: { data: { data: base64('first file'), mimeType: 'text/plain', fileName: 'a.txt' } },
	},
	{ k: 1, $binary: { data: { data: base64('{"n":2}'), mimeType: 'application/json' } } },
];

const ORACLE_CASES = [
	{
		name: 'a file with a name and a MIME type',
		code: `const out = [];
for (const item of items) {
	const file = await this.helpers.prepareBinaryData(Buffer.from('row ' + item.json.k + '\\n', 'utf8'), 'rows-' + item.json.k + '.csv', 'text/csv');
	out.push({ json: { k: item.json.k, name: file.fileName, type: file.mimeType, ext: file.fileExtension, size: file.fileSize }, binary: { data: file } });
}
return out;`,
	},
	{
		name: 'a file with a name only, and a file without a name',
		code: `const named = await this.helpers.prepareBinaryData(Buffer.from('{"a":1}'), 'folder/data.json');
const bare = await this.helpers.prepareBinaryData(Buffer.from('plain text'));
return [{ json: { keys: Object.keys(named).sort(), bare: Object.keys(bare).sort() }, binary: { named, bare } }];`,
	},
	{
		name: 'the bytes of an input file as a new file',
		code: `const out = [];
for (let k = 0; k < items.length; k++) {
	const bytes = await this.helpers.getBinaryDataBuffer(k, 'data');
	const copy = await this.helpers.prepareBinaryData(bytes, 'copy-' + k + '.bin', 'application/octet-stream');
	out.push({ json: { n: bytes.length }, binary: { copy, data: items[k].binary.data } });
}
return out;`,
	},
];

describe.skipIf(!taskRunnerAvailable())(
	"binary data of native Code nodes against n8n's task runner",
	() => {
		beforeAll(async () => await startRunner(), 120_000);

		it.each(ORACLE_CASES)('makes binary data as v1: $name', async ({ code: jsCode }) => {
			const v1 = await runnerCode(jsCode, 'all', ORACLE_ITEMS);
			const wf = {
				name: 'Binary',
				nodes: [
					hook,
					code(
						'Files',
						`return ${JSON.stringify(ORACLE_ITEMS.map(({ $binary, ...json }) => ({ json, binary: $binary })))};`,
					),
					code('Read', jsCode),
				],
				connections: chain(['Hook', 'Files', 'Read']),
			};
			const out = convertWorkflow(wf, { trace: 'all' });
			expect(out.fallbackNodes).toEqual([]);
			const ran = await runReference(
				out.source,
				{ trigger: { body: {} }, now: 0, seed: 1, effects: {}, trace: true },
				{ answer: serviceAnswer },
			);
			expect(ran.status).toBe('ok');
			expect(ran.effects.every((e) => e.kind === 'service')).toBe(true);
			expect(v1.ok).toBe(true);
			expect(ran.result).toEqual({ Read: v1.ok ? v1.value : [] });
		});
	},
);
