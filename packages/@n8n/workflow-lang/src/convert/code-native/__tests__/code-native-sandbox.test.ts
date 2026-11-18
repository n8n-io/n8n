/**
 * Names that the sandbox of v1's task runner does not have (`SANDBOX_MISSING` of
 * `translate.ts`): `URL`, `URLSearchParams`, `fetch`, `process`, the global `crypto` and
 * others. v1 runs the code of a Code node in a context of its own, which has the globals of
 * JavaScript and a few of Node.js. A read of each other name throws
 * `ReferenceError: <name> is not defined`. The native code throws the same error at the same
 * place.
 *
 * Each case runs as native code in the bytecode VM and as a Code node in n8n's engine with
 * its real task runner (`runner-oracle.ts`). The first suite proves the table itself against
 * the task runner. The data is made up.
 */
import { beforeAll, describe, expect, it } from 'vitest';

import { useUtc } from '../../../reference/runner.ts';
import type { CodeMode } from '../translate.ts';
import { SANDBOX_MISSING, translateCode } from '../translate.ts';
import { nativeCode, runnerCode, startRunner, taskRunnerAvailable } from './runner-oracle.ts';

useUtc();

interface Case {
	name: string;
	code: string;
	mode?: CodeMode;
}

const ITEMS = [{ u: 'https://www.example.com/a?b=1' }, { u: 'not a url' }];

const CASES: Case[] = [
	{
		name: 'new URL without a try block',
		code: 'const a = 1;\nconst u = new URL(items[0].json.u);\nreturn [{ json: { h: u.hostname } }];',
	},
	{
		name: 'new URL in a try block that does not read the error',
		code: 'return items.map((i) => {\n  let domain;\n  try {\n    domain = new URL(i.json.u).hostname.replace(/^www\\./, "");\n  } catch {\n    domain = "none";\n  }\n  return { json: { domain } };\n});',
	},
	{
		name: 'the catch block reads the error',
		code:
			'const out = [];\nfor (const i of items) {\n  try {\n    const u = new URL(i.json.u);\n    out.push({ json: { h: u.hostname, p: u.pathname, q: u.searchParams.get("b") } });\n  } catch (e) {\n    out.push({ json: { message: e.message, name: e.name, text: String(e), templ: `$' +
			'{e}`, plus: "x" + e, isError: e instanceof Error, code: e.code } });\n  }\n}\nreturn out;',
	},
	{
		name: 'the error text in a fallback value',
		code: 'let host;\ntry {\n  host = new URL($input.first().json.u).hostname;\n} catch (e) {\n  host = "bad: " + e;\n}\nreturn [{ json: { host } }];',
	},
	{
		name: 'typeof of a missing name',
		code: 'return [{ json: { url: typeof URL, f: typeof fetch === "function", p: typeof process !== "undefined" ? 1 : 2, c: typeof (crypto), s: typeof structuredClone } }];',
	},
	{
		name: 'a missing name in a function with a name: the line of the function',
		code: 'function hostOf(text) {\n  return new URL(text).hostname;\n}\nconst out = [];\nfor (const i of items) out.push({ json: { h: hostOf(i.json.u) } });\nreturn out;',
	},
	{
		name: 'a missing name in a callback: the line of the call',
		code: 'const hosts = items\n  .map((i) => new URL(i.json.u).host);\nreturn [{ json: { hosts } }];',
	},
	{
		name: 'a function that the code does not call',
		code: 'const parse = (t) => new URL(t);\nfunction env() {\n  return process.env.HOME;\n}\nreturn [{ json: { n: items.length } }];',
	},
	{
		name: 'process.env read',
		code: 'const key = process.env.API_KEY || "none";\nreturn [{ json: { key } }];',
	},
	{
		name: 'process.env with an optional chain',
		code: 'const key = process?.env?.API_KEY ?? "none";\nreturn [{ json: { key } }];',
	},
	{
		name: 'process.env written',
		code: 'const a = 1;\n\nprocess.env.FLAG = "1";\nreturn [{ json: { a } }];',
	},
	{
		name: 'process.env in a condition of a try block',
		code: 'let mode = "prod";\ntry {\n  if (process.env.NODE_ENV === "development") mode = "dev";\n} catch (err) {\n  mode = err.message;\n}\nreturn [{ json: { mode } }];',
	},
	{
		name: 'await fetch without a try block',
		code: 'const x = 1;\nconst r = await fetch("https://api.example.test/a");\nconst data = await r.json();\nreturn [{ json: data }];',
	},
	{
		name: 'fetch with promise callbacks in a try block',
		code: 'let out = [];\ntry {\n  out = await fetch("https://api.example.test/a", { method: "POST" }).then((r) => r.json()).catch(() => []);\n} catch (error) {\n  out = [{ failed: error.message }];\n}\nreturn out.map((json) => ({ json }));',
	},
	{
		name: 'fetch in a function with a name, with a catch block that gives the error to the caller',
		code: 'async function load(url) {\n  try {\n    const res = await fetch(url);\n    return await res.json();\n  } catch (e) {\n    throw new Error("load failed: " + e.message);\n  }\n}\nconst data = await load(items[0].json.u);\nreturn [{ json: data }];',
	},
	{
		name: 'the global crypto',
		code: 'const id = crypto.randomUUID();\nreturn [{ json: { id } }];',
	},
	{
		name: 'structuredClone',
		code: 'const copy = structuredClone(items[0].json);\ncopy.x = 1;\nreturn [{ json: copy }];',
	},
	{
		name: 'URLSearchParams',
		code: 'const q = new URLSearchParams({ a: "1", b: "x y" }).toString();\nreturn [{ json: { q } }];',
	},
	{
		name: 'a missing name as a value and as a shorthand member',
		code: 'let v = "none";\ntry {\n  const f = fetch;\n  v = typeof f;\n} catch (e) {\n  v = e.message;\n}\nlet w = "none";\ntry {\n  const o = { URL };\n  w = Object.keys(o).join();\n} catch (e) {\n  w = e.message;\n}\nreturn [{ json: { v, w } }];',
	},
	{
		name: 'a missing name as a bare statement',
		code: 'const a = 1;\nperformance;\nreturn [{ json: { a } }];',
	},
	{
		name: 'a missing name with an index, a call and a tag',
		code: 'let n = 0;\ntry { n = process["argv"].length; } catch { n += 1; }\ntry { n = navigator.userAgent.length; } catch { n += 2; }\ntry { n = window.location.href.length; } catch { n += 4; }\ntry { n = new AbortController().signal ? 100 : 200; } catch { n += 8; }\ntry { delete process.env.X; } catch { n += 16; }\ntry { process.exitCode++; } catch { n += 32; }\nreturn [{ json: { n } }];',
	},
	{
		name: 'each item mode: new URL in a try block',
		code: 'let host = "";\ntry {\n  host = new URL($json.u).host;\n} catch (e) {\n  host = e.name;\n}\nreturn { json: { host } };',
		mode: 'each',
	},
	{
		name: 'each item mode: without a try block',
		code: 'const v = $json.u;\nreturn { json: { h: new URL(v).host } };',
		mode: 'each',
	},
	{
		name: 'code after the error does not run',
		code: 'const out = [];\nout.push({ json: { step: 1 } });\nconst u = new URL("https://example.com");\nout.push({ json: { step: u.searchParams.get("a") } });\nreturn out;',
	},
];

/**
 * Code where a use of a variable can run although its declaration reads a missing name, or
 * where the line of the error is not the line of the statement. The native code gives the
 * result of the task runner, or the translation refuses the code (the host runs it).
 */
const EDGES: Case[] = [
	{
		name: 'a function declaration reads the variable before its declaration',
		code: 'let seen = "none";\nfunction read() {\n  return u;\n}\ntry {\n  read();\n} catch (e) {\n  seen = "early";\n}\nconst u = new URL("https://example.com");\nreturn [{ json: { seen } }];',
	},
	{
		name: 'an assignment in a try block: the variable stays undefined',
		code: 'let u;\ntry {\n  u = new URL(items[0].json.u);\n} catch {}\nreturn [{ json: { missing: u === undefined, host: u ? u.hostname : null } }];',
	},
	{
		name: 'a var in a try block: the variable stays undefined',
		code: 'try {\n  var u = new URL(items[0].json.u);\n} catch (e) {}\nreturn [{ json: { missing: u === undefined, host: u?.hostname ?? null } }];',
	},
	{
		name: 'the clauses of a switch share a scope',
		code: 'const out = [];\nfor (const k of [2, 1]) {\n  try {\n    switch (k) {\n      case 1:\n        const u = new URL("https://example.com");\n        out.push({ json: { k, h: u.host } });\n        break;\n      case 2:\n        out.push({ json: { k, t: typeof u } });\n        break;\n    }\n  } catch (e) {\n    out.push({ json: { k, failed: true } });\n  }\n}\nreturn out;',
	},
	{
		name: 'a closure and a pattern after the declaration',
		code: 'const out = [];\ntry {\n  const u = new URL(items[0].json.u);\n  const { hostname, pathname: p } = u;\n  const host = () => u.host + hostname + p;\n  out.push({ json: { h: host(), q: [...u.searchParams.entries()] } });\n} catch {\n  out.push({ json: { h: null } });\n}\nreturn out;',
	},
	{
		name: 'the name on a later line of an object literal',
		code: 'const a = 1;\nconst o = {\n  a,\n  b: new URL(items[0].json.u).host,\n  c: 3,\n};\nreturn [{ json: o }];',
	},
	{
		name: 'the name on a later line of a call chain',
		code: 'const r = items\n  .map((i) => i.json)\n  .concat(\n    process.argv,\n  );\nreturn [{ json: { r } }];',
	},
	{
		name: 'a call of a missing name over more than one line: the line of the error is not certain',
		code: 'let out = [];\ntry {\n  out = await fetch("https://api.example.test/a", { method: "POST", body: JSON.stringify({ a: 1 }) })\n    .then((r) => r.json())\n    .catch(() => []);\n} catch (error) {\n  out = [{ failed: error.message }];\n}\nreturn out.map((json) => ({ json }));',
	},
	{
		name: 'a call of a missing name in a list over more than one line',
		code: 'const x = 1;\nconst o = {\n  a: x,\n  b: structuredClone(items[0].json),\n};\nreturn [{ json: o }];',
	},
	{
		name: 'the name after the first line of a chain of its own',
		code: 'const x = 1;\nconst r = await\n  fetch("https://api.example.test")\n    .then((res) => res.json());\nreturn [{ json: { r } }];',
	},
	{
		name: 'arguments before the name run, arguments after it do not',
		code: 'const log = [];\nconst note = (v) => { log.push(v); return v; };\ntry {\n  note([note(1), new URL(note(2)), note(3)]);\n} catch (e) {\n  log.push(e.message);\n}\nreturn [{ json: { log } }];',
	},
	{
		name: 'a missing name in a template and in a condition',
		code:
			'let text = "";\ntry {\n  text = `host: $' +
			'{new URL(items[0].json.u).host}`;\n} catch {\n  text = items.length > 1 && typeof window === "undefined" ? "server" : "browser";\n}\nreturn [{ json: { text } }];',
	},
	{
		name: 'a let that the code sets again after its declaration',
		code: 'const out = [];\nfor (const i of items) {\n  try {\n    let u = new URL(i.json.u);\n    u = u.origin;\n    out.push({ json: { u } });\n  } catch (e) {\n    out.push({ json: { m: e.message } });\n  }\n}\nreturn out;',
	},
	{
		name: 'the line of a missing name in a function that a callback calls',
		code: 'const hostOf = function (text) {\n  const clean = text.trim();\n  return new URL(clean).hostname;\n};\nreturn items.map((i) => ({ json: { h: hostOf(i.json.u) } }));',
	},
];

describe.skipIf(!taskRunnerAvailable())('names that the sandbox of v1 does not have', () => {
	beforeAll(async () => {
		await startRunner();
	}, 60_000);

	it.each(['all', 'each'] as const)(
		'each name of the table is not defined in the task runner (%s)',
		async (mode) => {
			const names = [...SANDBOX_MISSING];
			expect(names.length).toBeGreaterThan(20);
			// `eval` reads each name as code of the sandbox: its type, and the error of a read.
			const body = `const names = ${JSON.stringify(names)};\nconst out = {};\nfor (const n of names) {\n  let read = "defined";\n  try { eval(n); } catch (e) { read = e.name + ": " + e.message + " / " + (e instanceof Error); }\n  out[n] = eval("typeof " + n) + " | " + read;\n}\n`;
			const code =
				mode === 'all' ? `${body}return [{ json: out }];` : `${body}return { json: out };`;
			const r = await runnerCode(code, mode, [{}]);
			const want = Object.fromEntries(
				names.map((n) => [n, `undefined | ReferenceError: ${n} is not defined / true`]),
			);
			expect(r).toEqual({ ok: true, value: [want] });
		},
	);

	it.each(CASES)('$name', async ({ code, mode = 'all' }) => {
		const native = nativeCode(code, mode, ITEMS);
		const runner = await runnerCode(code, mode, ITEMS);
		expect(native).toEqual(runner);
	});

	it.each(EDGES)('equal or refused: $name', async ({ code, mode = 'all' }) => {
		let native: unknown;
		try {
			native = nativeCode(code, mode, ITEMS);
		} catch (error) {
			// The translation refuses the code: the fallback host runs the node.
			expect(String(error)).toMatch(/blocked|does not compile/);
			return;
		}
		expect(native).toEqual(await runnerCode(code, mode, ITEMS));
	});

	it.each(['continueRegularOutput', 'continueErrorOutput'] as const)(
		'an error setting that continues (%s) gives the error of v1',
		async (onError) => {
			const code = 'const a = 1;\nreturn [{ json: { h: new URL(items[0].json.u).hostname } }];';
			const runner = await runnerCode(code, 'all', ITEMS, {
				onError,
				output: onError === 'continueErrorOutput' ? 1 : 0,
			});
			expect(runner.ok).toBe(true);
			// The node gives the message of the error; the native code fails with the same message.
			const native = nativeCode(code, 'all', ITEMS);
			expect(native).toEqual({ ok: false, error: 'URL is not defined [line 2]' });
			expect(JSON.stringify(runner)).toContain('URL is not defined [line 2]');
		},
	);
});

describe('names that the code defines or sets stay as they are', () => {
	const blockers = (code: string, kind: 'code' | 'function' = 'code'): string[] => {
		const t = translateCode({ code, mode: 'all', kind, hasNode: () => false });
		return t.ok ? [] : t.blockers.map((b) => b.feature);
	};

	it('refuses code that sets a missing name: the name is a global of the sandbox after that', () => {
		expect(blockers('URL = function () {};\nreturn [{ json: { u: typeof URL } }];')).toContain(
			'URL',
		);
		expect(blockers('fetch = () => 1;\nreturn [{ json: { v: fetch() } }];')).toContain('fetch');
		expect(blockers('[process] = [{ env: {} }];\nreturn [{ json: process.env }];')).toContain(
			'process',
		);
		expect(blockers('for (crypto of [1, 2]) {}\nreturn [{ json: { crypto } }];')).toContain(
			'crypto',
		);
	});

	it('keeps a name that the code declares', () => {
		expect(
			blockers('const fetch = (u) => u + "!";\nreturn [{ json: { v: fetch("a") } }];'),
		).toEqual([]);
		expect(
			blockers('function process(x) { return x * 2; }\nreturn [{ json: { v: process(2) } }];'),
		).toEqual([]);
		expect(blockers('return items.map((_, k) => ({ json: { k } }));')).toEqual([]);
	});

	it('has the form only for the Code node', () => {
		expect(
			blockers('return [{ json: { h: new URL("https://example.com").host } }];', 'function'),
		).toContain('URL');
	});
});
