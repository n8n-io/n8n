import type { CodeExecutionMode } from './extract-snippets';
import { lintIssue, type SourceLintIssue } from '../types';

/** Modules that reach the network — reported as CODE_NODE_NETWORK_CALL instead. */
const NETWORK_MODULES = new Set(['requests', 'urllib', 'httpx', 'aiohttp', 'http']);

/**
 * What the Python runner executing this code will let the code import, mirroring
 * `N8N_RUNNERS_STDLIB_ALLOW` / `N8N_RUNNERS_EXTERNAL_ALLOW`. Both default to empty,
 * so with no policy supplied every import is treated as disallowed.
 */
export interface PythonImportPolicy {
	/** Allowlisted standard-library modules. `['*']` means all; empty means none. */
	stdlib: string[];
	/** Allowlisted external packages. `['*']` means all; empty means none. */
	external: string[];
	/**
	 * Whether this reflects the runner that will actually execute the code. False in
	 * external runner mode, where the runner's environment may differ from n8n's.
	 * Consumers must not present a non-authoritative policy as fact, and must not
	 * let it suppress a warning — the runner may be stricter than this says.
	 */
	authoritative: boolean;
	/**
	 * The configured allowlist is one the runner rejects outright (a wildcard combined
	 * with named modules), so it will refuse to start and no Python runs at all.
	 */
	misconfigured?: boolean;
}

/**
 * Whether the policy makes every import allowed. Telling a standard-library module
 * from an external package needs Python's own `sys.stdlib_module_names`, which is
 * not available here — so we can only be sure when BOTH lists are wildcards, which
 * is exactly the condition the runner's own analyzer short-circuits on
 * (`TaskAnalyzer._allow_all`).
 */
function allowsEverything(policy: PythonImportPolicy): boolean {
	return policy.stdlib.includes('*') && policy.external.includes('*');
}

/**
 * Whether one list is a wildcard and the other is not. The runner still checks the
 * non-wildcard category, but deciding which category a module belongs to needs
 * Python's stdlib list, so this linter cannot rule on it. It abstains rather than
 * guessing; the system prompt carries the exact per-category policy instead.
 */
function policyIsUndecidable(policy: PythonImportPolicy): boolean {
	return (
		!allowsEverything(policy) && (policy.stdlib.includes('*') || policy.external.includes('*'))
	);
}

/** Renders the allowlist clause shared by the import message. */
function describePolicy(policy: PythonImportPolicy | undefined): string {
	// These reach the agent, which may repeat them to the user. Deliberately no
	// environment-variable names and no "ask an operator to change it": whether the
	// allowlist can be changed at all is a deployment question neither the agent nor
	// the user can act on — on cloud it cannot.
	if (!policy) {
		return 'imports are allowlisted per deployment, this check cannot see the allowlist in force, and the default allows nothing — so assume none are available';
	}
	if (policy.misconfigured) {
		return "this deployment's allowlist is one the runner rejects, so it will refuse to start and no Python runs at all";
	}
	const parts: string[] = [];
	if (policy.stdlib.length > 0) parts.push(`standard-library modules ${policy.stdlib.join(', ')}`);
	if (policy.external.length > 0) parts.push(`packages ${policy.external.join(', ')}`);
	if (parts.length === 0) {
		return 'this deployment allowlists no imports at all';
	}
	return `this deployment allowlists only ${parts.join(', and ')}`;
}

/**
 * Names the native Python runner never defines. `_(…)` is the Pyodide-only
 * cross-node accessor and `$…` is JavaScript Code-node syntax; both raise
 * NameError. The runner's only globals are `_items`, `_item` and `print`.
 */
const UNSUPPORTED_GLOBAL_NAMES = [
	'_input',
	'_json',
	'_node',
	'_workflow',
	'_execution',
	'_prevNode',
	'_runIndex',
	'_today',
	'_now',
	'_jmespath',
	'_env',
	'_vars',
	'_binary',
	'_getWorkflowStaticData',
];

const UNSUPPORTED_GLOBAL = new RegExp(
	String.raw`(?<![\w.$])(?:${UNSUPPORTED_GLOBAL_NAMES.join('|')})\b|(?<![\w.$])_\s*\(|(?<![\w$])\$[A-Za-z_]`,
);

/** The item accessor the runner defines, per node mode. The other one is undefined. */
const MODE_ACCESSOR: Record<CodeExecutionMode, { defined: string; undefined: string }> = {
	runOnceForAllItems: { defined: '_items', undefined: '_item' },
	runOnceForEachItem: { defined: '_item', undefined: '_items' },
};

/** `import a.b, c as d` and `from a.b import c`, anchored so prose never matches. */
const IMPORT_LINE = /^[ \t]*(?:import[ \t]+([\w.,\t ]+)|from[ \t]+([\w.]+)[ \t]+import\b)/gm;

/** Drop `#` line comments so a module or helper named in prose is not flagged. */
function stripComments(pythonCode: string): string {
	return pythonCode.replace(/#.*$/gm, '');
}

/**
 * Top-level module of an import specifier — `http.client` yields `http`. Relative
 * specifiers keep their leading dots: they resolve to no top-level module, and the
 * runner rejects them outright with "Relative imports are disallowed".
 */
function importRoot(specifier: string): string {
	const trimmed = specifier.trim();
	return trimmed.startsWith('.') ? trimmed : trimmed.split(/[\s.]/)[0];
}

/** Every module the snippet imports, keyed by top-level name. */
function importedRootModules(pythonCode: string): Set<string> {
	const roots = new Set<string>();
	for (const [, names, fromModule] of pythonCode.matchAll(IMPORT_LINE)) {
		for (const specifier of names ? names.split(',') : [fromModule]) {
			const root = importRoot(specifier);
			if (root) roots.add(root);
		}
	}
	return roots;
}

/** The accessor belonging to the other mode, when the snippet reads it. */
function wrongModeAccessor(pythonCode: string, mode?: CodeExecutionMode): string | undefined {
	if (!mode) return undefined;
	const { undefined: wrong } = MODE_ACCESSOR[mode];
	return new RegExp(String.raw`(?<![\w.$])${wrong}\b`).test(pythonCode) ? wrong : undefined;
}

/**
 * Modules the runner will reject. Relative specifiers are always rejected; anything
 * else survives only by being named in the policy. With no policy the caller cannot
 * see the runner's configuration, so the safe reading — and the default everywhere —
 * is that nothing is allowed.
 */
function disallowedImports(modules: string[], policy?: PythonImportPolicy): string[] {
	if (!policy || policy.misconfigured) return modules;
	if (allowsEverything(policy) || policyIsUndecidable(policy)) {
		return modules.filter((module) => module.startsWith('.'));
	}
	const allowed = new Set([...policy.stdlib, ...policy.external]);
	return modules.filter((module) => module.startsWith('.') || !allowed.has(module));
}

export interface LintPythonCodeOptions {
	mode?: CodeExecutionMode;
	nodeName?: string;
	/** The executing runner's import policy. Omit when unknown — nothing is assumed allowed. */
	importPolicy?: PythonImportPolicy;
}

/**
 * Lint Python written for a Code node (`pythonCode` parameter).
 */
export function lintPythonCode(
	pythonCode: string,
	options: LintPythonCodeOptions = {},
): SourceLintIssue[] {
	if (pythonCode.length === 0) return [];

	const code = stripComments(pythonCode);
	const roots = importedRootModules(code);
	const networkModules = [...roots].filter((module) => NETWORK_MODULES.has(module));
	const otherModules = disallowedImports(
		[...roots].filter((module) => !NETWORK_MODULES.has(module)),
		options.importPolicy,
	);

	const issues: SourceLintIssue[] = [];
	const namePrefix = options.nodeName ? `'${options.nodeName}' ` : '';

	if (networkModules.length > 0) {
		issues.push(
			lintIssue({
				code: 'CODE_NODE_NETWORK_CALL',
				message:
					`${namePrefix}Code node uses requests/urllib/httpx or another HTTP library. ` +
					'Code nodes have no network access at runtime — make the HTTP/API call with an HTTP Request node ' +
					'and process its output in this node instead.',
				lintTarget: 'pythonCode',
				nodeName: options.nodeName,
				parameterPath: 'pythonCode',
			}),
		);
	}

	if (otherModules.length > 0) {
		issues.push(
			lintIssue({
				code: 'CODE_NODE_PYTHON_IMPORT',
				message:
					`${namePrefix}Code node imports ${otherModules.join(', ')}, which the native Python runner ` +
					`will reject: ${describePolicy(options.importPolicy)}, and relative imports are rejected ` +
					'outright. Rewrite using builtins and str/list/dict methods, or switch the node to JavaScript.',
				lintTarget: 'pythonCode',
				nodeName: options.nodeName,
				parameterPath: 'pythonCode',
			}),
		);
	}

	const wrongAccessor = wrongModeAccessor(code, options.mode);
	if (wrongAccessor !== undefined && options.mode) {
		const { defined } = MODE_ACCESSOR[options.mode];
		issues.push(
			lintIssue({
				code: 'CODE_MODE_API_MISUSE',
				message:
					`${namePrefix}uses mode: '${options.mode}' but reads ${wrongAccessor}, which the runner ` +
					`only defines in the other mode. Read ${defined} instead, or switch the node mode.`,
				lintTarget: 'pythonCode',
				nodeName: options.nodeName,
				parameterPath: 'pythonCode',
			}),
		);
	}

	if (UNSUPPORTED_GLOBAL.test(code)) {
		issues.push(
			lintIssue({
				code: 'CODE_NODE_PYTHON_UNSUPPORTED_GLOBAL',
				message:
					`${namePrefix}Code node reads a variable the native Python runner does not define ` +
					'(_("Node Name"), _input, _json, _today, $-prefixed helpers). ' +
					'The only globals are _items in runOnceForAllItems mode, _item in runOnceForEachItem mode, ' +
					'and print(). Pass data in from an upstream node instead of reaching for another node.',
				lintTarget: 'pythonCode',
				nodeName: options.nodeName,
				parameterPath: 'pythonCode',
			}),
		);
	}

	return issues;
}
