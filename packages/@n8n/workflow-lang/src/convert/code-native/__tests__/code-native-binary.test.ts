/**
 * `this.helpers.getBinaryDataBuffer` of a native Code node in a converted workflow. The node
 * reads the stored files of its input items with the `binaryData` service before its code
 * runs. Above the limits of that read, the fallback host runs the node. The data is made up.
 */
import { describe, expect, it } from 'vitest';

import type { EffectRecord } from '../../../reference/runner.ts';
import { runReference } from '../../../reference/runner.ts';
import { convertWorkflow } from '../../index.ts';

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
