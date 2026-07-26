/**
 * Code Node Validator
 *
 * Flags Code-node mistakes that always fail at runtime (default sandbox):
 * - Network calls (fetch/axios/helpers.httpRequest/HTTP modules) — no network access
 * - Any require()/import() — modules are disallowed unless the instance allowlists them
 * - Known unavailable packages (luxon, openai, langchain, …) called out specifically
 * - `$input.all()` in runOnceForEachItem mode — that API is unavailable there
 * - Nested template literals that often break after save / serialization
 */

import { isRecord } from '@n8n/utils/is-record';

import type { GraphNode, NodeInstance } from '../../../types/base';
import type { PluginContext, ValidationIssue, ValidatorPlugin } from '../types';

const CODE_NODE_TYPE = 'n8n-nodes-base.code';

/** Builtins / packages that need network — never available in the Code sandbox. */
const NETWORK_MODULE_NAMES = new Set([
	'http',
	'https',
	'http2',
	'net',
	'tls',
	'dns',
	'dgram',
	'node-fetch',
	'axios',
	'got',
	'undici',
	'superagent',
	'request',
	'imap',
	'node-imap',
	'mailparser',
	'nodemailer',
	'ws',
	'websocket',
]);

const NETWORK_CALL =
	/\b(?:fetch|axios|XMLHttpRequest)\s*\(|\bthis\.helpers\.httpRequest\b|require\s*\(\s*['"](?:node:)?(?:http|https|http2|net|tls|dns|dgram|node-fetch|axios|got|undici|superagent|request)['"]\s*\)|\bimport\s*\(\s*['"](?:node:)?(?:http|https|http2|net|tls|dns|dgram|node-fetch|axios|got|undici|superagent|request)['"]\s*\)/;

/** Packages that are never useful in the sandbox even if require were allowlisted. */
const SPECIFIC_FORBIDDEN_MODULE =
	/(?:require\s*\(\s*['"]|import\s*\(\s*['"]|from\s+['"])(?:luxon|openai|@openai\/|langchain|@langchain\/)/;

/**
 * Captures module specifiers from CommonJS require, dynamic import(), and
 * static `import … from '…'` / `export … from '…'`.
 */
const MODULE_SPECIFIER =
	/(?:require\s*\(\s*|import\s*\(\s*|(?:^|[;\n])\s*(?:import|export)\s+(?:type\s+)?(?:[\w*\s{},]+)\s+from\s+)['"]([^'"]+)['"]/g;

const INPUT_ALL = /\$input\.all\s*\(/;

const PYTHON_NETWORK =
	/\b(?:requests|httpx|aiohttp)\s*[.(]|(?:^|\n)\s*(?:import\s+(?:urllib(?:\.\w+)*|requests|httpx|aiohttp)\b|from\s+(?:urllib(?:\.\w+)*|requests|httpx|aiohttp|http\.client)\s+import\b)|\burllib\.|\bhttp\.client\b/;

/**
 * Nested template literals (`` `...${`...`}...` ``) often break when the Code
 * parameter is saved/reloaded. Detect a template that embeds another template
 * via `${` … `` ` `` … `}`.
 */
function hasNestedTemplateLiterals(jsCode: string): boolean {
	let inTemplate = false;
	let depth = 0;
	for (let i = 0; i < jsCode.length; i++) {
		const ch = jsCode[i];
		const prev = i > 0 ? jsCode[i - 1] : '';
		if (ch === '`' && prev !== '\\') {
			if (!inTemplate) {
				inTemplate = true;
				depth = 0;
			} else if (depth === 0) {
				inTemplate = false;
			} else {
				// Nested closing/opening backtick inside ${...}
				return true;
			}
			continue;
		}
		if (!inTemplate) continue;
		if (ch === '$' && jsCode[i + 1] === '{') {
			depth += 1;
			i += 1;
			continue;
		}
		if (ch === '}' && depth > 0) {
			depth -= 1;
		}
	}
	return false;
}

function getJsCode(parameters: Record<string, unknown>): string | undefined {
	return typeof parameters.jsCode === 'string' && parameters.jsCode.length > 0
		? parameters.jsCode
		: undefined;
}

function getPythonCode(parameters: Record<string, unknown>): string | undefined {
	return typeof parameters.pythonCode === 'string' && parameters.pythonCode.length > 0
		? parameters.pythonCode
		: undefined;
}

function isRunOnceForEachItem(parameters: Record<string, unknown>): boolean {
	return parameters.mode === 'runOnceForEachItem';
}

function normalizeModuleName(specifier: string): string {
	return specifier.startsWith('node:') ? specifier.slice('node:'.length) : specifier;
}

function isNetworkModule(specifier: string): boolean {
	const name = normalizeModuleName(specifier);
	const root = name.startsWith('@')
		? name.split('/').slice(0, 2).join('/')
		: (name.split('/')[0] ?? name);
	return NETWORK_MODULE_NAMES.has(root) || NETWORK_MODULE_NAMES.has(name);
}

function collectModuleSpecifiers(jsCode: string): string[] {
	const found: string[] = [];
	for (const match of jsCode.matchAll(MODULE_SPECIFIER)) {
		const specifier = match[1];
		if (specifier) found.push(specifier);
	}
	return found;
}

/**
 * Validator for Code node sandbox and mode API misuse.
 */
export const codeNodeValidator: ValidatorPlugin = {
	id: 'core:code-node',
	name: 'Code Node Validator',
	nodeTypes: [CODE_NODE_TYPE],
	priority: 45,

	validateNode(
		node: NodeInstance<string, string, unknown>,
		_graphNode: GraphNode,
		_ctx: PluginContext,
	): ValidationIssue[] {
		const parameters = node.config?.parameters;
		if (!isRecord(parameters)) return [];

		const issues: ValidationIssue[] = [];
		const jsCode = getJsCode(parameters);
		const pythonCode = getPythonCode(parameters);

		if (jsCode) {
			const hasNetworkCall = NETWORK_CALL.test(jsCode);
			const moduleSpecifiers = collectModuleSpecifiers(jsCode);
			const networkModules = moduleSpecifiers.filter(isNetworkModule);

			if (hasNetworkCall || networkModules.length > 0) {
				const moduleHint =
					networkModules.length > 0
						? ` (imports '${networkModules[0]}' — drop this require/import)`
						: '';
				issues.push({
					code: 'CODE_NODE_NETWORK_CALL',
					message:
						`'${node.name}' Code node performs I/O the sandbox cannot run${moduleHint}. ` +
						'Rewrite: add an HTTP Request node (or the native mail/API node) upstream for the ' +
						'fetch/send/API call, wire this Code node after it, and keep Code only for local ' +
						'transforms on `$json` / `$input` — never fetch, axios, helpers.httpRequest, or ' +
						'network modules (http(s), imap, mailparser, nodemailer, ws, …) inside Code.',
					severity: 'warning',
					violationLevel: 'critical',
					nodeName: node.name,
					parameterPath: 'jsCode',
				});
			}

			const nonNetworkModules = moduleSpecifiers.filter((specifier) => !isNetworkModule(specifier));
			if (nonNetworkModules.length > 0 || SPECIFIC_FORBIDDEN_MODULE.test(jsCode)) {
				const example = nonNetworkModules[0] ?? 'luxon';
				issues.push({
					code: 'CODE_NODE_FORBIDDEN_IMPORT',
					message:
						`'${node.name}' Code node imports '${example}', but require()/import() are disallowed ` +
						'in the Code sandbox by default. Rewrite: remove the import; use `$now`/`$today` or ' +
						'`Date`/`Intl` for dates, Set/Filter/IF/Aggregate for data shaping, HTTP Request for ' +
						'API calls, and dedicated AI nodes (e.g. OpenAI) instead of openai/langchain packages. ' +
						'Keep Code dependency-free — only standard JS plus n8n helpers (`$input`, `$json`).',
					severity: 'warning',
					violationLevel: 'major',
					nodeName: node.name,
					parameterPath: 'jsCode',
				});
			}

			if (isRunOnceForEachItem(parameters) && INPUT_ALL.test(jsCode)) {
				issues.push({
					code: 'CODE_MODE_API_MISUSE',
					message:
						`'${node.name}' calls $input.all() while mode is 'runOnceForEachItem', which has no ` +
						`$input.all(). Rewrite: either set mode to 'runOnceForAllItems' (default) and keep ` +
						'`$input.all()`, or stay in runOnceForEachItem and use `$json` / `$input.item` only.',
					severity: 'warning',
					violationLevel: 'major',
					nodeName: node.name,
					parameterPath: 'mode',
				});
			}

			if (hasNestedTemplateLiterals(jsCode)) {
				issues.push({
					code: 'CODE_NESTED_TEMPLATE_LITERAL',
					message:
						`'${node.name}' Code node uses nested template literals (\`...\${\`...\`}...\`), which ` +
						'often break after save. Rewrite: build the string with an array + join, e.g. ' +
						'`const LF = String.fromCharCode(10); return [{ json: { body: lines.join(LF) } }];` ' +
						'— one template level only, or plain string concatenation.',
					severity: 'warning',
					violationLevel: 'major',
					nodeName: node.name,
					parameterPath: 'jsCode',
				});
			}
		}

		if (pythonCode && PYTHON_NETWORK.test(pythonCode)) {
			issues.push({
				code: 'CODE_NODE_NETWORK_CALL',
				message:
					`'${node.name}' Code node uses a Python HTTP library (requests/urllib/httpx/aiohttp/…). ` +
					'Rewrite: add an HTTP Request node for the network call and keep this Code node only for ' +
					'local transforms on the items it receives — the sandbox has no network access.',
				severity: 'warning',
				violationLevel: 'critical',
				nodeName: node.name,
				parameterPath: 'pythonCode',
			});
		}

		return issues;
	},
};
