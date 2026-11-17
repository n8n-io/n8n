/**
 * Equivalence of the Postgres library node and the v1 node.
 *
 * With `PG_TEST_PORT` set and a database there (`PG_TEST_HOST`, `PG_TEST_DATABASE`,
 * `PG_TEST_USER`, `PG_TEST_PASSWORD`; the test makes and drops the schema `pgcase`),
 * each case runs the v1 node with its real driver in n8n's engine (`WorkflowExecute`, which
 * loads the node as n8n does), then the converted workflow with
 * the library node. A reference implementation of the `sql` effect answers the library
 * node with real bind values (`sql-reference.ts`). The test compares the
 * output or the error, and the tables after the run. A case with an error setting runs
 * the v1 node in n8n's engine (`WorkflowExecute`), which makes the error items and the
 * error output. The time in an error item is compared by its form only. `PG_RECORD=1` writes
 * `postgres-recordings.json`: what v1 gave, the `sql` calls of the library
 * node and their results.
 *
 * Without a database, the test runs the library node on the recorded results
 * and checks its `sql` calls and its output against the recording, in the
 * reference runner and in the bytecode VM.
 */
import { existsSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { compile } from '../../compiler/index.ts';
import { decodeModule } from '../../compiler/decode.ts';
import { convertWorkflow } from '../../convert/index.ts';
import type { EffectRecord, Fixture } from '../../reference/runner.ts';
import { runReference, useUtc } from '../../reference/runner.ts';
import { runModule } from '../../testing/vm.ts';
import type { PostgresCase } from './postgres-cases.ts';
import { POSTGRES_CASES, POSTGRES_SETUP, POSTGRES_STATE } from './postgres-cases.ts';
import { databaseReachable, runSqlEffect, runTexts } from './sql-reference.ts';
import { recordV1, recorderAvailable } from './v1-recorder.ts';

const here = dirname(fileURLToPath(import.meta.url));
/**
 * The recordings are in `postgres-recordings.json`, `postgres-recordings-2.json` and so on:
 * the formatter of the repository refuses a file of more than 1 MiB.
 */
const RECORDING_FILE_BYTES = 900_000;
const recordingFile = (index: number) =>
	join(here, index === 0 ? 'postgres-recordings.json' : `postgres-recordings-${index + 1}.json`);

function readRecordings(): Record<string, PostgresRecording> {
	const all: Record<string, PostgresRecording> = {};
	for (let index = 0; existsSync(recordingFile(index)); index++) {
		Object.assign(all, JSON.parse(readFileSync(recordingFile(index), 'utf8')));
	}
	return all;
}

function writeRecordings(all: Record<string, PostgresRecording>): void {
	const files: Array<Record<string, PostgresRecording>> = [{}];
	let bytes = 0;
	for (const [name, recording] of Object.entries(all)) {
		const size = JSON.stringify({ [name]: recording }, null, '\t').length;
		if (bytes > 0 && bytes + size > RECORDING_FILE_BYTES) {
			files.push({});
			bytes = 0;
		}
		files[files.length - 1][name] = recording;
		bytes += size;
	}
	files.forEach((file, index) =>
		writeFileSync(recordingFile(index), `${JSON.stringify(file, null, '\t')}\n`),
	);
	for (let index = files.length; existsSync(recordingFile(index)); index++) {
		rmSync(recordingFile(index));
	}
}
const NODE = 'Node';
const HOST_NODE = 'Node (fallback host)';

interface SqlCallRecord {
	args: unknown;
	result: unknown;
}

interface PostgresRecording {
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
	host: process.env.PG_TEST_HOST ?? '127.0.0.1',
	port: Number(process.env.PG_TEST_PORT ?? 5544),
	database: process.env.PG_TEST_DATABASE ?? 'pgcard_ts',
	user: process.env.PG_TEST_USER ?? 'postgres',
	password: process.env.PG_TEST_PASSWORD ?? 'cardpg',
	ssl: 'disable',
	allowUnauthorizedCerts: false,
	sshTunnel: false,
	maxConnections: 100,
};

// The reference runner runs in UTC. The v1 node reads a time without a zone in the zone
// of its process, so both sides use UTC, as the runtime does with `--sql-timestamp-zone utc`.
useUtc();
const live =
	process.env.PG_TEST_PORT !== undefined &&
	recorderAvailable() &&
	(await databaseReachable(credential));
const record = live && process.env.PG_RECORD === '1';
const stored: Record<string, PostgresRecording> = readRecordings();
const written: Record<string, PostgresRecording> = {};

function jsonCopy<T>(value: T): T {
	return JSON.parse(JSON.stringify(value));
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * A copy without the place of the error in the source of the server (`file`, `line`,
 * `routine`): it changes with the version of the server, and the node does not read it.
 */
function withoutSourcePlace(value: unknown): unknown {
	if (Array.isArray(value)) return value.map(withoutSourcePlace);
	if (!isRecord(value)) return value;
	const out: Record<string, unknown> = {};
	for (const [key, member] of Object.entries(value)) {
		const place = key === 'file' || key === 'line' || key === 'routine';
		if (!(place && typeof value.message === 'string')) out[key] = withoutSourcePlace(member);
	}
	return out;
}

/**
 * A copy with 0 for the time of each error object of v1 (`timestamp` of a
 * NodeOperationError): the time of the run is not a part of the result.
 */
function withoutTime(value: unknown): unknown {
	if (Array.isArray(value)) return value.map(withoutTime);
	if (!isRecord(value)) return value;
	const out: Record<string, unknown> = {};
	for (const [key, member] of Object.entries(value)) {
		const time =
			key === 'timestamp' && typeof member === 'number' && value.name === 'NodeOperationError';
		out[key] = time ? 0 : withoutTime(member);
	}
	return out;
}

/** The node of a case with an error setting, as the recorder gives it to n8n's engine. */
function engineNode(c: PostgresCase) {
	return {
		id: 'step',
		name: NODE,
		type: 'n8n-nodes-base.postgres',
		typeVersion: c.typeVersion,
		position: [200, 0],
		parameters: c.parameters,
		credentials: { postgres: { id: 'case', name: 'case' } },
		...(c.onError ? { onError: c.onError } : {}),
		...c.settings,
	};
}

function workflowOf(c: PostgresCase) {
	return {
		name: 'Postgres',
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
			c.onError && c.convertHost !== true
				? engineNode(c)
				: {
						name: NODE,
						type: 'n8n-nodes-base.postgres',
						typeVersion: c.typeVersion,
						position: [400, 0],
						parameters: c.parameters,
						credentials: { postgres: { id: '1', name: 'pg' } },
						...(c.onError ? { onError: c.onError } : {}),
						...c.settings,
					},
		],
		connections: {
			Hook: { main: [[{ node: 'Split', type: 'main', index: 0 }]] },
			Split: { main: [[{ node: NODE, type: 'main', index: 0 }]] },
		},
	};
}

function sourceOf(c: PostgresCase): string {
	const out = convertWorkflow(workflowOf(c), { sql: true, trace: 'all' });
	expect(out.ok).toBe(true);
	return out.source;
}

function fixtureOf(c: PostgresCase, effects: Record<string, unknown[]>): Fixture {
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
	// The last trace of the node with items: a trace of an error of the node has none.
	const traced = [...(run.trace ?? [])]
		.reverse()
		.find((t) => t.step === NODE && Array.isArray(t.items));
	return { output: Array.isArray(traced?.items) ? traced.items : [], host, sql };
}

/** The answer of the fallback host for the node of a case. The test does not compare it. */
function hostAnswer(c: PostgresCase, v1: PostgresRecording['v1']): unknown {
	if (v1.error !== undefined) return { $error: v1.error };
	return c.onError ? [{ items: [] }] : v1.output;
}

async function reset(): Promise<void> {
	const out = await runTexts(credential, POSTGRES_SETUP);
	expect(out.filter((text) => text.startsWith('error:'))).toEqual([]);
}

/** Runs the v1 node and the library node on the database, and compares them. */
async function runLive(c: PostgresCase): Promise<PostgresRecording> {
	await reset();
	const before = await runTexts(credential, POSTGRES_STATE);
	const used = { ...credential, ...c.credential };
	// With settings, also empty ones, the recorder runs the node in n8n's engine.
	const settings = { ...(c.onError ? { onError: c.onError } : {}), ...c.settings };
	const v1 = await recordV1({
		name: c.name,
		type: 'n8n-nodes-base.postgres',
		typeVersion: c.typeVersion,
		parameters: c.parameters,
		items: c.items,
		credential: { type: 'postgres', data: used },
		responses: [],
		settings,
	});
	const v1State = await runTexts(credential, POSTGRES_STATE);
	// With an error setting: the usual output, or both outputs with the error output.
	const lists = v1.outputs ?? [];
	const engineOutput =
		c.onError === 'continueErrorOutput' ? [lists[0] ?? [], lists[1] ?? []] : (lists[0] ?? []);
	const expected: PostgresRecording['v1'] = jsonCopy(
		v1.error === undefined ? { output: withoutTime(engineOutput) } : { error: v1.error },
	);

	await reset();
	const calls: SqlCallRecord[] = [];
	let stateAtHost: string[] | undefined;
	const run = await runReference(sourceOf(c), fixtureOf(c, {}), {
		answer: async (effect) => {
			if (effect.kind === 'sql') {
				let result: unknown;
				try {
					result = await runSqlEffect(effect.args, used, { timestampZone: 'utc' });
				} catch (error) {
					result = { $error: error instanceof Error ? error.message : String(error) };
				}
				const call = { args: effect.args, result: withoutSourcePlace(jsonCopy(result)) };
				calls.push(call);
				return jsonCopy(call.result);
			}
			if (effect.kind === 'node' && effect.step === HOST_NODE) {
				// The host runs the v1 node: the tables must be as they were before the node.
				stateAtHost = await runTexts(credential, POSTGRES_STATE);
				return hostAnswer(c, expected);
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
		expect({ output: withoutTime(outcome.output), error: outcome.error }).toEqual({
			output: expected.output,
			error: expected.error,
		});
		expect(await runTexts(credential, POSTGRES_STATE)).toEqual(v1State);
	}
	return {
		v1: expected,
		state: v1State,
		calls,
		...(c.host === true ? { host: true } : {}),
	};
}

describe('Postgres library node and the v1 node', () => {
	afterAll(() => {
		if (!record) return;
		// A run of some cases (`-t`) keeps the recordings of the other cases.
		const kept: Record<string, PostgresRecording> = {};
		for (const c of POSTGRES_CASES) {
			const recording = written[c.name] ?? stored[c.name];
			if (c.convertHost !== true && recording !== undefined) kept[c.name] = recording;
		}
		writeRecordings(kept);
	});

	describe.each(POSTGRES_CASES.map((c) => ({ ...c, label: c.name })))('$label', (c) => {
		if (c.convertHost === true) {
			it('stays in the fallback host', () => {
				const out = convertWorkflow(workflowOf(c), { sql: true });
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
					[HOST_NODE]: [hostAnswer(c, recording.v1)],
				});
				const run = await runReference(source, fixture);
				const outcome = outcomeOf(run);
				expect(outcome.sql.map((e) => e.args)).toEqual(recording.calls.map((call) => call.args));
				expect(outcome.host).toBe(recording.host === true);
				if (recording.host !== true) {
					expect({ output: withoutTime(outcome.output), error: outcome.error }).toEqual({
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

	it('holds the text of the formatter that is proven against pg-promise', () => {
		const block = (text: string, end: string) =>
			text.slice(text.indexOf('// pg-format:begin'), text.indexOf(end));
		const shared = readFileSync(join(here, '../shared/pg-format.ts'), 'utf8');
		const node = readFileSync(join(here, '../postgres.ts'), 'utf8');
		// The node has the formatter up to the functions for one value, without `export`.
		const expected = block(shared, '/** `pgp.as.name(name)`').replaceAll(
			'\nexport function ',
			'\nfunction ',
		);
		expect(expected.length).toBeGreaterThan(5000);
		expect(block(node, '// pg-format:end')).toBe(expected);
	});

	it('has a recording for each case, and no other', () => {
		if (record) return;
		const names = POSTGRES_CASES.filter((c) => c.convertHost !== true).map((c) => c.name);
		expect(Object.keys(stored).sort()).toEqual([...names].sort());
	});
});
