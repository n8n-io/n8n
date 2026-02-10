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
					remediation:
						'1. Move user-controlled data from the system prompt to the user message input instead.\n2. Keep the system prompt static with fixed instructions.\n3. If dynamic content is needed in the prompt, sanitize and validate the input before interpolation.\n4. Add output validation to detect if the AI response was hijacked.',
					nodeName: node.name,
					nodeId: node.id,
					nodeType: node.type,
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
						remediation:
							'1. Add a Set or Filter node between the trigger and the AI node.\n2. Strip any PII or sensitive fields before passing data to the AI provider.\n3. Only forward the specific fields the AI needs to process.',
						nodeName: target.name,
						nodeId: target.id,
						nodeType: target.type,
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
						remediation:
							"1. Review whether the AI agent truly needs this tool.\n2. If using the HTTP Request tool, restrict it to specific allowed URLs in the tool configuration.\n3. If using the Code tool, limit the operations the generated code can perform.\n4. Add clear constraints in the agent's system prompt about when and how to use the tool.",
						nodeName: agentNode.name,
						nodeId: agentNode.id,
						nodeType: agentNode.type,
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
						remediation:
							'1. Add a validation or Set node between the AI output and the external service.\n2. Check AI responses for expected format before forwarding.\n3. Strip any system prompt fragments or unexpected content from the AI output.\n4. Consider adding a human-in-the-loop approval step for sensitive operations.',
						nodeName: target.name,
						nodeId: target.id,
						nodeType: target.type,
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

		walkParameters(node.parameters, (value, path) => {
			const topParam = path.split('.')[0];
			if (!promptParams.has(topParam)) return;

			for (const { pattern, provider } of SECRET_PATTERNS) {
				const match = pattern.exec(value);
				if (match) {
					findings.push({
						id: `ai-secret-${++counter}`,
						category: 'hardcoded-secret',
						severity: 'critical',
						title: `${provider} key in AI prompt of "${node.name}"`,
						description: `A ${provider} secret was found in the system prompt. The LLM will likely echo it in responses. Move it to n8n credentials.`,
						remediation:
							'1. Immediately remove the secret from the system prompt.\n2. Create an n8n credential for this service.\n3. Reference the credential in the appropriate node instead of embedding the key in the prompt.\n4. Rotate the exposed key since it may have been sent to the AI provider.',
						nodeName: node.name,
						nodeId: node.id,
						nodeType: node.type,
						parameterPath: path,
						matchedValue: redactValue(match[0]),
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
						remediation:
							"1. Add a Set or Filter node between the two AI nodes to validate the first AI's output.\n2. Check for expected response format before passing to the second AI node.\n3. Consider whether both AI steps are necessary or if they can be combined into one.\n4. Add output length limits to prevent prompt injection propagation.",
						nodeName: target.name,
						nodeId: target.id,
						nodeType: target.type,
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
