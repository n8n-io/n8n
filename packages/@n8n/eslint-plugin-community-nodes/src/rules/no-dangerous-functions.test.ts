import { RuleTester } from '@typescript-eslint/rule-tester';

import { NoDangerousFunctionsRule } from './no-dangerous-functions.js';

const ruleTester = new RuleTester();

ruleTester.run('no-dangerous-functions', NoDangerousFunctionsRule, {
	valid: [
		// `exec`/`spawn` not originating from `child_process` must not be flagged.
		{ name: 'regex exec', code: 'const match = /foo/.exec(input);' },
		{ name: 'regex exec via variable', code: 'regex.exec(input);' },
		{ name: 'unrelated exec member', code: 'db.exec("SELECT 1");' },
		{ name: 'unrelated spawn member', code: 'queue.spawn(job);' },
		{ name: 'locally declared exec', code: 'function exec() {} exec();' },
		// Importing without calling is fine.
		{ name: 'import without call', code: "import { exec } from 'child_process';" },
		// Non-dangerous members of the namespace import are fine.
		{
			name: 'non-dangerous namespace member',
			code: "import * as cp from 'child_process'; const p = cp.execPath;",
		},
		// `eval`/`Function` as identifier references (not calls) are fine.
		{ name: 'eval reference only', code: 'const f = eval;' },
		{ name: 'Function reference only', code: 'const F = Function;' },
		// Non-child_process module is irrelevant.
		{
			name: 'spawn from unrelated module',
			code: "import { spawn } from 'some-lib'; spawn('x');",
		},
	],
	invalid: [
		{
			name: 'SECURITY: eval call',
			code: "eval('1 + 1');",
			errors: [{ messageId: 'noEval' }],
		},
		{
			name: 'SECURITY: Function constructor with new',
			code: "const fn = new Function('return process');",
			errors: [{ messageId: 'noFunctionConstructor' }],
		},
		{
			name: 'SECURITY: Function constructor without new',
			code: "const fn = Function('return 1');",
			errors: [{ messageId: 'noFunctionConstructor' }],
		},
		{
			name: 'SECURITY: exec from child_process',
			code: "import { exec } from 'child_process'; exec('ls');",
			errors: [{ messageId: 'noChildProcess', data: { name: 'exec' } }],
		},
		{
			name: 'SECURITY: aliased exec from node:child_process',
			code: "import { exec as run } from 'node:child_process'; run('ls');",
			errors: [{ messageId: 'noChildProcess', data: { name: 'exec' } }],
		},
		{
			name: 'SECURITY: spawn from child_process',
			code: "import { spawn } from 'child_process'; spawn('ls', ['-la']);",
			errors: [{ messageId: 'noChildProcess', data: { name: 'spawn' } }],
		},
		{
			name: 'SECURITY: namespace execSync',
			code: "import * as cp from 'child_process'; cp.execSync('ls');",
			errors: [{ messageId: 'noChildProcess', data: { name: 'execSync' } }],
		},
		{
			name: 'SECURITY: default import spawnSync',
			code: "import childProcess from 'node:child_process'; childProcess.spawnSync('ls');",
			errors: [{ messageId: 'noChildProcess', data: { name: 'spawnSync' } }],
		},
		{
			name: 'SECURITY: destructured require execFile',
			code: "const { execFile } = require('child_process'); execFile('ls');",
			errors: [{ messageId: 'noChildProcess', data: { name: 'execFile' } }],
		},
		{
			name: 'SECURITY: namespace require fork',
			code: "const cp = require('node:child_process'); cp.fork('./worker.js');",
			errors: [{ messageId: 'noChildProcess', data: { name: 'fork' } }],
		},
	],
});
