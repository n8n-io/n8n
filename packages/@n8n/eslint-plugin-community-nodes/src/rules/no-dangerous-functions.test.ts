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
		// Computed access and inline module expressions must stay scoped to
		// `child_process` — unrelated objects and modules are not the target.
		{ name: 'computed exec on unrelated object', code: "db['exec']('SELECT 1');" },
		{ name: 'computed exec on unrelated module', code: "require('sqlite')['exec']('SELECT 1');" },
		{
			name: 'inline require of unrelated module',
			code: "require('node:fs').readFileSync('a.txt');",
		},
		{
			name: 'dynamic import of unrelated module',
			code: "async function run() { const lib = await import('some-lib'); lib.spawn('x'); }",
		},
		{
			name: 'dynamic member access is not statically knowable',
			code: "const cp = require('child_process'); cp[name]('ls');",
		},
		{
			name: 'non-dangerous computed member on the namespace',
			code: "import * as cp from 'child_process'; const path = cp['execPath'];",
		},
		// `require.resolve` returns a path string, not the module.
		{
			name: 'binding from require.resolve',
			code: "const resolved = require.resolve('child_process'); resolved.exec('x');",
		},
		// A dynamic import that is never awaited is a Promise, not the module.
		{
			name: 'unawaited dynamic import',
			code: "const pending = import('child_process'); pending.then(handle);",
		},
		// Names are tracked in a flat, file-wide set, so aliasing a namespace to
		// another name is deliberately not followed — doing so would make every
		// unrelated binding of that name look like `child_process`.
		{
			name: 'unrelated binding reusing an aliased name',
			code: "const cp = require('child_process');\nconst alias = cp;\nfunction f(x) { const alias = getLogger(); alias.fork(x); }",
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
		// The module can be reached without ever binding it to a name, and the
		// member can be selected with a computed key. Both still spawn a process.
		{
			name: 'SECURITY: exec on an inline require',
			code: "require('child_process').exec('ls');",
			errors: [{ messageId: 'noChildProcess', data: { name: 'exec' } }],
		},
		{
			name: 'SECURITY: spawn on an inline require of node:child_process',
			code: "require('node:child_process').spawn('ls');",
			errors: [{ messageId: 'noChildProcess', data: { name: 'spawn' } }],
		},
		{
			name: 'SECURITY: computed member on a required namespace',
			code: "const cp = require('child_process'); cp['exec']('ls');",
			errors: [{ messageId: 'noChildProcess', data: { name: 'exec' } }],
		},
		{
			name: 'SECURITY: computed member on an imported namespace',
			code: "import * as cp from 'child_process'; cp[`execSync`]('ls');",
			errors: [{ messageId: 'noChildProcess', data: { name: 'execSync' } }],
		},
		{
			name: 'SECURITY: computed member on an inline require',
			code: "require('child_process')['exec']('ls');",
			errors: [{ messageId: 'noChildProcess', data: { name: 'exec' } }],
		},
		{
			name: 'SECURITY: destructured dynamic import',
			code: "async function run() { const { exec } = await import('child_process'); exec('ls'); }",
			errors: [{ messageId: 'noChildProcess', data: { name: 'exec' } }],
		},
		{
			name: 'SECURITY: namespace from dynamic import',
			code: "async function run() { const cp = await import('node:child_process'); cp.spawnSync('ls'); }",
			errors: [{ messageId: 'noChildProcess', data: { name: 'spawnSync' } }],
		},
		{
			name: 'SECURITY: member on an inline dynamic import',
			code: "async function run() { (await import('child_process')).execFile('ls'); }",
			errors: [{ messageId: 'noChildProcess', data: { name: 'execFile' } }],
		},
		// Destructuring keys can be written as literals, computed or not.
		{
			name: 'SECURITY: destructured with a string-literal key',
			code: "const { 'exec': run } = require('child_process'); run('ls');",
			errors: [{ messageId: 'noChildProcess', data: { name: 'exec' } }],
		},
		{
			name: 'SECURITY: destructured with a computed key',
			code: "const { ['exec']: run } = require('child_process'); run('ls');",
			errors: [{ messageId: 'noChildProcess', data: { name: 'exec' } }],
		},
		// Under ESM/CJS interop the namespace's `default` is the module itself.
		{
			name: 'SECURITY: interop default on an inline dynamic import',
			code: "async function run() { (await import('node:child_process')).default.exec('ls'); }",
			errors: [{ messageId: 'noChildProcess', data: { name: 'exec' } }],
		},
		{
			name: 'SECURITY: interop default on a dynamic import namespace',
			code: "async function run() { const cp = await import('child_process'); cp.default.exec('ls'); }",
			errors: [{ messageId: 'noChildProcess', data: { name: 'exec' } }],
		},
		{
			name: 'SECURITY: interop default destructured from a dynamic import',
			code: "async function run() { const { default: cp } = await import('child_process'); cp.exec('ls'); }",
			errors: [{ messageId: 'noChildProcess', data: { name: 'exec' } }],
		},
		// Expression wrappers that do not change the value being accessed.
		{
			name: 'SECURITY: sequence expression wrapper',
			code: "(0, require('child_process')).exec('ls');",
			errors: [{ messageId: 'noChildProcess', data: { name: 'exec' } }],
		},
		{
			name: 'SECURITY: as-expression wrapper',
			code: "const cp = require('child_process') as any; cp.exec('ls');",
			errors: [{ messageId: 'noChildProcess', data: { name: 'exec' } }],
		},
		{
			name: 'SECURITY: satisfies-expression wrapper',
			code: "const cp = require('child_process') satisfies unknown; cp.exec('ls');",
			errors: [{ messageId: 'noChildProcess', data: { name: 'exec' } }],
		},
		{
			name: 'SECURITY: non-null-assertion wrapper',
			code: "require('child_process')!.exec('ls');",
			errors: [{ messageId: 'noChildProcess', data: { name: 'exec' } }],
		},
		{
			name: 'SECURITY: import-equals require',
			code: "import cp = require('child_process'); cp.exec('ls');",
			errors: [{ messageId: 'noChildProcess', data: { name: 'exec' } }],
		},
		{
			name: 'SECURITY: rest element copies the module',
			code: "const { ...cp } = require('child_process'); cp.exec('ls');",
			errors: [{ messageId: 'noChildProcess', data: { name: 'exec' } }],
		},
		// Pulling a spawner out as a member, the equivalent of destructuring it.
		{
			name: 'SECURITY: member alias off an inline require',
			code: "const run = require('child_process').exec; run('ls');",
			errors: [{ messageId: 'noChildProcess', data: { name: 'exec' } }],
		},
		{
			name: 'SECURITY: member alias off a namespace',
			code: "const cp = require('child_process'); const run = cp.spawn; run('ls');",
			errors: [{ messageId: 'noChildProcess', data: { name: 'spawn' } }],
		},
	],
});
