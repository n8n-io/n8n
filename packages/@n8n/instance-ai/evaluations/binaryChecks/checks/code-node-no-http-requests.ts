import type { WorkflowNodeResponse } from '../../clients/n8n-client';
import type { BinaryCheck } from '../types';

const CODE_NODE_TYPE = 'n8n-nodes-base.code';

const HTTP_CODE_PATTERNS: Array<{ pattern: RegExp; label: string }> = [
	{ pattern: /\bfetch\s*\(/, label: 'fetch()' },
	{ pattern: /\bXMLHttpRequest\b/, label: 'XMLHttpRequest' },
	{ pattern: /\baxios\s*[.(]/, label: 'axios' },
	{ pattern: /\bthis\.helpers\.httpRequest/, label: 'this.helpers.httpRequest' },
	{
		pattern:
			/require\s*\(\s*['"`](?:node:)?(?:https?|node-fetch|axios|got|undici|superagent|request)['"`]\s*\)/,
		label: 'require of an HTTP module',
	},
	{
		pattern:
			/\burllib\.|(?:^|\n)\s*(?:import\s+urllib(?:\.\w+)*\b|from\s+urllib(?:\.\w+)*\s+import\b)/,
		label: 'urllib',
	},
	{
		pattern:
			/(?:^|\n)\s*(?:import\s+requests\b|from\s+requests(?:\.\w+)*\s+import\b)|\brequests\.(?:get|post|put|patch|delete|head|request)\s*\(/,
		label: 'requests',
	},
	{ pattern: /\bhttpx\s*[.(]|(?:^|\n)\s*from\s+httpx(?:\.\w+)*\s+import\b/, label: 'httpx' },
	{ pattern: /\bhttp\.client\b|(?:^|\n)\s*from\s+http\.client\s+import\b/, label: 'http.client' },
	{ pattern: /\baiohttp\.|(?:^|\n)\s*from\s+aiohttp(?:\.\w+)*\s+import\b/, label: 'aiohttp' },
];

function isCodeNode(node: WorkflowNodeResponse): boolean {
	return node.type === CODE_NODE_TYPE;
}

function getCodeText(node: WorkflowNodeResponse): string {
	const { jsCode, pythonCode, language } = node.parameters ?? {};
	const activeCode = language === 'python' || language === 'pythonNative' ? pythonCode : jsCode;
	return typeof activeCode === 'string' ? activeCode : '';
}

export const codeNodeNoHttpRequests: BinaryCheck = {
	name: 'code_node_no_http_requests',
	description:
		'Code nodes do not hand-roll HTTP requests — the sandbox has no network access (fetch/axios/require fail at runtime); HTTP calls belong in the HTTP Request node',
	kind: 'deterministic',
	dimension: 'nodes_craftsmanship',
	run(workflow) {
		const codeNodes = (workflow.nodes ?? []).filter(isCodeNode);
		if (codeNodes.length === 0) return { pass: true, applicable: false };

		const issues: string[] = [];
		for (const node of codeNodes) {
			const code = getCodeText(node);
			if (!code) continue;

			const matched = HTTP_CODE_PATTERNS.filter(({ pattern }) => pattern.test(code)).map(
				({ label }) => label,
			);
			if (matched.length > 0) {
				issues.push(
					`"${node.name}" makes HTTP requests in code (${matched.join(', ')}) — use the HTTP Request node instead`,
				);
			}
		}

		return {
			pass: issues.length === 0,
			...(issues.length > 0 ? { comment: issues.join('; ') } : {}),
		};
	},
};
