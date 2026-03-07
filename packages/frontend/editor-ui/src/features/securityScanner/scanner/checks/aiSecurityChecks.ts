import type { INodeUi } from '@/Interface';
import { findingId, type ScanContext, type SecurityFinding } from '../types';
import { walkParameters } from '../utils/parameterWalker';
import { redactValue } from '../utils/redact';
import { SECRET_PATTERNS } from './hardcodedSecrets';
import {
	isInputTrigger,
	isExternalService,
	isAiNode,
	isAiAgent,
	isDangerousTool,
	getPromptParameters,
} from '../utils/nodeClassification';

/** Matches expressions that reference external / user-controlled input. */
const INPUT_REF_PATTERN = /\$json\b|\$input\b|\$\('|\$node\[/;

/**
 * Prompt Injection Risk — flags AI nodes whose system prompt contains
 * expressions referencing user-controlled data ($json, $input, etc.).
 */
function checkPromptInjection(nodes: INodeUi[]): SecurityFinding[] {
	const findings: SecurityFinding[] = [];

	for (const node of nodes) {
		if (!isAiNode(node) || !node.parameters) continue;

		const promptParams = new Set(getPromptParameters(node));

		walkParameters(node.parameters, (value, path, isExpr) => {
			if (!isExpr) return;

			const topParam = path.split('.')[0];
			if (!promptParams.has(topParam)) return;

			if (INPUT_REF_PATTERN.test(value)) {
				findings.push({
					id: findingId('ai-inject', node.id, path),
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
 * Direct Trigger-to-AI Data Flow — flags when a webhook/form trigger
 * connects directly (distance=1) to an AI node without intermediate filtering.
 */
function checkDirectTriggerToAi(ctx: ScanContext): SecurityFinding[] {
	const findings: SecurityFinding[] = [];
	const { nodes, connections, nodesByName } = ctx;

	for (const node of nodes) {
		if (!isInputTrigger(node)) continue;

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
						id: findingId('ai-direct', target.id),
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
 * Over-Privileged AI Agent Tools — flags AI Agent nodes that have dangerous
 * tools connected (code execution or HTTP access).
 */
function checkOverPrivilegedTools(ctx: ScanContext): SecurityFinding[] {
	const findings: SecurityFinding[] = [];
	const { connections, nodesByName } = ctx;

	for (const [sourceName, nodeConns] of Object.entries(connections)) {
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
						id: findingId('ai-tool', agentNode.id, toolNode.id),
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
 * AI Output to External Service — flags when an AI node's output connects
 * directly to an external service without validation.
 */
function checkAiOutputToExternal(ctx: ScanContext): SecurityFinding[] {
	const findings: SecurityFinding[] = [];
	const { nodes, connections, nodesByName } = ctx;

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
						id: findingId('ai-output', target.id),
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
 * Secrets in AI Prompt Fields — flags known secret patterns in AI system
 * prompt parameters. Elevated to critical because the LLM will echo them.
 */
function checkSecretsInAiPrompts(nodes: INodeUi[]): SecurityFinding[] {
	const findings: SecurityFinding[] = [];

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
						id: findingId('ai-secret', node.id, path),
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
 * AI Agent Chaining — flags when one AI node's output connects directly
 * to another AI node, amplifying hallucination and injection risk.
 */
function checkAiChaining(ctx: ScanContext): SecurityFinding[] {
	const findings: SecurityFinding[] = [];
	const { nodes, connections, nodesByName } = ctx;

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
						id: findingId('ai-chain', target.id, node.id),
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
export function checkAiSecurity(ctx: ScanContext): SecurityFinding[] {
	return [
		...checkPromptInjection(ctx.nodes),
		...checkSecretsInAiPrompts(ctx.nodes),
		...checkDirectTriggerToAi(ctx),
		...checkOverPrivilegedTools(ctx),
		...checkAiOutputToExternal(ctx),
		...checkAiChaining(ctx),
	];
}
