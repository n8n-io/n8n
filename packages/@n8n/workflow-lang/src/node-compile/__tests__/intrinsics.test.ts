import {
	assertParamIsBoolean,
	assertParamIsNumber,
	assertParamIsString,
	isResourceLocatorValue,
	setSafeObjectProperty,
	tryToParseNumber,
} from 'n8n-workflow';
import type { INode } from 'n8n-workflow';

import { compile } from '../../compiler/index.ts';
import { decodeModule } from '../../compiler/decode.ts';
import { runReference } from '../../reference/runner.ts';
import { runModule } from '../../testing/vm.ts';
import { specialiseNode } from '../specialise.ts';

const ENTRY = '/probe/Probe.node.ts';
const IMPORTS =
	"import { assertParamIsBoolean, assertParamIsNumber, assertParamIsString, isResourceLocatorValue, setSafeObjectProperty, tryToParseNumber } from 'n8n-workflow';";

function probe(expression: string) {
	const source = `${IMPORTS}
export class Probe {
	async execute(this: any) {
		const items = this.getInputData();
		const returnData: any[] = [];
		for (let i = 0; i < items.length; i++) {
			const value = items[i].json.value;
			returnData.push({ json: { r: ${expression} } });
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

function workflowSource(inputs: unknown[]): string {
	return `import { webhook, workflow } from '@n8n/workflow-lang';

export default workflow({
	triggers: [webhook({ path: 'probe' })],
	async run(ctx) {
		return await ctx.node({
			name: 'Node',
			type: 'n8n-nodes-base.probe',
			typeVersion: 1,
			parameters: {},
			items: ${JSON.stringify(inputs.map((value) => ({ value })))},
		});
	},
});
`;
}

const fixture = { trigger: { body: {}, headers: {}, query: {} }, now: 0, seed: 1, effects: {} };

async function run(expression: string, inputs: unknown[]) {
	const result = probe(expression);
	expect(result.errors).toEqual([]);
	const nodes = { 'nodes/compiled-node.ts': result.source ?? '' };
	const compiled = compile(workflowSource(inputs), { nodes });
	expect(compiled.diagnostics).toEqual([]);
	const reference = await runReference(workflowSource(inputs), fixture, { nodes });
	const bytecode = runModule(decodeModule(compiled.module ?? new Uint8Array()), fixture);
	expect(JSON.stringify(bytecode)).toBe(JSON.stringify(reference));
	return reference;
}

async function values(expression: string, inputs: unknown[]): Promise<unknown[]> {
	const out = await run(expression, inputs);
	expect(out.status).toBe('ok');
	const rows: unknown = out.result;
	return Array.isArray(rows) ? rows.map((row: { r: unknown }) => row.r) : [];
}

async function failure(expression: string, input: unknown): Promise<string> {
	const out = await run(expression, [input]);
	expect(out.status).toBe('error');
	return JSON.stringify(out.result);
}

function messageOf(work: () => void): string {
	try {
		work();
	} catch (error) {
		return error instanceof Error ? error.message : String(error);
	}
	return '';
}

const NODE: INode = {
	id: '1',
	name: 'Node',
	type: 'n8n-nodes-base.probe',
	typeVersion: 1,
	position: [0, 0],
	parameters: {},
};

describe('node compiler: small functions of n8n-workflow', () => {
	it('gives the result of isResourceLocatorValue', async () => {
		const inputs = [
			{ __rl: true, mode: 'id', value: 'a' },
			{ mode: 'id', value: 'a' },
			{ __rl: true, mode: 'id' },
			{ __rl: false, mode: null, value: null, more: 1 },
			'text',
			5,
			null,
			[],
			['mode', 'value', '__rl'],
			{},
		];
		expect(await values('isResourceLocatorValue(value)', inputs)).toEqual(
			inputs.map((input) => isResourceLocatorValue(input)),
		);
	});

	it('gives the object of setSafeObjectProperty', async () => {
		const inputs = ['a', 'b c', '__proto__', 'constructor', 'prototype', 'loadEnvFile', 'toString'];
		const expected = inputs.map((input) => {
			const target: Record<string, unknown> = { kept: 1 };
			setSafeObjectProperty(target, input, 2);
			return JSON.parse(JSON.stringify(target));
		});
		expect(
			await values(
				'(() => { const target: any = { kept: 1 }; setSafeObjectProperty(target, value, 2); return target; })()',
				inputs,
			),
		).toEqual(expected);
	});

	it('stops for a safe property name that is not text', async () => {
		expect(
			await failure(
				'(() => { const target: any = {}; setSafeObjectProperty(target, value, 2); return target; })()',
				5,
			),
		).toContain('has no compiled form');
	});

	it('gives the number of tryToParseNumber', async () => {
		const inputs = ['12', ' 3.5 ', '', '-0.25', '1e3', 7, true, false, null];
		expect(await values('tryToParseNumber(value)', inputs)).toEqual(
			inputs.map((input) => tryToParseNumber(input)),
		);
	});

	it('gives the error of tryToParseNumber', async () => {
		const expected = messageOf(() => tryToParseNumber('x'));
		expect(expected).not.toBe('');
		expect(await failure('tryToParseNumber(value)', 'x')).toContain(expected);
		expect(await failure('tryToParseNumber(value)', '1,5')).toContain(expected);
	});

	it('stops for tryToParseNumber of an object', async () => {
		expect(await failure('tryToParseNumber(value)', [5])).toContain('has no compiled form');
	});

	it.each([
		{ name: 'assertParamIsString', check: assertParamIsString, good: 'a', bad: 5 },
		{ name: 'assertParamIsNumber', check: assertParamIsNumber, good: 5, bad: '5' },
		{ name: 'assertParamIsBoolean', check: assertParamIsBoolean, good: false, bad: null },
	])('gives the result and the error of $name', async ({ name, check, good, bad }) => {
		const code = `(() => { ${name}('amount', value, this.getNode()); return value; })()`;
		expect(await values(code, [good])).toEqual([good]);
		const expected = messageOf(() => check('amount', bad, NODE));
		expect(expected).toContain('amount');
		const text = await failure(code, bad);
		expect(text).toContain(JSON.stringify(expected).slice(1, -1));
		expect(text).toContain('NodeOperationError');
	});
});

describe('node compiler: a parameter that the node does not have', () => {
	it('gives the error of v1 for a read with no fallback', async () => {
		const text = await failure("this.getNodeParameter('amount', i)", 1);
		expect(text).toContain('Could not get parameter \\"amount\\"');
		expect(text).toContain('UserError');
	});

	it('gives the error of v1 for a read with the fallback undefined', async () => {
		expect(await failure("this.getNodeParameter('amount', i, undefined)", 1)).toContain(
			'Could not get parameter \\"amount\\"',
		);
	});

	it('gives the fallback of a read', async () => {
		expect(await values("this.getNodeParameter('amount', i, 5)", [1])).toEqual([5]);
	});

	it('does not fail for a read that the code does not reach', async () => {
		expect(await values("value === 2 ? this.getNodeParameter('amount', i) : value", [1])).toEqual([
			1,
		]);
	});
});

describe('node compiler: execution hints', () => {
	it('drops a hint and keeps the output', async () => {
		const code =
			"(() => { this.addExecutionHints({ message: 'For ' + value, location: 'outputPane' }); return value; })()";
		expect(await values(code, ['a', 'b'])).toEqual(['a', 'b']);
	});

	it('drops a list of hints', async () => {
		const code =
			"(() => { const hints: any[] = [{ message: 'one' }]; if (hints.length) this.addExecutionHints(...hints); return value; })()";
		expect(await values(code, [1])).toEqual([1]);
	});

	it('keeps an error of the code that makes a hint', async () => {
		const code =
			'(() => { this.addExecutionHints({ message: value.missing.text }); return value; })()';
		expect(await values(code, [{ missing: { text: 'a' } }])).toHaveLength(1);
		const out = await run(code, [{}]);
		expect(out.status).toBe('error');
	});
});
