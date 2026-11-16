import { randomInt } from 'node:crypto';

import { compile } from '../../compiler/index.ts';
import { decodeModule } from '../../compiler/decode.ts';
import { runReference } from '../../reference/runner.ts';
import { runModule } from '../../testing/vm.ts';
import type { PublishFacts } from '../specialise.ts';
import { specialiseNode } from '../specialise.ts';

const ENTRY = '/probe/Probe.node.ts';
const CREDENTIAL = '/probe/ProbeApi.credentials.ts';
const IMPORTS = `import { randomInt, randomUUID, randomBytes } from 'crypto';
import { sleep } from 'n8n-workflow';`;
const UUID_V4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

function probe(body: string, facts?: PublishFacts, imports = IMPORTS) {
	const source = `${imports}
export class Probe {
	async execute(this: any) {
		const items = this.getInputData();
		const returnData: any[] = [];
		for (let i = 0; i < items.length; i++) {
			const value = items[i].json.value;
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
		facts,
	});
}

function workflowSource(inputs: unknown[]): string {
	return `import { webhook, workflow } from '@n8n/workflow-lang';

export default workflow({
	triggers: [webhook({ path: 'probe' })],
	async run(ctx) {
		const rows = await ctx.node({
			name: 'Node',
			type: 'n8n-nodes-base.probe',
			typeVersion: 1,
			parameters: {},
			items: ${JSON.stringify(inputs.map((value) => ({ value })))},
		});
		return { rows, now: ctx.now() };
	},
});
`;
}

const fixtureOf = (seed: number) => ({
	trigger: { body: {}, headers: {}, query: {} },
	now: 0,
	seed,
	effects: { Node: [{ status: 200, headers: {}, body: { ok: true } }] },
});

async function run(body: string, inputs: unknown[], seed = 1, facts?: PublishFacts) {
	const result = probe(body, facts);
	expect(result.errors).toEqual([]);
	const nodes = { 'nodes/compiled-node.ts': result.source ?? '' };
	const compiled = compile(workflowSource(inputs), { nodes });
	expect(compiled.diagnostics).toEqual([]);
	const fixture = fixtureOf(seed);
	const reference = await runReference(workflowSource(inputs), fixture, { nodes });
	const bytecode = runModule(decodeModule(compiled.module ?? new Uint8Array()), fixture);
	expect(JSON.stringify(bytecode)).toBe(JSON.stringify(reference));
	return { reference, randoms: result.randoms };
}

function rowsOf(result: unknown): Array<{ r: unknown }> {
	const rows: unknown =
		typeof result === 'object' && result !== null && 'rows' in result ? result.rows : [];
	return Array.isArray(rows) ? rows : [];
}

async function values(body: string, inputs: unknown[], seed = 1): Promise<unknown[]> {
	const { reference } = await run(body, inputs, seed);
	expect(reference.status).toBe('ok');
	return rowsOf(reference.result).map((row) => row.r);
}

async function failure(body: string, input: unknown): Promise<string> {
	const { reference } = await run(body, [input]);
	expect(reference.status).toBe('error');
	return JSON.stringify(reference.result);
}

function messageOf(work: () => void): string {
	try {
		work();
	} catch (error) {
		return error instanceof Error ? error.message : String(error);
	}
	return '';
}

const inputs = (count: number) => Array.from({ length: count }, (_, k) => k);

describe('random values in compiled node code', () => {
	it('makes a version 4 UUID from the random source of the engine', async () => {
		const made = await values('returnData.push({ json: { r: randomUUID() } });', inputs(64));
		for (const value of made) expect(value).toMatch(UUID_V4);
		expect(new Set(made).size).toBe(64);
		const variants = new Set(made.map((value) => String(value).charAt(19)));
		expect([...variants].sort()).toEqual(['8', '9', 'a', 'b']);
	});

	it('gives other values for another seed', async () => {
		const body = 'returnData.push({ json: { r: randomUUID() } });';
		expect(await values(body, [0], 1)).not.toEqual(await values(body, [0], 2));
	});

	it('does not copy a random value to each of its uses', async () => {
		const made = await values(
			'const key = randomUUID(); returnData.push({ json: { r: [key, key] } });',
			[0],
		);
		expect(made).toHaveLength(1);
		const pair = made[0];
		expect(Array.isArray(pair) && pair[0] === pair[1]).toBe(true);
	});

	it('draws an integer below the limit, and each value of a small range', async () => {
		const made = await values('returnData.push({ json: { r: randomInt(6) } });', inputs(200));
		expect([...new Set(made)].sort()).toEqual([0, 1, 2, 3, 4, 5]);
	});

	it('draws an integer between two limits', async () => {
		const made = await values(
			'returnData.push({ json: { r: randomInt(-3, value) } });',
			[-2, -2, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4],
		);
		expect(made.slice(0, 2)).toEqual([-3, -3]);
		for (const value of made) {
			expect(Number.isInteger(value)).toBe(true);
			expect(value).toBeGreaterThanOrEqual(-3);
			expect(value).toBeLessThan(4);
		}
	});

	it('reports the range error of Node.js', async () => {
		for (const [min, max] of [
			[5, 5],
			[7, -2],
		]) {
			const expected = messageOf(() => randomInt(min, max));
			expect(expected).not.toBe('');
			expect(
				await failure(`returnData.push({ json: { r: randomInt(${min}, value) } });`, max),
			).toContain(JSON.stringify(expected));
		}
		const expected = messageOf(() => randomInt(0));
		expect(await failure('returnData.push({ json: { r: randomInt(value) } });', 0)).toContain(
			JSON.stringify(expected),
		);
	});

	it('refuses a limit that is not an integer', async () => {
		for (const input of [1.5, '10', null, 2 ** 40]) {
			expect(await failure('returnData.push({ json: { r: randomInt(value) } });', input)).toContain(
				'has no compiled form',
			);
		}
	});

	it('keeps a limit error out of a catch of the node', async () => {
		expect(
			await failure(
				'try { returnData.push({ json: { r: randomInt(value) } }); } catch (error) { returnData.push({ json: { r: 0 } }); }',
				1.5,
			),
		).toContain('has no compiled form');
	});

	it('draws an integer for randomInt of n8n-workflow, and refuses limits that are not in order', async () => {
		const imports = "import { randomInt } from 'n8n-workflow';";
		const body = 'returnData.push({ json: { r: randomInt(value) } });';
		const result = probe(body, undefined, imports);
		expect(result.errors).toEqual([]);
		expect(result.source).toContain('__randomIntOf(');
		expect(
			probe('returnData.push({ json: { r: randomInt(100) } });', undefined, imports).randoms,
		).toEqual([{ kind: 'integer', min: 0, max: 100 }]);
		const nodes = { 'nodes/compiled-node.ts': result.source ?? '' };
		const ok = await runReference(workflowSource([3, 3, 3, 3]), fixtureOf(1), { nodes });
		for (const row of rowsOf(ok.result)) expect([0, 1, 2]).toContain(row.r);
		for (const input of [0, -4, 1.5]) {
			const failed = await runReference(workflowSource([input]), fixtureOf(1), { nodes });
			expect(failed.status).toBe('error');
			expect(JSON.stringify(failed.result)).toContain('has no compiled form');
		}
	});

	it('uses the random source for Math.random', async () => {
		const made = await values('returnData.push({ json: { r: Math.random() } });', inputs(8));
		for (const value of made) {
			expect(typeof value === 'number' && value >= 0 && value < 1).toBe(true);
		}
		expect(new Set(made).size).toBe(8);
	});

	it('lists the shapes of the random values of the module', async () => {
		const { randoms } = await run(
			'returnData.push({ json: { r: [randomUUID(), randomInt(100), randomInt(2, 9), randomInt(value, 9), Math.random()] } });',
			[1],
		);
		expect(randoms).toEqual([
			{ kind: 'uuid' },
			{ kind: 'integer', min: 0, max: 100 },
			{ kind: 'integer', min: 2, max: 9 },
			{ kind: 'integer' },
			{ kind: 'number' },
		]);
		expect(probe('returnData.push({ json: { r: value } });').randoms).toEqual([]);
	});

	it('keeps random bytes an error', () => {
		const result = probe("returnData.push({ json: { r: randomBytes(8).toString('hex') } });");
		expect(result.errors.join('\n')).toContain(
			"'randomBytes' comes from the package 'crypto', which has no compiled form",
		);
	});

	it('refuses a random value in the code of a credential', () => {
		const node = `export class Probe {
	async execute(this: any) {
		const response = await this.helpers.httpRequestWithAuthentication.call(this, 'probeApi', { method: 'GET', url: 'https://example.test/' });
		return [this.helpers.returnJsonArray(response)];
	}
}`;
		const credential = `import { randomUUID } from 'crypto';
export class ProbeApi {
	name = 'probeApi';
	async authenticate(credentials: any, requestOptions: any) {
		requestOptions.headers = { ...requestOptions.headers, 'x-nonce': randomUUID(), authorization: credentials.token };
		return requestOptions;
	}
}`;
		const result = specialiseNode({
			type: 'n8n-nodes-base.probe',
			version: 1,
			entry: ENTRY,
			readFile: (path) => (path === ENTRY ? node : path === CREDENTIAL ? credential : undefined),
			parameters: {},
			aliases: {},
			instanceId: null,
			credentialEntry: (type) => (type === 'probeApi' ? CREDENTIAL : undefined),
			credentialFields: { probeApi: { token: 'secret' } },
		});
		expect(result.errors.join('\n')).toContain(
			'a random value in credential code has no compiled form',
		);
	});
});

describe('a pause in compiled node code', () => {
	const pause = (argument: string) =>
		`await sleep(${argument}); const response = await this.helpers.httpRequest({ method: 'GET', url: 'https://example.test/' }); returnData.push({ json: { r: response.ok } });`;

	it('suspends for the duration and keeps the responses for the requests', async () => {
		const { reference } = await run(pause('value'), [250, 50]);
		expect(reference.status).toBe('ok');
		expect(reference.result).toEqual({ rows: [{ r: true }, { r: true }], now: 300 });
		expect(reference.effects.map((effect) => effect.kind)).toEqual([
			'wait',
			'http',
			'wait',
			'http',
		]);
		expect(reference.effects[0].args).toEqual({ duration: 250 });
	});

	it('waits as the timer of Node.js does for a duration that is not valid', async () => {
		const durations = async (list: unknown[]) => {
			const { reference } = await run(
				'await sleep(value); returnData.push({ json: { r: 1 } });',
				list,
			);
			expect(reference.status).toBe('ok');
			return reference.effects.map((effect) => effect.args);
		};
		expect(await durations([0, -5, 0.4, '300', 1500.7, 2 ** 31, null, 'soon'])).toEqual(
			[1, 1, 1, 300, 1500, 1, 1, 1].map((duration) => ({ duration })),
		);
	});

	it('keeps a pause with an abort signal an error', () => {
		const result = probe('await sleep(value, undefined); returnData.push({ json: { r: 1 } });');
		expect(result.errors.join('\n')).toContain("'sleep' comes from the package 'n8n-workflow'");
	});

	it('binds sleep of @n8n/utils', async () => {
		const result = probe(
			'await sleep(20); returnData.push({ json: { r: 1 } });',
			undefined,
			"import { sleep } from '@n8n/utils/sleep';",
		);
		expect(result.errors).toEqual([]);
		expect(result.source).toContain('ctx.wait({ duration:');
	});
});

describe('run facts in compiled node code', () => {
	const facts: PublishFacts = {
		workflow: { id: 'wf-1', name: 'Orders', active: true },
		instanceBaseUrl: 'https://n8n.example.test/',
	};
	const body =
		'const { id } = this.getWorkflow(); returnData.push({ json: { r: [id, this.getWorkflow().name, this.getWorkflow().active, `${this.getInstanceBaseUrl()}workflow/${id}`] } });';

	it('binds the workflow and the base URL of the instance', async () => {
		const { reference } = await run(body, [0], 1, facts);
		expect(rowsOf(reference.result)).toEqual([
			{ r: ['wf-1', 'Orders', true, 'https://n8n.example.test/workflow/wf-1'] },
		]);
	});

	it('keeps the error when the caller gives no facts', () => {
		const errors = probe(body).errors.join('\n');
		expect(errors).toContain("'this.getWorkflow' has no compiled form");
		expect(errors).toContain("'this.getInstanceBaseUrl' has no compiled form");
	});

	it('binds only the facts that the caller gives', () => {
		const some: PublishFacts = { workflow: { id: 'wf-1' } };
		expect(probe('returnData.push({ json: { r: this.getWorkflow().id } });', some).errors).toEqual(
			[],
		);
		for (const read of [
			'this.getWorkflow().name',
			'this.getWorkflow().active',
			'this.getWorkflow()',
			'Object.keys(this.getWorkflow())',
		]) {
			expect(probe(`returnData.push({ json: { r: ${read} } });`, some).errors.join('\n')).toContain(
				"'this.getWorkflow' has no compiled form",
			);
		}
		expect(
			probe(
				'const { id, name } = this.getWorkflow(); returnData.push({ json: { r: id } });',
				some,
			).errors.join('\n'),
		).toContain("'this.getWorkflow' has no compiled form");
	});

	it('keeps the mode and the execution id an error', () => {
		const errors = probe(
			'returnData.push({ json: { r: [this.getMode(), this.getExecutionId()] } });',
			facts,
		).errors.join('\n');
		expect(errors).toContain("'this.getMode' has no compiled form");
		expect(errors).toContain("'this.getExecutionId' has no compiled form");
	});
});
