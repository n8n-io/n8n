import type { CodeExecutionMode } from './extract-snippets';
import { lintIssue, type SourceLintIssue } from '../types';

/** Modules that reach the network — reported as CODE_NODE_NETWORK_CALL instead. */
const NETWORK_MODULES = new Set(['requests', 'urllib', 'httpx', 'aiohttp', 'http']);

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

export interface LintPythonCodeOptions {
	mode?: CodeExecutionMode;
	nodeName?: string;
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
	const otherModules = [...roots].filter((module) => !NETWORK_MODULES.has(module));

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
				// No environment-variable names and no "ask an operator to widen it": the
				// agent may repeat this to a user who has no way to change the allowlist,
				// which on a managed deployment is everyone.
				code: 'CODE_NODE_PYTHON_IMPORT',
				message:
					`${namePrefix}Code node imports ${otherModules.join(', ')}, but the native Python runner ` +
					'imports nothing unless the deployment allowlists it, and the default allows nothing — ' +
					'relative imports are rejected outright either way. Rewrite using builtins and ' +
					'str/list/dict methods, or switch the node to JavaScript.',
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
