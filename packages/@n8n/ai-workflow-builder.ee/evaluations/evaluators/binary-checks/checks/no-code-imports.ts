import type { BinaryCheck, SimpleWorkflow } from '../types';

/**
 * Patterns that detect library import attempts in JavaScript code:
 * - require('module') / require("module")
 * - import ... from 'module'
 * - import('module') (dynamic import)
 */
const JS_IMPORT_PATTERNS = [/\brequire\s*\(/, /\bimport\s+[\s\S]*?\s+from\s+['"`]/, /\bimport\s*\(/];

/**
 * Patterns that detect library import attempts in Python code:
 * - import module
 * - from module import name
 * - __import__('module')
 */
const PYTHON_IMPORT_PATTERNS = [
	/^\s*import\s+\w+/m,
	/^\s*from\s+\w+\s+import\s+/m,
	/\b__import__\(/,
];

const LANGUAGE_CONFIG: Record<string, [string, RegExp[]]> = {
	javaScript: ['jsCode', JS_IMPORT_PATTERNS],
	pythonNative: ['pythonCode', PYTHON_IMPORT_PATTERNS],
};

function getCodeAndPatterns(
	parameters: Record<string, unknown>,
): { code: string; patterns: RegExp[] } | null {
	const language = (parameters.language as string) ?? 'javaScript';
	const config = LANGUAGE_CONFIG[language];
	if (!config) return null;
	const [codeKey, patterns] = config;
	const code = parameters[codeKey] as string | undefined;
	if (!code) return null;
	return { code, patterns };
}

function detectImports(code: string, patterns: RegExp[]): boolean {
	return patterns.some((pattern) => pattern.test(code));
}

export const noCodeImports: BinaryCheck = {
	name: 'no_code_imports',
	kind: 'deterministic',
	async run(workflow: SimpleWorkflow) {
		if (!workflow.nodes || workflow.nodes.length === 0) {
			return { pass: true };
		}

		const nodesWithImports: string[] = [];

		for (const node of workflow.nodes) {
			if (node.type !== 'n8n-nodes-base.code') continue;

			const params = node.parameters as Record<string, unknown> | undefined;
			if (!params) continue;

			const codeInfo = getCodeAndPatterns(params);
			if (!codeInfo) continue;

			if (detectImports(codeInfo.code, codeInfo.patterns)) {
				nodesWithImports.push(node.name);
			}
		}

		return {
			pass: nodesWithImports.length === 0,
			...(nodesWithImports.length > 0
				? {
						comment: `Code nodes with library imports: ${nodesWithImports.join(', ')}. Library imports are disallowed in Code nodes.`,
					}
				: {}),
		};
	},
};
