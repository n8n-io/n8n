import type { INodeUi } from '@/Interface';
import type { IConnections } from 'n8n-workflow';
import type { SecurityFinding } from '../types';
import { walkParameters } from '../utils/parameterWalker';
import { redactValue } from '../utils/redact';
import {
	isInputTrigger,
	isExternalService,
	isAiNode,
	isAiAgent,
	isDangerousTool,
	getPromptParameters,
} from '../utils/nodeClassification';

/** Known secret patterns — reused from hardcodedSecrets for AI prompt context. */
const SECRET_PATTERNS: Array<{ pattern: RegExp; provider: string }> = [
	{ pattern: /sk_live_[a-zA-Z0-9]{20,}/, provider: 'Stripe' },
	{ pattern: /sk_test_[a-zA-Z0-9]{20,}/, provider: 'Stripe (test)' },
	{ pattern: /ghp_[a-zA-Z0-9]{36,}/, provider: 'GitHub' },
	{ pattern: /gho_[a-zA-Z0-9]{36,}/, provider: 'GitHub OAuth' },
	{ pattern: /ghs_[a-zA-Z0-9]{36,}/, provider: 'GitHub App' },
	{ pattern: /github_pat_[a-zA-Z0-9_]{20,}/, provider: 'GitHub' },
	{ pattern: /xoxb-[0-9]+-[a-zA-Z0-9]+/, provider: 'Slack Bot' },
	{ pattern: /xoxp-[0-9]+-[a-zA-Z0-9]+/, provider: 'Slack User' },
	{ pattern: /AKIA[0-9A-Z]{16}/, provider: 'AWS' },
	{ pattern: /AIza[0-9A-Za-z_-]{35}/, provider: 'Google API' },
	{ pattern: /SG\.[a-zA-Z0-9_-]{22}\.[a-zA-Z0-9_-]{43}/, provider: 'SendGrid' },
	{ pattern: /-----BEGIN (?:RSA |EC |DSA )?PRIVATE KEY-----/, provider: 'Private Key' },
];

/** Matches expressions that reference external / user-controlled input. */
const INPUT_REF_PATTERN = /\$json\b|\$input\b|\$\('|\$node\[/;

/**
 * Check 1 — Prompt Injection Risk
 *
 * Flags AI nodes whose system prompt contains expressions referencing
 * user-controlled data ($json, $input, etc.). An attacker could craft
 * webhook/form input that hijacks the system prompt.
 */
function checkPromptInjection(nodes: INodeUi[]): SecurityFinding[] {
	const findings: SecurityFinding[] = [];
	let counter = 0;

	for (const node of nodes) {
		if (!isAiNode(node) || !node.parameters) continue;

		const promptParams = new Set(getPromptParameters(node));

		walkParameters(node.parameters, (value, path, isExpr) => {
			if (!isExpr) return;

			// Only inspect system-prompt-like parameters
			const topParam = path.split('.')[0];
			if (!promptParams.has(topParam)) return;

			if (INPUT_REF_PATTERN.test(value)) {
				findings.push({
					id: `ai-inject-${++counter}`,
					category: 'expression-risk',
					severity: 'warning',
					title: `User input in AI system prompt of "${node.name}"`,
					description:
						'The system prompt references user-controlled data via an expression. An attacker could craft input that overrides the system instructions (prompt injection).',
					nodeName: node.name,
					nodeId: node.id,
					parameterPath: path,
				});
			}
		});
	}

	return findings;
}

/**
 * Check 2 — Direct Trigger-to-AI Data Flow
 *
 * Flags when a webhook/form trigger connects directly (distance=1)
 * to an AI node via a "main" connection without intermediate filtering.
 * Raw user input flowing straight to an LLM may leak PII to the AI provider.
 */
function checkDirectTriggerToAi(nodes: INodeUi[], connections: IConnections): SecurityFinding[] {
	const findings: SecurityFinding[] = [];
	let counter = 0;

	const nodesByName = new Map(nodes.map((n) => [n.name, n]));

	for (const node of nodes) {
		if (!isInputTrigger(node)) continue;

		const nodeConns = connections[node.name];
		if (!nodeConns) continue;

		// Check "main" output connections (distance = 1)
		const mainOutputs = nodeConns.main;
		if (!mainOutputs) continue;

		for (const outputGroup of mainOutputs) {
			if (!outputGroup) continue;
			for (const conn of outputGroup) {
				const target = nodesByName.get(conn.node);
				if (!target) continue;

				if (isAiNode(target)) {
					findings.push({
						id: `ai-direct-${++counter}`,
						category: 'data-exposure',
						severity: 'warning',
						title: `Trigger data flows directly to AI node "${target.name}"`,
						description: `"${node.name}" connects directly to "${target.name}" without intermediate filtering. Raw user input (potentially containing PII) is sent to the AI provider. Consider adding a Set or Filter node to sanitize the data first.`,
						nodeName: target.name,
						nodeId: target.id,
					});
				}
			}
		}
	}

	return findings;
}

/**
 * Check 3 — Over-Privileged AI Agent Tools
 *
 * Flags AI Agent nodes that have dangerous tools connected (code execution
 * or HTTP access), which grant the LLM the ability to perform arbitrary
 * operations — a data exfiltration and injection risk.
 */
function checkOverPrivilegedTools(nodes: INodeUi[], connections: IConnections): SecurityFinding[] {
	const findings: SecurityFinding[] = [];
	let counter = 0;

	const nodesByName = new Map(nodes.map((n) => [n.name, n]));

	for (const [sourceName, nodeConns] of Object.entries(connections)) {
		// Look for ai_tool connections coming INTO agent nodes
		const toolOutputs = nodeConns.ai_tool;
		if (!toolOutputs) continue;

		for (const outputGroup of toolOutputs) {
			if (!outputGroup) continue;
			for (const conn of outputGroup) {
				const agentNode = nodesByName.get(conn.node);
				const toolNode = nodesByName.get(sourceName);
				if (!agentNode || !toolNode) continue;
				if (!isAiAgent(agentNode)) continue;

				const toolResult = isDangerousTool(toolNode);
				if (toolResult.isDangerous) {
					const toolLabel = toolResult.reason.includes('HTTP') ? 'HTTP Request tool' : 'Code tool';
					findings.push({
						id: `ai-tool-${++counter}`,
						category: 'insecure-config',
						severity: 'info',
						title: `AI Agent "${agentNode.name}" has ${toolLabel}`,
						description: `The tool "${toolNode.name}" gives the AI agent the ability to ${toolResult.reason}. Ensure this is intentional and the agent prompt limits its usage.`,
						nodeName: agentNode.name,
						nodeId: agentNode.id,
					});
				}
			}
		}
	}

	return findings;
}

/**
 * Check 4 — AI Output to External Service
 *
 * Flags when an AI node's "main" output connects directly to an external
 * service. AI outputs are unpredictable and may contain hallucinated data,
 * leaked system prompt fragments, or repeated PII.
 */
function checkAiOutputToExternal(nodes: INodeUi[], connections: IConnections): SecurityFinding[] {
	const findings: SecurityFinding[] = [];
	let counter = 0;

	const nodesByName = new Map(nodes.map((n) => [n.name, n]));

	for (const node of nodes) {
		if (!isAiNode(node)) continue;

		const nodeConns = connections[node.name];
		if (!nodeConns) continue;

		const mainOutputs = nodeConns.main;
		if (!mainOutputs) continue;

		for (const outputGroup of mainOutputs) {
			if (!outputGroup) continue;
			for (const conn of outputGroup) {
				const target = nodesByName.get(conn.node);
				if (!target) continue;

				if (isExternalService(target)) {
					findings.push({
						id: `ai-output-${++counter}`,
						category: 'data-exposure',
						severity: 'info',
						title: `AI output sent directly to "${target.name}"`,
						description: `"${node.name}" outputs directly to the external service "${target.name}". AI outputs may contain hallucinated data or leaked context. Consider adding validation before sending to external services.`,
						nodeName: target.name,
						nodeId: target.id,
					});
				}
			}
		}
	}

	return findings;
}

/**
 * Check 5 — Secrets in AI Prompt Fields
 *
 * Flags when a known secret pattern (API key, token, private key) appears
 * in an AI node's system prompt parameters. This is elevated to critical
 * because the LLM will likely echo the secret in its output.
 */
function checkSecretsInAiPrompts(nodes: INodeUi[]): SecurityFinding[] {
	const findings: SecurityFinding[] = [];
	let counter = 0;

	for (const node of nodes) {
		if (!isAiNode(node) || !node.parameters) continue;

		const promptParams = new Set(getPromptParameters(node));

		walkParameters(node.parameters, (value, path, isExpr) => {
			if (isExpr) return;

			const topParam = path.split('.')[0];
			if (!promptParams.has(topParam)) return;

			for (const { pattern, provider } of SECRET_PATTERNS) {
				if (pattern.test(value)) {
					findings.push({
						id: `ai-secret-${++counter}`,
						category: 'hardcoded-secret',
						severity: 'critical',
						title: `${provider} key in AI prompt of "${node.name}"`,
						description: `A ${provider} secret was found in the system prompt. The LLM will likely echo it in responses. Move it to n8n credentials.`,
						nodeName: node.name,
						nodeId: node.id,
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

/**
 * Check 6 — AI Agent Chaining Without Guardrails
 *
 * Flags when one AI node's main output connects directly to another AI node.
 * Chained LLMs amplify hallucination risk and can propagate prompt injection
 * from the first model to the second.
 */
function checkAiChaining(nodes: INodeUi[], connections: IConnections): SecurityFinding[] {
	const findings: SecurityFinding[] = [];
	let counter = 0;

	const nodesByName = new Map(nodes.map((n) => [n.name, n]));

	for (const node of nodes) {
		if (!isAiNode(node)) continue;

		const nodeConns = connections[node.name];
		if (!nodeConns) continue;

		const mainOutputs = nodeConns.main;
		if (!mainOutputs) continue;

		for (const outputGroup of mainOutputs) {
			if (!outputGroup) continue;
			for (const conn of outputGroup) {
				const target = nodesByName.get(conn.node);
				if (!target) continue;

				if (isAiNode(target)) {
					findings.push({
						id: `ai-chain-${++counter}`,
						category: 'data-exposure',
						severity: 'warning',
						title: `AI node "${node.name}" chains directly to AI node "${target.name}"`,
						description:
							'Chained AI nodes amplify hallucination risk and can propagate prompt injection. Consider adding a validation or filtering step between them.',
						nodeName: target.name,
						nodeId: target.id,
					});
				}
			}
		}
	}

	return findings;
}

/**
 * Runs all AI-specific security checks.
 */
export function checkAiSecurity(nodes: INodeUi[], connections: IConnections): SecurityFinding[] {
	return [
		...checkPromptInjection(nodes),
		...checkSecretsInAiPrompts(nodes),
		...checkDirectTriggerToAi(nodes, connections),
		...checkOverPrivilegedTools(nodes, connections),
		...checkAiOutputToExternal(nodes, connections),
		...checkAiChaining(nodes, connections),
	];
}
