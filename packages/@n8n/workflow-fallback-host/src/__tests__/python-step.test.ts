import { spawnSync } from 'node:child_process';

import type { JsonObject } from '../protocol';
import { runPythonStep } from '../python-step';

const hasPython = spawnSync('python3', ['--version']).status === 0;

const run = (code: string, items: JsonObject[] = []) =>
	runPythonStep({ name: 'py', code, items }, { timeoutMs: 5000 });

describe.skipIf(!hasPython)('runPythonStep', () => {
	it('runs the code as the body of a function of the items', () => {
		expect(run('return [{"n": i["n"] * 2} for i in items]', [{ n: 1 }, { n: 4 }])).toEqual([
			{ n: 2 },
			{ n: 8 },
		]);
	});

	it('unwraps n8n items', () => {
		expect(run('return [{"json": {"ok": True}}]')).toEqual([{ ok: true }]);
	});

	it('blocks imports as n8n does by default', () => {
		expect(() => run('import requests\nreturn []')).toThrow(
			"Import of external package 'requests' is disallowed. Allowed external packages: none",
		);
		expect(() => run('import os\nreturn []')).toThrow(
			"Import of standard library module 'os' is disallowed. Allowed stdlib modules: none",
		);
	});

	it('has no denied builtins', () => {
		expect(() => run('return [{"x": eval("1")}]')).toThrow("name 'eval' is not defined");
	});

	it('reports a syntax error', () => {
		expect(() => run('return [')).toThrow(/syntax error/);
	});

	it('stops code that runs too long', () => {
		expect(() =>
			runPythonStep({ name: 'py', code: 'while True:\n    pass', items: [] }, { timeoutMs: 300 }),
		).toThrow('Code did not finish within 300 ms');
	});
});
