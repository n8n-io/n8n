import { tool } from '@langchain/core/tools';
import type { INode, INodeTypeDescription } from 'n8n-workflow';
import { isExpression } from 'n8n-workflow';
import { z } from 'zod';

import { ToolExecutionError, ValidationError } from '../errors';
import type { SimpleWorkflow } from '../types/workflow';
import { isTriggerNodeType } from '../utils/node-helpers';
import type { BuilderTool, BuilderToolBase } from '../utils/stream-processor';
import { createProgressReporter, reportProgress } from './helpers/progress';
import { createErrorResponse, createSuccessResponse } from './helpers/response';
import { getEffectiveWorkflow } from './helpers/state';
import { mermaidStringify } from './utils/mermaid.utils';

// --- Types ---

type SecuritySeverity = 'critical' | 'warning' | 'info';

interface SecurityFinding {
	severity: SecuritySeverity;
	title: string;
	description: string;
	nodeName: string;
	parameterPath?: string;
	matchedValue?: string;
}

// --- Constants ---

const SECRET_PATTERNS: Array<{ pattern: RegExp; provider: string }> = [
	{ pattern: /sk_live_[a-zA-Z0-9]{20,}/, provider: 'Stripe' },
	{ pattern: /sk_test_[a-zA-Z0-9]{20,}/, provider: 'Stripe (test)' },
	{ pattern: /ghp_[a-zA-Z0-9]{36,}/, provider: 'GitHub' },
	{ pattern: /gho_[a-zA-Z0-9]{36,}/, provider: 'GitHub OAuth' },
	{ pattern: /ghs_[a-zA-Z0-9]{36,}/, provider: 'GitHub App' },
	{ pattern: /github_pat_[a-zA-Z0-9_]{20,}/, provider: 'GitHub' },
	{ pattern: /xoxb-[0-9]+-[a-zA-Z0-9]+/, provider: 'Slack Bot' },
	{ pattern: /xoxp-[0-9]+-[a-zA-Z0-9]+/, provider: 'Slack User' },
	{ pattern: /xoxa-[0-9]+-[a-zA-Z0-9]+/, provider: 'Slack App' },
	{ pattern: /AKIA[0-9A-Z]{16}/, provider: 'AWS' },
	{ pattern: /AIza[0-9A-Za-z_-]{35}/, provider: 'Google API' },
	{ pattern: /SG\.[a-zA-Z0-9_-]{22}\.[a-zA-Z0-9_-]{43}/, provider: 'SendGrid' },
	{ pattern: /-----BEGIN (?:RSA |EC |DSA )?PRIVATE KEY-----/, provider: 'Private Key' },
	{ pattern: /-----BEGIN OPENSSH PRIVATE KEY-----/, provider: 'SSH Private Key' },
];

const SENSITIVE_HEADERS = new Set([
	'authorization',
	'x-api-key',
	'x-auth-token',
	'x-access-token',
	'api-key',
	'apikey',
]);

const GENERIC_TOKEN_PATTERN = /^[a-zA-Z0-9+/=_-]{32,}$/;

const PII_VALUE_PATTERNS: Array<{ pattern: RegExp; type: string }> = [
	{
		pattern: /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/,
		type: 'Email address',
	},
	{ pattern: /\b\d{3}-\d{2}-\d{4}\b/, type: 'SSN' },
	{
		pattern:
			/\b(?:4[0-9]{12}(?:[0-9]{3})?|5[1-5][0-9]{14}|3[47][0-9]{13}|6(?:011|5[0-9]{2})[0-9]{12})\b/,
		type: 'Credit card number',
	},
	{
		pattern: /\b\+?1?[-.\s]?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b/,
		type: 'Phone number',
	},
];

const SENSITIVE_FIELD_EXPR_PATTERN = /(?:password|secret|token|apiKey|api_key|private_key)/i;

const SEVERITY_ORDER: Record<string, number> = { critical: 0, warning: 1, info: 2 };
const SEVERITY_LABELS: Record<string, string> = {
	critical: 'CRITICAL',
	warning: 'WARNING',
	info: 'INFO',
};

const MAX_DATA_FLOW_PATHS = 10;

// --- Utility Functions ---

function redactValue(value: string): string {
	if (value.length <= 6) return '******';
	if (value.length <= 10) {
		return `${value.slice(0, 2)}${'*'.repeat(value.length - 4)}${value.slice(-2)}`;
	}
	return `${value.slice(0, 4)}${'*'.repeat(Math.min(value.length - 8, 8))}${value.slice(-4)}`;
}

function walkParameters(
	params: unknown,
	visitor: (value: string, path: string, isExpr: boolean) => void,
	currentPath = '',
): void {
	if (params === null || params === undefined) return;
	if (typeof params === 'string') {
		visitor(params, currentPath, isExpression(params));
		return;
	}
	if (typeof params === 'number' || typeof params === 'boolean') return;
	if (Array.isArray(params)) {
		for (let i = 0; i < params.length; i++) {
			walkParameters(
				params[i] as unknown,
				visitor,
				currentPath ? `${currentPath}[${i}]` : `[${i}]`,
			);
		}
		return;
	}
	if (typeof params === 'object') {
		for (const [key, value] of Object.entries(params as Record<string, unknown>)) {
			walkParameters(value, visitor, currentPath ? `${currentPath}.${key}` : key);
		}
	}
}

function isSensitiveFieldName(path: string): boolean {
	const lowerPath = path.toLowerCase();
	return (
		SENSITIVE_HEADERS.has(lowerPath.split('.').pop() ?? '') ||
		/(?:api[_-]?key|access[_-]?token|auth[_-]?token|bearer[_-]?token|secret[_-]?key|private[_-]?key|client[_-]?secret|password|^token$|^secret$|^auth$)/i.test(
			lowerPath,
		)
	);
}

function createNodeTypeMap(nodeTypes: INodeTypeDescription[]): Map<string, INodeTypeDescription> {
	const map = new Map<string, INodeTypeDescription>();
	for (const nt of nodeTypes) {
		map.set(nt.name, nt);
	}
	return map;
}

function isNodeTrigger(node: INode, nodeTypeMap: Map<string, INodeTypeDescription>): boolean {
	const nodeType = nodeTypeMap.get(node.type);
	if (nodeType) {
		return nodeType.group?.includes('trigger') ?? false;
	}
	return isTriggerNodeType(node.type);
}

function isNodeExternalService(
	node: INode,
	nodeTypeMap: Map<string, INodeTypeDescription>,
): boolean {
	if (node.type === 'n8n-nodes-base.httpRequest') return true;
	const nodeType = nodeTypeMap.get(node.type);
	if (!nodeType) return false;
	return (nodeType.credentials?.length ?? 0) > 0;
}

// --- Security Check Functions ---

function checkHardcodedSecrets(nodes: INode[]): SecurityFinding[] {
	const findings: SecurityFinding[] = [];

	for (const node of nodes) {
		if (!node.parameters) continue;

		walkParameters(node.parameters, (value, path, isExpr) => {
			if (isExpr) return;

			for (const { pattern, provider } of SECRET_PATTERNS) {
				if (pattern.test(value)) {
					findings.push({
						severity: 'critical',
						title: `Hardcoded ${provider} key in "${node.name}"`,
						description: `Move this key to n8n's credential store. Found in parameter: ${path}`,
						nodeName: node.name,
						parameterPath: path,
						matchedValue: redactValue(value),
					});
					return;
				}
			}

			if (isSensitiveFieldName(path) && value.length >= 16 && GENERIC_TOKEN_PATTERN.test(value)) {
				findings.push({
					severity: 'critical',
					title: `Possible hardcoded token in "${node.name}"`,
					description: `The field "${path}" contains a hardcoded value that looks like a secret.`,
					nodeName: node.name,
					parameterPath: path,
					matchedValue: redactValue(value),
				});
			}
		});
	}

	return findings;
}

function checkPiiPatterns(nodes: INode[]): SecurityFinding[] {
	const findings: SecurityFinding[] = [];

	for (const node of nodes) {
		if (!node.parameters) continue;

		walkParameters(node.parameters, (value, path, isExpr) => {
			if (isExpr) return;

			for (const { pattern, type } of PII_VALUE_PATTERNS) {
				if (pattern.test(value)) {
					findings.push({
						severity: 'warning',
						title: `${type} in "${node.name}"`,
						description: `Hardcoded PII found in parameter: ${path}. Consider using expressions or credentials.`,
						nodeName: node.name,
						parameterPath: path,
						matchedValue: redactValue(value),
					});
					return;
				}
			}
		});
	}

	return findings;
}

function checkInsecureConfig(nodes: INode[]): SecurityFinding[] {
	const findings: SecurityFinding[] = [];

	for (const node of nodes) {
		if (!node.parameters) continue;

		walkParameters(node.parameters, (value, path, isExpr) => {
			if (isExpr) return;

			const httpMatch = value.match(/http:\/\/([^/\s]+)/);
			if (httpMatch) {
				const host = httpMatch[1].split(':')[0];
				if (host !== 'localhost' && host !== '127.0.0.1' && host !== '0.0.0.0') {
					findings.push({
						severity: 'warning',
						title: `HTTP URL (no TLS) in "${node.name}"`,
						description: `Use HTTPS instead of HTTP for "${host}". Found in: ${path}`,
						nodeName: node.name,
						parameterPath: path,
					});
				}
			}
		});

		const params = node.parameters as Record<string, unknown>;

		if (params.allowUnauthorizedCerts === true || params.allowUnauthorizedCerts === 'true') {
			findings.push({
				severity: 'warning',
				title: `SSL verification disabled in "${node.name}"`,
				description: 'Disabling SSL verification makes the connection vulnerable to MITM attacks.',
				nodeName: node.name,
				parameterPath: 'allowUnauthorizedCerts',
			});
		}

		if (node.type === 'n8n-nodes-base.webhook') {
			const auth = params.authentication;
			if (!auth || auth === 'none') {
				findings.push({
					severity: 'warning',
					title: `Unauthenticated webhook "${node.name}"`,
					description: 'This webhook has no authentication. Anyone with the URL can trigger it.',
					nodeName: node.name,
					parameterPath: 'authentication',
				});
			}
		}
	}

	return findings;
}

function checkExpressionRisks(nodes: INode[]): SecurityFinding[] {
	const findings: SecurityFinding[] = [];

	for (const node of nodes) {
		if (!node.parameters) continue;

		walkParameters(node.parameters, (value, path, isExpr) => {
			if (!isExpr) return;

			if (value.includes('$env.') || value.includes('$env[')) {
				findings.push({
					severity: 'info',
					title: `$env usage in "${node.name}"`,
					description: `Environment variable accessed in expression at ${path}. Ensure this doesn't expose secrets to untrusted outputs.`,
					nodeName: node.name,
					parameterPath: path,
				});
			}

			if (SENSITIVE_FIELD_EXPR_PATTERN.test(value)) {
				findings.push({
					severity: 'info',
					title: `Sensitive field access in "${node.name}"`,
					description: `Expression at ${path} references a credential-like field name.`,
					nodeName: node.name,
					parameterPath: path,
				});
			}
		});
	}

	return findings;
}

function checkDataExposure(
	workflow: SimpleWorkflow,
	nodeTypeMap: Map<string, INodeTypeDescription>,
): SecurityFinding[] {
	const findings: SecurityFinding[] = [];
	const { nodes, connections } = workflow;

	const triggerNames = new Set(
		nodes.filter((n) => isNodeTrigger(n, nodeTypeMap)).map((n) => n.name),
	);

	if (triggerNames.size === 0) return findings;

	// BFS downstream from triggers
	const visited = new Set<string>();
	const queue = [...triggerNames];

	while (queue.length > 0) {
		const current = queue.pop()!;
		if (visited.has(current)) continue;
		visited.add(current);

		const nodeConnections = connections[current];
		if (!nodeConnections) continue;

		for (const connectionType of Object.values(nodeConnections)) {
			for (const outputConnections of connectionType) {
				if (!outputConnections) continue;
				for (const connection of outputConnections) {
					if (!visited.has(connection.node)) {
						queue.push(connection.node);
					}
				}
			}
		}
	}

	const nodesByName = new Map(nodes.map((n) => [n.name, n]));

	for (const nodeName of visited) {
		if (triggerNames.has(nodeName)) continue;
		const node = nodesByName.get(nodeName);
		if (!node) continue;

		if (isNodeExternalService(node, nodeTypeMap)) {
			const triggerList = [...triggerNames].join(', ');
			findings.push({
				severity: 'info',
				title: `External input flows to ${node.type.replace('n8n-nodes-base.', '')}`,
				description: `Data from ${triggerList} reaches "${node.name}". Ensure sensitive input data is filtered before sending externally.`,
				nodeName: node.name,
			});
		}
	}

	return findings;
}

// --- AI Security Checks ---

const AI_NODE_PREFIX = '@n8n/n8n-nodes-langchain';
const AI_AGENT_TYPE = `${AI_NODE_PREFIX}.agent`;
const DANGEROUS_TOOL_TYPES = new Set([
	`${AI_NODE_PREFIX}.toolHttpRequest`,
	`${AI_NODE_PREFIX}.toolCode`,
]);
const SYSTEM_PROMPT_PARAMS = new Set(['systemMessage', 'text', 'messages']);
const INPUT_REF_PATTERN = /\$json\b|\$input\b|\$\('|\$node\[/;

function isAiNode(node: INode): boolean {
	return node.type.startsWith(AI_NODE_PREFIX);
}

function checkAiPromptInjection(nodes: INode[]): SecurityFinding[] {
	const findings: SecurityFinding[] = [];

	for (const node of nodes) {
		if (!isAiNode(node) || !node.parameters) continue;

		walkParameters(node.parameters, (value, path, isExpr) => {
			if (!isExpr) return;
			const topParam = path.split('.')[0];
			if (!SYSTEM_PROMPT_PARAMS.has(topParam)) return;

			if (INPUT_REF_PATTERN.test(value)) {
				findings.push({
					severity: 'warning',
					title: `User input in AI system prompt of "${node.name}"`,
					description:
						'The system prompt references user-controlled data. An attacker could craft input that overrides system instructions (prompt injection).',
					nodeName: node.name,
					parameterPath: path,
				});
			}
		});
	}

	return findings;
}

function checkDirectTriggerToAi(
	workflow: SimpleWorkflow,
	nodeTypeMap: Map<string, INodeTypeDescription>,
): SecurityFinding[] {
	const findings: SecurityFinding[] = [];
	const { nodes, connections } = workflow;
	const nodesByName = new Map(nodes.map((n) => [n.name, n]));

	for (const node of nodes) {
		if (!isNodeTrigger(node, nodeTypeMap)) continue;

		const nodeConns = connections[node.name];
		if (!nodeConns?.main) continue;

		for (const outputGroup of nodeConns.main) {
			if (!outputGroup) continue;
			for (const conn of outputGroup) {
				const target = nodesByName.get(conn.node);
				if (target && isAiNode(target)) {
					findings.push({
						severity: 'warning',
						title: `Trigger data flows directly to AI node "${target.name}"`,
						description: `"${node.name}" connects directly to "${target.name}" without intermediate filtering. Raw user input may be sent to the AI provider.`,
						nodeName: target.name,
					});
				}
			}
		}
	}

	return findings;
}

function checkOverPrivilegedTools(workflow: SimpleWorkflow): SecurityFinding[] {
	const findings: SecurityFinding[] = [];
	const { nodes, connections } = workflow;
	const nodesByName = new Map(nodes.map((n) => [n.name, n]));

	for (const [sourceName, nodeConns] of Object.entries(connections)) {
		const toolOutputs = nodeConns.ai_tool;
		if (!toolOutputs) continue;

		for (const outputGroup of toolOutputs) {
			if (!outputGroup) continue;
			for (const conn of outputGroup) {
				const agentNode = nodesByName.get(conn.node);
				const toolNode = nodesByName.get(sourceName);
				if (!agentNode || !toolNode) continue;
				if (agentNode.type !== AI_AGENT_TYPE) continue;

				if (DANGEROUS_TOOL_TYPES.has(toolNode.type)) {
					const toolLabel = toolNode.type.includes('toolHttpRequest')
						? 'HTTP Request tool'
						: 'Code tool';
					findings.push({
						severity: 'info',
						title: `AI Agent "${agentNode.name}" has ${toolLabel}`,
						description: `The ${toolLabel} "${toolNode.name}" gives the AI agent the ability to ${toolNode.type.includes('toolHttpRequest') ? 'make arbitrary HTTP requests' : 'execute arbitrary code'}.`,
						nodeName: agentNode.name,
					});
				}
			}
		}
	}

	return findings;
}

function checkAiOutputToExternal(
	workflow: SimpleWorkflow,
	nodeTypeMap: Map<string, INodeTypeDescription>,
): SecurityFinding[] {
	const findings: SecurityFinding[] = [];
	const { nodes, connections } = workflow;
	const nodesByName = new Map(nodes.map((n) => [n.name, n]));

	for (const node of nodes) {
		if (!isAiNode(node)) continue;

		const nodeConns = connections[node.name];
		if (!nodeConns?.main) continue;

		for (const outputGroup of nodeConns.main) {
			if (!outputGroup) continue;
			for (const conn of outputGroup) {
				const target = nodesByName.get(conn.node);
				if (target && isNodeExternalService(target, nodeTypeMap)) {
					findings.push({
						severity: 'info',
						title: `AI output sent directly to "${target.name}"`,
						description: `"${node.name}" outputs directly to the external service "${target.name}". AI outputs may contain hallucinated data or leaked context.`,
						nodeName: target.name,
					});
				}
			}
		}
	}

	return findings;
}

function checkSecretsInAiPrompts(nodes: INode[]): SecurityFinding[] {
	const findings: SecurityFinding[] = [];

	for (const node of nodes) {
		if (!isAiNode(node) || !node.parameters) continue;

		walkParameters(node.parameters, (value, path, isExpr) => {
			if (isExpr) return;
			const topParam = path.split('.')[0];
			if (!SYSTEM_PROMPT_PARAMS.has(topParam)) return;

			for (const { pattern, provider } of SECRET_PATTERNS) {
				if (pattern.test(value)) {
					findings.push({
						severity: 'critical',
						title: `${provider} key in AI prompt of "${node.name}"`,
						description: `A ${provider} secret in the system prompt will likely be echoed by the LLM. Move it to n8n credentials.`,
						nodeName: node.name,
						parameterPath: path,
						matchedValue: redactValue(value),
					});
					return;
				}
			}
		});
	}

	return findings;
}

function checkAiChaining(workflow: SimpleWorkflow): SecurityFinding[] {
	const findings: SecurityFinding[] = [];
	const { nodes, connections } = workflow;
	const nodesByName = new Map(nodes.map((n) => [n.name, n]));

	for (const node of nodes) {
		if (!isAiNode(node)) continue;

		const nodeConns = connections[node.name];
		if (!nodeConns?.main) continue;

		for (const outputGroup of nodeConns.main) {
			if (!outputGroup) continue;
			for (const conn of outputGroup) {
				const target = nodesByName.get(conn.node);
				if (target && isAiNode(target)) {
					findings.push({
						severity: 'warning',
						title: `AI node "${node.name}" chains directly to AI node "${target.name}"`,
						description:
							'Chained AI nodes amplify hallucination risk and can propagate prompt injection. Add validation between them.',
						nodeName: target.name,
					});
				}
			}
		}
	}

	return findings;
}

function checkCodeInjection(nodes: INode[]): SecurityFinding[] {
	const codePatterns: Array<{ pattern: RegExp; label: string }> = [
		{ pattern: /\beval\s*\(/, label: 'eval()' },
		{ pattern: /\bnew\s+Function\s*\(/, label: 'new Function()' },
		{ pattern: /\bchild_process\b/, label: 'child_process' },
		{ pattern: /\brequire\s*\(\s*['"]fs['"]/, label: "require('fs')" },
		{ pattern: /\bexecSync\s*\(|\bexec\s*\(/, label: 'exec()' },
		{ pattern: /\bspawnSync\s*\(|\bspawn\s*\(/, label: 'spawn()' },
	];
	const findings: SecurityFinding[] = [];

	for (const node of nodes) {
		if (node.type !== 'n8n-nodes-base.code' && node.type !== 'n8n-nodes-base.codeNode') continue;
		if (!node.parameters) continue;

		const rawCode = (node.parameters as Record<string, unknown>).jsCode;
		const code = typeof rawCode === 'string' ? rawCode : '';
		for (const { pattern, label } of codePatterns) {
			if (pattern.test(code)) {
				findings.push({
					severity: 'warning',
					title: `Dangerous "${label}" usage in Code node "${node.name}"`,
					description: `The Code node uses "${label}" which can execute arbitrary code or access the server.`,
					nodeName: node.name,
					parameterPath: 'jsCode',
				});
			}
		}
	}

	return findings;
}

function checkFanOutBlastRadius(
	workflow: SimpleWorkflow,
	nodeTypeMap: Map<string, INodeTypeDescription>,
): SecurityFinding[] {
	const fanOutThreshold = 5;
	const findings: SecurityFinding[] = [];
	const { nodes, connections } = workflow;
	const nodesByName = new Map(nodes.map((n) => [n.name, n]));

	const triggerNames = nodes.filter((n) => isNodeTrigger(n, nodeTypeMap)).map((n) => n.name);

	for (const triggerName of triggerNames) {
		const visited = new Set<string>();
		const queue = [triggerName];
		while (queue.length > 0) {
			const current = queue.pop()!;
			if (visited.has(current)) continue;
			visited.add(current);
			const nodeConns = connections[current];
			if (!nodeConns) continue;
			for (const connType of Object.values(nodeConns)) {
				for (const outputConns of connType) {
					if (!outputConns) continue;
					for (const conn of outputConns) {
						if (!visited.has(conn.node)) queue.push(conn.node);
					}
				}
			}
		}

		let externalCount = 0;
		for (const nodeName of visited) {
			if (nodeName === triggerName) continue;
			const node = nodesByName.get(nodeName);
			if (node && isNodeExternalService(node, nodeTypeMap)) externalCount++;
		}

		if (externalCount >= fanOutThreshold) {
			findings.push({
				severity: 'warning',
				title: `High fan-out: "${triggerName}" reaches ${externalCount} external services`,
				description: `A single trigger fans out to ${externalCount} external services. A compromised input could affect all of them.`,
				nodeName: triggerName,
			});
		}
	}

	return findings;
}

function checkSsrfRisk(nodes: INode[]): SecurityFinding[] {
	const internalPattern =
		/^https?:\/\/(10\.\d{1,3}\.\d{1,3}\.\d{1,3}|172\.(1[6-9]|2\d|3[01])\.\d{1,3}\.\d{1,3}|192\.168\.\d{1,3}\.\d{1,3}|localhost|127\.\d{1,3}\.\d{1,3}\.\d{1,3}|0\.0\.0\.0)(:|\/|$)/;
	const findings: SecurityFinding[] = [];

	const hasWebhook = nodes.some((n) => n.type === 'n8n-nodes-base.webhook');
	if (!hasWebhook) return findings;

	for (const node of nodes) {
		if (node.type !== 'n8n-nodes-base.httpRequest' || !node.parameters) continue;
		const rawUrl = (node.parameters as Record<string, unknown>).url;
		const url = typeof rawUrl === 'string' ? rawUrl : '';
		if (url && !isExpression(url) && internalPattern.test(url)) {
			findings.push({
				severity: 'warning',
				title: `SSRF risk: webhook with internal URL in "${node.name}"`,
				description:
					'This workflow has a public webhook and an HTTP Request to an internal network address. An attacker could exploit the webhook to probe internal services.',
				nodeName: node.name,
				parameterPath: 'url',
			});
		}
	}

	return findings;
}

function checkAiSecurity(
	workflow: SimpleWorkflow,
	nodeTypeMap: Map<string, INodeTypeDescription>,
): SecurityFinding[] {
	return [
		...checkAiPromptInjection(workflow.nodes),
		...checkSecretsInAiPrompts(workflow.nodes),
		...checkDirectTriggerToAi(workflow, nodeTypeMap),
		...checkOverPrivilegedTools(workflow),
		...checkAiOutputToExternal(workflow, nodeTypeMap),
		...checkAiChaining(workflow),
	];
}

// --- Context Functions ---

/**
 * Strips query string and fragment from a URL to avoid leaking
 * API keys or tokens that may be embedded in query parameters.
 */
function sanitizeUrl(url: string): string {
	try {
		const parsed = new URL(url);
		return `${parsed.protocol}//${parsed.host}${parsed.pathname}`;
	} catch {
		// If URL parsing fails, strip everything after ? or #
		return url.split(/[?#]/)[0];
	}
}

function identifyExternalServices(
	workflow: SimpleWorkflow,
	nodeTypeMap: Map<string, INodeTypeDescription>,
): string[] {
	const services: string[] = [];

	for (const node of workflow.nodes) {
		if (!isNodeExternalService(node, nodeTypeMap)) continue;

		const params = node.parameters as Record<string, unknown>;
		const url = typeof params.url === 'string' ? params.url : undefined;
		const typeName = node.type.replace('n8n-nodes-base.', '');
		const isExpr = url ? isExpression(url) : false;

		if (url && !isExpr) {
			services.push(`${sanitizeUrl(url)} (${node.name}, ${typeName})`);
		} else {
			services.push(`${typeName} (${node.name})`);
		}
	}

	return services;
}

function traceDataFlows(
	workflow: SimpleWorkflow,
	nodeTypeMap: Map<string, INodeTypeDescription>,
): string[] {
	const { nodes, connections } = workflow;
	const paths: string[] = [];

	const triggerNodes = nodes.filter((n) => isNodeTrigger(n, nodeTypeMap));
	if (triggerNodes.length === 0) return paths;

	const nodesByName = new Map(nodes.map((n) => [n.name, n]));

	for (const trigger of triggerNodes) {
		// BFS from trigger, track predecessors for shortest-path reconstruction
		const predecessors = new Map<string, string>();
		const visited = new Set<string>();
		const queue = [trigger.name];
		visited.add(trigger.name);

		while (queue.length > 0) {
			const current = queue.shift()!;
			const nodeConns = connections[current];
			if (!nodeConns) continue;

			for (const connType of Object.values(nodeConns)) {
				for (const outputConns of connType) {
					if (!outputConns) continue;
					for (const conn of outputConns) {
						if (!visited.has(conn.node)) {
							visited.add(conn.node);
							predecessors.set(conn.node, current);
							queue.push(conn.node);
						}
					}
				}
			}
		}

		// Find external service nodes reachable from this trigger
		for (const nodeName of visited) {
			if (nodeName === trigger.name) continue;
			const node = nodesByName.get(nodeName);
			if (!node || !isNodeExternalService(node, nodeTypeMap)) continue;

			// Reconstruct shortest path
			const path: string[] = [nodeName];
			let current = nodeName;
			while (predecessors.has(current)) {
				current = predecessors.get(current)!;
				path.unshift(current);
			}

			if (path.length > 5) {
				paths.push(`${path[0]} → ${path[1]} → ... → ${path[path.length - 1]}`);
			} else {
				paths.push(path.join(' → '));
			}

			if (paths.length >= MAX_DATA_FLOW_PATHS) break;
		}

		if (paths.length >= MAX_DATA_FLOW_PATHS) break;
	}

	return paths;
}

// --- Report Formatting ---

function formatSecurityReport(
	findings: SecurityFinding[],
	workflowOverview: string,
	externalServices: string[],
	dataFlowPaths: string[],
): string {
	const parts: string[] = ['<security_scan_results>'];

	parts.push('<findings>');
	if (findings.length === 0) {
		parts.push('No security issues found.');
	} else {
		const sorted = [...findings].sort(
			(a, b) => (SEVERITY_ORDER[a.severity] ?? 2) - (SEVERITY_ORDER[b.severity] ?? 2),
		);
		for (const f of sorted) {
			const label = SEVERITY_LABELS[f.severity] ?? 'INFO';
			const matched = f.matchedValue ? ` (matched: ${f.matchedValue})` : '';
			parts.push(`- [${label}] ${f.title}${matched}`);
			parts.push(`  ${f.description}`);
		}
	}
	parts.push('</findings>');

	parts.push('<workflow_overview>');
	parts.push(workflowOverview);
	parts.push('</workflow_overview>');

	parts.push('<external_services>');
	if (externalServices.length === 0) {
		parts.push('No external services detected.');
	} else {
		for (const s of externalServices) {
			parts.push(`- ${s}`);
		}
	}
	parts.push('</external_services>');

	parts.push('<data_flow_paths>');
	if (dataFlowPaths.length === 0) {
		parts.push('No data flow paths from triggers detected.');
	} else {
		for (const p of dataFlowPaths) {
			parts.push(`- ${p}`);
		}
	}
	parts.push('</data_flow_paths>');

	parts.push('</security_scan_results>');
	return parts.join('\n');
}

// --- Tool Definition ---

const securityScanSchema = z.object({}).strict().default({});

export const SECURITY_SCAN_TOOL: BuilderToolBase = {
	toolName: 'security_scan',
	displayTitle: 'Scanning for security issues',
};

export function createSecurityScanTool(parsedNodeTypes: INodeTypeDescription[]): BuilderTool {
	const nodeTypeMap = createNodeTypeMap(parsedNodeTypes);

	const dynamicTool = tool(
		(input, config) => {
			const reporter = createProgressReporter(
				config,
				SECURITY_SCAN_TOOL.toolName,
				SECURITY_SCAN_TOOL.displayTitle,
			);

			try {
				const validatedInput = securityScanSchema.parse(input ?? {});
				reporter.start(validatedInput);

				const workflow = getEffectiveWorkflow();
				reportProgress(reporter, 'Analyzing workflow security');

				if (!workflow || workflow.nodes.length === 0) {
					const message = 'Empty workflow - no nodes to scan.';
					reporter.complete({ findingCount: 0 });
					return createSuccessResponse(config, message);
				}

				// Run static security checks
				reportProgress(reporter, 'Running security checks');
				const findings: SecurityFinding[] = [
					...checkHardcodedSecrets(workflow.nodes),
					...checkPiiPatterns(workflow.nodes),
					...checkInsecureConfig(workflow.nodes),
					...checkExpressionRisks(workflow.nodes),
					...checkDataExposure(workflow, nodeTypeMap),
					...checkAiSecurity(workflow, nodeTypeMap),
					...checkCodeInjection(workflow.nodes),
					...checkFanOutBlastRadius(workflow, nodeTypeMap),
					...checkSsrfRisk(workflow.nodes),
				];

				// Build workflow overview (without parameters to avoid leaking sensitive values)
				reportProgress(reporter, 'Building workflow context');
				const overview = mermaidStringify(
					{ workflow },
					{
						includeNodeType: true,
						includeNodeParameters: false,
						includeNodeName: true,
					},
				);

				// Identify external services
				const externalServices = identifyExternalServices(workflow, nodeTypeMap);

				// Trace data flows from triggers to external services
				const dataFlowPaths = traceDataFlows(workflow, nodeTypeMap);

				const message = formatSecurityReport(findings, overview, externalServices, dataFlowPaths);

				reporter.complete({ findingCount: findings.length });
				return createSuccessResponse(config, message);
			} catch (error) {
				if (error instanceof z.ZodError) {
					const validationError = new ValidationError('Invalid input parameters', {
						extra: { errors: error.errors },
					});
					reporter.error(validationError);
					return createErrorResponse(config, validationError);
				}

				const toolError = new ToolExecutionError(
					error instanceof Error ? error.message : 'Failed to run security scan',
					{
						toolName: SECURITY_SCAN_TOOL.toolName,
						cause: error instanceof Error ? error : undefined,
					},
				);

				reporter.error(toolError);
				return createErrorResponse(config, toolError);
			}
		},
		{
			name: SECURITY_SCAN_TOOL.toolName,
			description:
				'Scan the current workflow for security vulnerabilities, hardcoded secrets, PII exposure, insecure configuration, and data flow risks. Returns findings with workflow context for analysis.',
			schema: securityScanSchema,
		},
	);

	return {
		tool: dynamicTool,
		...SECURITY_SCAN_TOOL,
	};
}
