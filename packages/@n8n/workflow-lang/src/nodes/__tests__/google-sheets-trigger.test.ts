/**
 * Poll equivalence of the compiled Google Sheets Trigger, event `rowAdded`
 * (`nodes/google-sheets-trigger.ts`), and the v1 node (spec section 9.8).
 *
 * A fake spreadsheet answers the Sheets API. Each case is a timeline: rows
 * arrive, then a poll runs. The v1 `poll` (built `n8n-nodes-base`, production
 * mode) runs first and its requests and answers are recorded; the library
 * poll then runs in the reference runner and the bytecode VM with the
 * recorded answers. All must send the same requests, give the same rows and
 * leave the same static data.
 */
import { existsSync } from 'node:fs';
import { createRequire } from 'node:module';
import { join } from 'node:path';

import { compile } from '../../compiler/index.ts';
import { decodeModule } from '../../compiler/decode.ts';
import { DEFAULT_NODE_PACKAGES } from '../../credentials/types.ts';
import type { Fixture } from '../../reference/runner.ts';
import { jsonCopy, runReference } from '../../reference/runner.ts';
import { runModule } from '../../testing/vm.ts';

type Json = Record<string, unknown>;
const isRecord = (v: unknown): v is Json =>
	typeof v === 'object' && v !== null && !Array.isArray(v);

const nodesBase = DEFAULT_NODE_PACKAGES[0];
const built = existsSync(join(nodesBase, 'dist/nodes/Google/Sheet/GoogleSheetsTrigger.node.js'));
const NODE = 'Google Sheets Trigger';

interface Answer {
	status: number;
	headers: Record<string, string>;
	body: unknown;
}

/** One spreadsheet with two sheets. Rows are arrays; row 1 is the header. */
class Spreadsheet {
	sheets: Record<string, { id: number; rows: unknown[][] }> = {
		Orders: { id: 0, rows: [['id', 'customer', 'amount']] },
		Archive: { id: 7, rows: [['id', 'note']] },
	};

	answer(url: string, qs: Json): Answer {
		const path = decodeURIComponent(
			url.replace(/^https:\/\/sheets\.googleapis\.com\/v4\/spreadsheets\/[^/]+/, ''),
		);
		if (path === '') {
			return {
				status: 200,
				headers: {},
				body: {
					sheets: Object.entries(this.sheets).map(([title, s]) => ({
						properties: {
							sheetId: s.id,
							title,
							index: s.id,
							sheetType: 'GRID',
							gridProperties: { rowCount: 1000, columnCount: 26 },
						},
					})),
				},
			};
		}
		// /values/<sheet>!<from><row>:<to>[<row>]
		const m = /^\/values\/([^!]+)!([A-Z]+)(\d*):([A-Z]+)(\d*)$/.exec(path);
		if (!m) return { status: 400, headers: {}, body: { error: { message: `bad range ${path}` } } };
		const sheet = this.sheets[m[1]];
		const first = m[3] ? Number(m[3]) : 1;
		const last = m[5] ? Number(m[5]) : sheet.rows.length;
		const values = sheet.rows.slice(first - 1, last);
		void qs;
		return {
			status: 200,
			headers: {},
			body: {
				range: `${m[1]}!A1:Z9`,
				majorDimension: 'ROWS',
				...(values.length ? { values } : {}),
			},
		};
	}
}

function v1Trigger(): { poll: (this: unknown) => Promise<unknown> } {
	const req = createRequire(join(nodesBase, 'package.json'));
	const mod = req('./dist/nodes/Google/Sheet/GoogleSheetsTrigger.node.js') as {
		GoogleSheetsTrigger: new () => { poll: (this: unknown) => Promise<unknown> };
	};
	return new mod.GoogleSheetsTrigger();
}

async function pollV1(parameters: Json, staticData: Json, sheet: Spreadsheet) {
	const requests: Array<{ method: string; url: string; qs: unknown }> = [];
	const answers: Answer[] = [];
	const node = {
		id: '1',
		name: NODE,
		type: 'n8n-nodes-base.googleSheetsTrigger',
		typeVersion: 1,
		position: [0, 0],
		parameters,
	};
	const context = {
		getNode: () => node,
		getMode: () => 'trigger',
		getWorkflowStaticData: () => {
			const key = `node:${NODE}`;
			if (!isRecord(staticData[key])) staticData[key] = {};
			return staticData[key];
		},
		getNodeParameter: (name: string, fallback?: unknown, opts?: { extractValue?: boolean }) => {
			const value = name in parameters ? parameters[name] : fallback;
			return opts?.extractValue && isRecord(value) ? value.value : value;
		},
		logger: { warn: () => {}, error: () => {}, debug: () => {}, info: () => {} },
		helpers: {
			returnJsonArray: (data: unknown[]) => data.map((json) => ({ json })),
			requestOAuth2: async (_type: string, options: Json) => {
				const qs = isRecord(options.qs) ? options.qs : {};
				const request = {
					method: String(options.method),
					url: String(options.uri),
					qs: jsonCopy(qs),
				};
				requests.push(request);
				const answer = sheet.answer(request.url, qs);
				answers.push(structuredClone(answer));
				if (answer.status >= 400) throw new Error(`HTTP ${answer.status}`);
				return answer.body;
			},
		},
	};
	const out = await v1Trigger().poll.call(context);
	const items = Array.isArray(out) && Array.isArray(out[0]) ? out[0].map((i: Json) => i.json) : [];
	return { items: jsonCopy(items) as unknown[], requests, answers };
}

function librarySource(parameters: Json): string {
	return `import { schedule, workflow } from '@n8n/workflow-lang';

export default workflow({
	triggers: [schedule({ cron: '* * * * *', poll: true })],
	credentials: { c: { type: 'googleSheetsTriggerOAuth2Api' } },
	async run(ctx) {
		return await ctx.node({
			name: ${JSON.stringify(NODE)},
			type: 'n8n-nodes-base.googleSheetsTrigger',
			typeVersion: 1,
			parameters: ${JSON.stringify({ ...parameters, pollNode: NODE })},
			credential: 'c',
		});
	},
});
`;
}

interface Step {
	sheet?: string;
	add?: unknown[][];
	/** Parameters for this poll and the ones after it (a changed sheet). */
	parameters?: Json;
}

const base = {
	authentication: 'triggerOAuth2',
	event: 'rowAdded',
	documentId: { __rl: true, mode: 'id', value: '1AbCdEfGhIjKlMnOpQrStUvWxYz012345' },
	sheetName: { __rl: true, mode: 'list', value: 'gid=0' },
	options: {},
};

const CASES: Array<{ name: string; parameters: Json; steps: Step[] }> = [
	{
		name: 'rows added over polls; the first poll only counts',
		parameters: base,
		steps: [
			{ add: [['1', 'Ada', 10]] },
			{
				add: [
					['2', 'Bob', 0],
					['3', '', 30],
				],
			},
			{},
			{ add: [['4', 'Cy', 40]] },
		],
	},
	{
		name: 'a sheet by name, a header row and a first data row, and options',
		parameters: {
			...base,
			sheetName: { __rl: true, mode: 'name', value: 'Orders' },
			options: {
				valueRender: 'FORMATTED_VALUE',
				dateTimeRenderOption: 'SERIAL_NUMBER',
				dataLocationOnSheet: {
					values: { rangeDefinition: 'specifyRange', headerRow: '1', firstDataRow: '3' },
				},
			},
		},
		steps: [{ add: [['1', 'Ada', 10]] }, { add: [['2', 'Bob', 20]] }, { add: [['3', 'Cy', 30]] }],
	},
	{
		name: 'a range in A1 notation',
		parameters: {
			...base,
			options: {
				dataLocationOnSheet: { values: { rangeDefinition: 'specifyRangeA1', range: 'A1:B' } },
			},
		},
		steps: [{ add: [['1', 'Ada', 10]] }, { add: [['2', 'Bob', 20]] }],
	},
	{
		name: 'another sheet starts over',
		parameters: base,
		steps: [
			{ add: [['1', 'Ada', 10]] },
			{ add: [['2', 'Bob', 20]] },
			{
				sheet: 'Archive',
				add: [['a1', 'kept']],
				parameters: { ...base, sheetName: { __rl: true, mode: 'id', value: '7' } },
			},
			{ sheet: 'Archive', add: [['a2', 'new']] },
		],
	},
];

describe.runIf(built)('Google Sheets Trigger poll (rowAdded): compiled library vs v1', () => {
	describe.each(CASES)('$name', (c) => {
		it('sends the same requests, gives the same rows and keeps the same static data', async () => {
			const sheet = new Spreadsheet();
			const staticV1: Json = {};
			let staticLib: Json = {};
			let parameters = c.parameters;
			const delivered: unknown[] = [];
			for (const [n, step] of c.steps.entries()) {
				if (step.parameters) parameters = step.parameters;
				sheet.sheets[step.sheet ?? 'Orders'].rows.push(...(step.add ?? []));
				const v1 = await pollV1(parameters, staticV1, sheet);
				const source = librarySource(parameters);
				const compiled = compile(source);
				expect(compiled.diagnostics).toEqual([]);
				const fixture: Fixture = {
					trigger: { scheduledAt: 0 },
					now: 1_731_400_000_000,
					seed: 1,
					effects: { [NODE]: v1.answers },
					staticData: staticLib,
				};
				const reference = await runReference(source, fixture);
				expect(reference.status, `poll ${n}`).toBe('ok');
				const requests = reference.effects.map((e) => {
					const args = isRecord(e.args) ? e.args : {};
					return {
						method: String(args.method),
						url: String(args.url),
						qs: jsonCopy(args.qs ?? {}),
					};
				});
				expect(requests, `requests of poll ${n}`).toEqual(v1.requests);
				expect(reference.result, `rows of poll ${n}`).toEqual(v1.items);
				expect(reference.staticData, `static data after poll ${n}`).toEqual(jsonCopy(staticV1));
				const bytecode = runModule(decodeModule(compiled.module ?? new Uint8Array()), fixture);
				expect(JSON.stringify(bytecode), `bytecode of poll ${n}`).toBe(JSON.stringify(reference));
				staticLib = reference.staticData ?? {};
				delivered.push(...v1.items);
			}
			expect(delivered.length).toBeGreaterThan(0);
		});
	});
});
