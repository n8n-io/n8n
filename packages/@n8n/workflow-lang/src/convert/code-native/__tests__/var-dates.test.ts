/**
 * A Date in a `var` variable of a native Code node, checked against the real task runner.
 *
 * A `var` name is hoisted and has no Date type, so it must hold a Date value. Each case runs
 * native in the bytecode VM and as a Code node in n8n's engine with its task runner process,
 * on the same items. The results must be equal, or the translation must refuse the code.
 *
 * The cases are made up. Without the built n8n CLI and task runner packages the suite is
 * skipped.
 */
import { beforeAll, describe, expect, it } from 'vitest';

import { useUtc } from '../../../reference/runner.ts';
import { nativeCode, runnerCode, startRunner, taskRunnerAvailable } from './runner-oracle.ts';

useUtc();

const ITEMS = [{ t: '2024-03-05T10:20:30Z' }];
const MS = 1709634030000;

const CASES: Array<[string, string]> = [
	[
		'var with a Date at the top level',
		`function p(x){return (x<10?'0':'')+x;}\nvar d=new Date(${MS}+3*3600*1000);\nvar s=d.getUTCFullYear()+'-'+p(d.getUTCMonth()+1)+'-'+p(d.getUTCDate());\nreturn [{json:{s}}];`,
	],
	[
		'var with a Date in a block',
		"var v = $input.first().json.t; var out = v;\nif (v) {\n  var d = new Date(v);\n  out = String(d.getDate()).padStart(2, '0') + '/' + (d.getMonth()+1) + '/' + d.getFullYear();\n}\nreturn [{json:{out}}];",
	],
	[
		'var with a Date in a function',
		"function f(v){ var d = new Date(String(v||'')); return isNaN(d.getTime()) ? '' : d.toISOString(); }\nreturn [{json:{a:f($input.first().json.t), b:f(null)}}];",
	],
	[
		'var with a Date in a loop',
		`var out=[]; for (var i=0;i<2;i++){ var d = new Date(${MS} + i*86400000); out.push(d.getUTCDate()); } return [{json:{out}}];`,
	],
	[
		'var with a Date that gets a new Date',
		`var d = new Date(${MS}); d = new Date(d.getTime()+86400000); return [{json:{a:d.toISOString()}}];`,
	],
	[
		'var with a Date as a value',
		`var d = new Date(${MS}); return [{json:{d, s: JSON.stringify(d), t: typeof d, e: String(d)}}];`,
	],
	[
		'var with a Date as an argument',
		`function f(d){ return d.getUTCFullYear(); } var x = new Date(${MS}); return [{json:{a:f(x), b:f(new Date(0))}}];`,
	],
	[
		'var without a value, then a Date',
		'var d; d = new Date($input.first().json.t); return [{json:{a:d.getUTCHours()}}];',
	],
];

describe.runIf(taskRunnerAvailable)('a Date in a var variable', () => {
	beforeAll(async () => await startRunner(), 120_000);

	it.each(CASES)(
		'%s',
		async (_name, code) => {
			const v1 = await runnerCode(code, 'all', ITEMS);
			let native: unknown;
			try {
				native = nativeCode(code, 'all', ITEMS);
			} catch {
				return;
			}
			expect(native).toEqual(v1);
		},
		60_000,
	);

	it('compiles the common forms', () => {
		for (const [, code] of CASES.slice(0, 3)) {
			expect(nativeCode(code, 'all', ITEMS).ok).toBe(true);
		}
	});
});
