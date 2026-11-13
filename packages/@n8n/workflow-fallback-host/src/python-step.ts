/**
 * Runs the Python code of a `ctx.code` step with `language: 'python'`.
 *
 * n8n runs Python Code nodes in its Python task runner
 * (`packages/@n8n/task-runner-python`). For the proof of concept the host runs
 * a `python3` process for each step instead, with the same rules as the
 * runner's defaults:
 * - the code is the body of a function (`def _user_function()` in n8n),
 * - the builtins that the runner denies by default are not there,
 * - imports are blocked, except the modules in `WF_FALLBACK_PYTHON_STDLIB_ALLOW`
 *   and `WF_FALLBACK_PYTHON_EXTERNAL_ALLOW` (comma-separated, `*` for all), as
 *   `N8N_RUNNERS_STDLIB_ALLOW` and `N8N_RUNNERS_EXTERNAL_ALLOW` do in n8n,
 * - `print` output is dropped (n8n sends it to the browser console).
 *
 * The code runs as the body of `def main(items)`, like JavaScript code steps:
 * `items` is the list of JSON items and the return value is the result. The
 * converter writes the prologue that gives n8n's names (`_items`, `_item`).
 *
 * The process is not a security boundary: it has no sandbox beyond the
 * filtered builtins.
 */
import { spawnSync } from 'node:child_process';

import { CodeStepError } from './code-step';
import { toResultItems } from './items';
import type { JsonObject } from './protocol';

/** The builtins that n8n's Python runner denies by default (`BUILTINS_DENY_DEFAULT`). */
const DENIED_BUILTINS = [
	'eval',
	'exec',
	'compile',
	'open',
	'input',
	'breakpoint',
	'getattr',
	'object',
	'type',
	'vars',
	'setattr',
	'delattr',
	'hasattr',
	'dir',
	'memoryview',
	'__build_class__',
	'globals',
	'locals',
	'license',
	'help',
	'credits',
	'copyright',
];

const DRIVER = String.raw`
import builtins, json, sys, textwrap
req = json.loads(sys.stdin.read())
stdlib_allow = set(req["stdlibAllow"])
external_allow = set(req["externalAllow"])
real_import = builtins.__import__

def safe_import(name, globals=None, locals=None, fromlist=(), level=0):
    if level == 0:
        root = name.split(".")[0]
        is_stdlib = root in sys.stdlib_module_names
        allowed = stdlib_allow if is_stdlib else external_allow
        if not ("*" in allowed or root in allowed):
            listed = ", ".join(sorted(allowed)) if allowed else "none"
            if is_stdlib:
                raise ImportError("Import of standard library module '%s' is disallowed. Allowed stdlib modules: %s" % (name, listed))
            raise ImportError("Import of external package '%s' is disallowed. Allowed external packages: %s" % (name, listed))
    return real_import(name, globals, locals, fromlist, level)

safe = {k: v for k, v in vars(builtins).items() if k not in set(req["deny"])}
safe["__import__"] = safe_import
source = "def __wf_main(items):\n" + textwrap.indent(req["code"], "    ") + "\n    return None\n__wf_result = __wf_main(__wf_items)\n"
scope = {"__builtins__": safe, "__wf_items": req["items"], "print": lambda *a, **k: None}
try:
    code = compile(source, "<code>", "exec")
except SyntaxError as e:
    sys.stdout.write(json.dumps({"ok": False, "error": "Code has a syntax error: %s" % e}))
    sys.exit(0)
try:
    exec(code, scope)
    out = {"ok": True, "result": scope["__wf_result"]}
except BaseException as e:
    out = {"ok": False, "error": str(e) or type(e).__name__}
sys.stdout.write(json.dumps(out, default=str, ensure_ascii=False))
`;

export interface PythonStepOptions {
	timeoutMs: number;
	/** The Python executable. The default is `WF_FALLBACK_PYTHON` or `python3`. */
	python?: string;
}

function allowList(value: string | undefined): string[] {
	return (value ?? '')
		.split(',')
		.map((s) => s.trim())
		.filter((s) => s !== '');
}

function isOutcome(value: unknown): value is { ok: boolean; result?: unknown; error?: unknown } {
	return typeof value === 'object' && value !== null && 'ok' in value;
}

export function runPythonStep(
	args: { name: string; code: string; items: JsonObject[] },
	options: PythonStepOptions,
): JsonObject[] {
	const python = options.python ?? process.env.WF_FALLBACK_PYTHON ?? 'python3';
	const input = JSON.stringify({
		code: args.code,
		items: args.items,
		deny: DENIED_BUILTINS,
		stdlibAllow: allowList(process.env.WF_FALLBACK_PYTHON_STDLIB_ALLOW),
		externalAllow: allowList(process.env.WF_FALLBACK_PYTHON_EXTERNAL_ALLOW),
	});
	const run = spawnSync(python, ['-I', '-c', DRIVER], {
		input,
		encoding: 'utf8',
		timeout: options.timeoutMs,
		maxBuffer: 256 * 1024 * 1024,
		// n8n clears the environment of the runner; PATH finds the interpreter.
		env: { PATH: process.env.PATH ?? '' },
	});
	if (run.error) {
		const code: unknown = Reflect.get(run.error, 'code');
		if (code === 'ETIMEDOUT') {
			throw new CodeStepError(`Code did not finish within ${options.timeoutMs} ms`);
		}
		throw new CodeStepError(`Python did not start (${python}): ${run.error.message}`);
	}
	let outcome: unknown;
	try {
		outcome = JSON.parse(run.stdout);
	} catch {
		const detail = run.stderr.trim().split('\n').pop() ?? '';
		throw new CodeStepError(`Python stopped without a result. ${detail}`.trim());
	}
	if (!isOutcome(outcome)) throw new CodeStepError('Python gave no result');
	if (!outcome.ok) throw new CodeStepError(String(outcome.error));
	try {
		return toResultItems(outcome.result);
	} catch (error) {
		const message = error instanceof Error ? error.message : String(error);
		throw new CodeStepError(`Code must return an object or a list of objects. ${message}`);
	}
}
