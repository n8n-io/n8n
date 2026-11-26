/**
 * Code Node Validator Plugin
 *
 * Detects secrets that are hardcoded as string literals in Code nodes
 * (`n8n-nodes-base.code`), in both `jsCode` and `pythonCode`.
 */

import { isRecord } from '@n8n/utils/is-record';

import type { GraphNode, NodeInstance } from '../../../types/base';
import {
	type ValidatorPlugin,
	type ValidationIssue,
	type PluginContext,
	findMapKey,
	isAutoRenamed,
	formatNodeRef,
} from '../types';

// The name must end with a secret word, so `apiKey` and `botToken` match but `tokenAddress`
// does not. The redaction keys in @n8n/utils (e.g. `credentials`) are too broad for this check.
const SECRET_NAME =
	/(?:password|passwd|secret|token|(?:api|access|private|secret)[_-]?key|authorization)$/i;

// Matches `name = "value"`, `name: "value"` and `"name": "value"`. The value must be a plain
// literal with no spaces or braces, so prose, `${x}` templates and f-strings do not match.
// An optional auth scheme allows `Authorization: "Bearer <token>"`. The name is checked
// separately, because a secret word inside the name pattern backtracks on long identifiers.
const ASSIGNMENT =
	/(?<![\w.-])(?<nameQuote>["']?)(?<name>[\w.-]+)\k<nameQuote>\s*[:=]\s*(?<quote>["'`])(?<value>(?:(?:Bearer|Basic|Token) +)?(?:(?!\k<quote>)[^\s{}]){8,})\k<quote>/gi;

const REPEATED_CHAR = /^(.)\1+$/;

function findSecretNames(code: string): string[] {
	const names = new Map<string, string>();
	for (const match of code.matchAll(ASSIGNMENT)) {
		const { name, value } = match.groups ?? {};
		if (!name || !value || !SECRET_NAME.test(name) || REPEATED_CHAR.test(value)) continue;
		if (!names.has(name.toLowerCase())) names.set(name.toLowerCase(), name);
	}
	return [...names.values()];
}

export const codeNodeValidator: ValidatorPlugin = {
	id: 'core:code-node',
	name: 'Code Node Validator',
	nodeTypes: ['n8n-nodes-base.code'],
	priority: 50,

	validateNode(
		node: NodeInstance<string, string, unknown>,
		graphNode: GraphNode,
		ctx: PluginContext,
	): ValidationIssue[] {
		const params = node.config?.parameters;
		if (!isRecord(params)) return [];

		const mapKey = findMapKey(graphNode, ctx);
		const renamed = isAutoRenamed(mapKey, node.name);
		const displayName = renamed ? mapKey : node.name;
		const originalName = renamed ? node.name : undefined;
		const nodeRef = formatNodeRef(displayName, originalName, node.type);

		const issues: ValidationIssue[] = [];
		for (const parameterPath of ['jsCode', 'pythonCode'] as const) {
			const code = params[parameterPath];
			if (typeof code !== 'string') continue;
			const names = findSecretNames(code);
			if (names.length === 0) continue;
			issues.push({
				code: 'HARDCODED_CREDENTIALS',
				message:
					`${nodeRef} appears to hardcode secrets (${names.map((n) => `"${n}"`).join(', ')}) in ${parameterPath}. ` +
					'Never hardcode secrets in Code nodes. Use a credential-capable node instead — ' +
					'such as HTTP Request (with httpTemplatedCustomAuth or a dedicated credential), ' +
					'Webhook (with Header/Basic/JWT Auth), Crypto, or a native integration node — ' +
					'or tell the user if no native node supports this secret.',
				severity: 'warning',
				nodeName: displayName,
				parameterPath,
				originalName,
			});
		}
		return issues;
	},
};
