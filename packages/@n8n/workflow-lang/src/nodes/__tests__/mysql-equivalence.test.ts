/**
 * Equivalence of the MySQL library node and the v1 node.
 *
 * With `MYSQL_TEST_PORT` set and a database there (`MYSQL_TEST_HOST`, `MYSQL_TEST_DATABASE`,
 * `MYSQL_TEST_USER`, `MYSQL_TEST_PASSWORD`; the test makes and drops the tables `mycase_*`),
 * each case runs the v1 node with its real driver in n8n's engine (`WorkflowExecute`, which
 * loads the node as n8n does), then the converted workflow with the library node. A
 * reference implementation of the `sql` effect on mysql2 answers the library node
 * (`mysql-reference.ts`). The test compares the output or the error, and the tables after
 * the run. `MYSQL_RECORD=1` writes `mysql-recordings.json`: what v1 gave, the `sql` calls of
 * the library node and their results.
 *
 * Without a database, the test runs the library node on the recorded results and checks
 * its `sql` calls and its output against the recording, in the reference runner and in the
 * bytecode VM.
 */
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { compile } from '../../compiler/index.ts';
import { decodeModule } from '../../compiler/decode.ts';
import { convertWorkflow } from '../../convert/index.ts';
import type { EffectRecord, Fixture } from '../../reference/runner.ts';
import { runReference } from '../../reference/runner.ts';
import { runModule } from '../../testing/vm.ts';
import type { MysqlCase } from './mysql-cases.ts';
import { MYSQL_CASES, MYSQL_SETUP, MYSQL_STATE } from './mysql-cases.ts';
import { mysqlReachable, runMysqlEffect, runMysqlTexts } from './mysql-reference.ts';
import { recordV1, recorderAvailable } from './v1-recorder.ts';

const here = dirname(fileURLToPath(import.meta.url));
const recordingFile = join(here, 'mysql-recordings.json');
const NODE = 'Node';
const HOST_NODE = 'Node (fallback host)';
const TYPE = 'n8n-nodes-base.mySql';

interface SqlCallRecord {
	args: unknown;
	result: unknown;
}

interface MysqlRecording {
	/** The output items of the v1 node, or its error message. */
	v1: { output?: unknown; error?: string };
	/** The tables after the run of the v1 node. */
	state: string[];
	/** The `sql` calls of the library node, with the results of the database. */
	calls: SqlCallRecord[];
	/** The library node sent the call to the fallback host. */
	host?: boolean;
}

const credential = {
	host: process.env.MYSQL_TEST_HOST ?? '127.0.0.1',
	port: Number(process.env.MYSQL_TEST_PORT ?? 5545),
	database: process.env.MYSQL_TEST_DATABASE ?? 'card',
	user: process.env.MYSQL_TEST_USER ?? 'root',
	password: process.env.MYSQL_TEST_PASSWORD ?? 'cardmy',
	connectTimeout: 10000,
	ssl: false,
	sshTunnel: false,
};

const live =
	process.env.MYSQL_TEST_PORT !== undefined &&
	recorderAvailable() &&
	(await mysqlReachable(credential));
const record = live && process.env.MYSQL_RECORD === '1';
const stored: Record<string, MysqlRecording> = existsSync(recordingFile)
	? JSON.parse(readFileSync(recordingFile, 'utf8'))
	: {};
const written: Record<string, MysqlRecording> = {};

function jsonCopy<T>(value: T): T {
	return JSON.parse(JSON.stringify(value));
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * A copy with a fixed address in the message of a refused login: the server writes the
 * address of the client, which is not the same on each machine.
 */
function withoutClientAddress(value: unknown): unknown {
	if (typeof value === 'string') return value.replace(/'@'[0-9a-f.:]+'/g, "'@'client'");
	if (Array.isArray(value)) return value.map(withoutClientAddress);
	if (!isRecord(value)) return value;
	const out: Record<string, unknown> = {};
	for (const [key, member] of Object.entries(value)) out[key] = withoutClientAddress(member);
	return out;
}

function workflowOf(c: MysqlCase) {
	return {
		name: 'MySQL',
		nodes: [
			{
				name: 'Hook',
				type: 'n8n-nodes-base.webhook',
				typeVersion: 2,
				position: [0, 0],
				parameters: { path: 'p', httpMethod: 'POST' },
			},
			{
				name: 'Split',
				type: 'n8n-nodes-base.splitOut',
				typeVersion: 1,
				position: [200, 0],
				parameters: { fieldToSplitOut: 'body.rows', options: {} },
			},
			{
				name: NODE,
				type: TYPE,
				typeVersion: c.typeVersion,
				position: [400, 0],
				parameters: c.parameters,
				credentials: { mySql: { id: '1', name: 'my' } },
				...(c.onError ? { onError: c.onError } : {}),
			},
		],
		connections: {
			Hook: { main: [[{ node: 'Split', type: 'main', index: 0 }]] },
			Split: { main: [[{ node: NODE, type: 'main', index: 0 }]] },
		},
	};
}

function sourceOf(c: MysqlCase): string {
	const out = convertWorkflow(workflowOf(c), { mysql: true, trace: 'all' });
	expect(out.ok).toBe(true);
	return out.source;
}

function fixtureOf(c: MysqlCase, effects: Record<string, unknown[]>): Fixture {
	return {
		trigger: { body: { rows: c.items ?? [{}] }, headers: {}, query: {} },
		now: 0,
		seed: 1,
		effects,
		trace: true,
	};
}

interface Outcome {
	output?: unknown;
	error?: string;
	host: boolean;
	sql: EffectRecord[];
}

/** What a run of the converted workflow gave for the node. */
function outcomeOf(run: Awaited<ReturnType<typeof runReference>>): Outcome {
	const sql = run.effects.filter((e) => e.kind === 'sql');
	const host = run.effects.some((e) => e.kind === 'node' && e.step === HOST_NODE);
	if (run.status !== 'ok') {
		const message = isRecord(run.result) ? String(run.result.message) : String(run.result);
		return { error: message, host, sql };
	}
	const traced = [...(run.trace ?? [])]
		.reverse()
		.find((t) => t.step === NODE && Array.isArray(t.items));
	return { output: Array.isArray(traced?.items) ? traced.items : [], host, sql };
}

/** The answer of the fallback host for the node of a case. The test does not compare it. */
function hostAnswer(v1: MysqlRecording['v1']): unknown {
	if (v1.error !== undefined) return { $error: v1.error };
	return v1.output;
}

async function reset(): Promise<void> {
	const out = await runMysqlTexts(credential, MYSQL_SETUP);
	expect(out.filter((text) => text.startsWith('error:'))).toEqual([]);
}

/** Runs the v1 node and the library node on the database, and compares them. */
async function runLive(c: MysqlCase): Promise<MysqlRecording> {
	await reset();
	const before = await runMysqlTexts(credential, MYSQL_STATE);
	const used = { ...credential, ...c.credential };
	const v1 = await recordV1({
		name: c.name,
		type: TYPE,
		typeVersion: c.typeVersion,
		parameters: c.parameters,
		items: c.items,
		credential: { type: 'mySql', data: used },
		responses: [],
		settings: {},
	});
	const v1State = await runMysqlTexts(credential, MYSQL_STATE);
	const expected: MysqlRecording['v1'] = jsonCopy(
		withoutClientAddress(
			v1.error === undefined ? { output: (v1.outputs ?? [])[0] ?? [] } : { error: v1.error },
		),
	) as MysqlRecording['v1'];

	await reset();
	const calls: SqlCallRecord[] = [];
	let stateAtHost: string[] | undefined;
	const run = await runReference(sourceOf(c), fixtureOf(c, {}), {
		answer: async (effect) => {
			if (effect.kind === 'sql') {
				let result: unknown;
				try {
					result = await runMysqlEffect(effect.args, used);
				} catch (error) {
					result = { $error: error instanceof Error ? error.message : String(error) };
				}
				const call = { args: effect.args, result: withoutClientAddress(jsonCopy(result)) };
				calls.push(call);
				return jsonCopy(call.result);
			}
			if (effect.kind === 'node' && effect.step === HOST_NODE) {
				// The host runs the v1 node: the tables must be as they were before the node.
				stateAtHost = await runMysqlTexts(credential, MYSQL_STATE);
				return hostAnswer(expected);
			}
			return undefined;
		},
	});
	const outcome = outcomeOf(run);
	if (c.host === true) {
		expect(outcome.host).toBe(true);
		expect(stateAtHost).toEqual(before);
	} else {
		expect(outcome.host).toBe(false);
		expect({ output: outcome.output, error: outcome.error }).toEqual({
			output: expected.output,
			error: expected.error,
		});
		expect(await runMysqlTexts(credential, MYSQL_STATE)).toEqual(v1State);
	}
	return { v1: expected, state: v1State, calls, ...(c.host === true ? { host: true } : {}) };
}

describe('MySQL library node and the v1 node', () => {
	afterAll(() => {
		if (!record) return;
		// A run of some cases (`-t`) keeps the recordings of the other cases.
		const kept: Record<string, MysqlRecording> = {};
		for (const c of MYSQL_CASES) {
			const recording = written[c.name] ?? stored[c.name];
			if (c.convertHost !== true && recording !== undefined) kept[c.name] = recording;
		}
		writeFileSync(recordingFile, `${JSON.stringify(kept, null, '\t')}\n`);
	});

	describe.each(MYSQL_CASES.map((c) => ({ ...c, label: c.name })))('$label', (c) => {
		if (c.convertHost === true) {
			it('stays in the fallback host', () => {
				const out = convertWorkflow(workflowOf(c), { mysql: true });
				expect(out.ok).toBe(true);
				expect(out.source).toContain("host: 'fallback'");
				expect(out.source).not.toContain('batch:');
			});
			return;
		}

		it.runIf(live)(
			'gives the result of v1 on a database',
			async () => {
				const recording = await runLive(c);
				written[c.name] = recording;
				if (!record) expect(recording).toEqual(stored[c.name]);
			},
			60_000,
		);

		it.skipIf(record)(
			'makes the recorded calls and gives the recorded result',
			async () => {
				const recording = stored[c.name];
				expect(recording).toBeDefined();
				const source = sourceOf(c);
				const compiled = compile(source);
				expect(compiled.diagnostics).toEqual([]);
				const fixture = fixtureOf(c, {
					[NODE]: recording.calls.map((call) => call.result),
					[HOST_NODE]: [hostAnswer(recording.v1)],
				});
				const run = await runReference(source, fixture);
				const outcome = outcomeOf(run);
				expect(outcome.sql.map((e) => e.args)).toEqual(recording.calls.map((call) => call.args));
				expect(outcome.host).toBe(recording.host === true);
				if (recording.host !== true) {
					expect({ output: outcome.output, error: outcome.error }).toEqual({
						output: recording.v1.output,
						error: recording.v1.error,
					});
				}
				const bytecode = runModule(decodeModule(compiled.module ?? new Uint8Array()), fixture);
				expect(JSON.stringify(bytecode)).toBe(JSON.stringify(run));
			},
			60_000,
		);
	});

	it('holds the text of the formatter that is proven against mysql2 and the v1 node', () => {
		const block = (text: string) =>
			text.slice(text.indexOf('// mysql-format:begin'), text.indexOf('// mysql-format:end'));
		const shared = readFileSync(join(here, '../shared/mysql-format.ts'), 'utf8');
		const node = readFileSync(join(here, '../mysql.ts'), 'utf8');
		const expected = block(shared).replace(/^export /gm, '');
		expect(expected.length).toBeGreaterThan(5000);
		expect(block(node)).toBe(expected);
	});

	it('has a recording for each case, and no other', () => {
		if (record) return;
		const names = MYSQL_CASES.filter((c) => c.convertHost !== true).map((c) => c.name);
		expect(new Set(names).size).toBe(names.length);
		expect(Object.keys(stored).sort()).toEqual([...names].sort());
	});

	it('without the MySQL client of the runtime, the node stays in the fallback host', () => {
		const out = convertWorkflow(workflowOf(MYSQL_CASES[0]), { sql: true });
		expect(out.ok).toBe(true);
		expect(out.source).toContain("host: 'fallback'");
		expect(out.source).not.toContain('batch:');
	});
});
