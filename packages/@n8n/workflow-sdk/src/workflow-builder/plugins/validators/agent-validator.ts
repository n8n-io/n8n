/**
 * Agent Validator Plugin
 *
 * Validates AI Agent nodes for common configuration issues.
 */

import type { GraphNode, NodeInstance } from '../../../types/base';
import { containsExpression, containsMalformedExpression } from '../../validation-helpers';
import type { ValidatorPlugin, ValidationIssue, PluginContext } from '../types';

const CHAT_TRIGGER_TYPES = new Set([
	'@n8n/n8n-nodes-langchain.chatTrigger',
	'n8n-nodes-base.chatTrigger',
]);

function workflowHasChatTrigger(nodes: ReadonlyMap<string, GraphNode>): boolean {
	for (const graphNode of nodes.values()) {
		if (CHAT_TRIGGER_TYPES.has(graphNode.instance.type)) {
			return true;
		}
	}
	return false;
}

function usesChatInputPath(text: unknown): boolean {
	return typeof text === 'string' && text.includes('$json.chatInput');
}

/**
 * Validator for AI Agent nodes.
 *
 * Checks for:
 * - Static prompts without expressions (should usually have dynamic input)
 * - Missing system messages
 * - promptType auto / $json.chatInput without a Chat Trigger (e.g. Telegram)
 */
export const agentValidator: ValidatorPlugin = {
	id: 'core:agent',
	name: 'Agent Validator',
	nodeTypes: ['@n8n/n8n-nodes-langchain.agent'],
	priority: 50,

	validateNode(
		node: NodeInstance<string, string, unknown>,
		_graphNode: GraphNode,
		ctx: PluginContext,
	): ValidationIssue[] {
		const issues: ValidationIssue[] = [];
		const params = node.config?.parameters as Record<string, unknown> | undefined;

		if (!params) {
			return issues;
		}

		const promptType = params.promptType as string | undefined;
		const text = params.text;
		const hasChatTrigger = workflowHasChatTrigger(ctx.nodes);

		// promptType auto (default) and $json.chatInput only work with Chat Trigger.
		// Telegram / Webhook / Form need promptType: 'define' with the real path
		// (e.g. $json.message.text).
		const usesAutoPrompt = !promptType || promptType === 'auto';
		if (!hasChatTrigger && (usesAutoPrompt || usesChatInputPath(text))) {
			issues.push({
				code: 'AGENT_CHAT_INPUT_WITHOUT_CHAT_TRIGGER',
				message:
					`'${node.name}' uses promptType: 'auto' and/or $json.chatInput, but this workflow has no Chat Trigger. ` +
					"chatInput only exists on Chat Trigger. For Telegram, Webhook, or Form, set promptType: 'define' " +
					"with the real user-text path (e.g. text: expr('{{ $json.message.text }}')).",
				severity: 'warning',
				violationLevel: 'major',
				nodeName: node.name,
				parameterPath: usesChatInputPath(text) ? 'text' : 'promptType',
			});
		}

		// Skip remaining checks for auto/guardrails mode (undefined defaults to auto)
		if (!promptType || promptType === 'auto' || promptType === 'guardrails') {
			return issues;
		}

		// Check: Static prompt (no expression)
		const hasValidExpression = containsExpression(text);
		const hasMalformedExpression = containsMalformedExpression(text);

		// Only warn about static prompt if there's NO expression at all
		// (MISSING_EXPRESSION_PREFIX will handle malformed expressions)
		if (!text || (!hasValidExpression && !hasMalformedExpression)) {
			issues.push({
				code: 'AGENT_STATIC_PROMPT',
				message: `Is input data required for '${node.name}'? If so, add an expression to the prompt. When following a chat trigger node, use { promptType: 'auto', text: '={{ $json.chatInput }}' }. Or use { promptType: 'define', text: '={{ ... }}' } to add dynamic data like input data.`,
				severity: 'warning',
				nodeName: node.name,
			});
		}

		// Check: No system message
		const options = params.options as Record<string, unknown> | undefined;
		const systemMessage = options?.systemMessage ?? params.systemMessage;
		if (
			!systemMessage ||
			(typeof systemMessage === 'string' && systemMessage.trim().length === 0)
		) {
			issues.push({
				code: 'AGENT_NO_SYSTEM_MESSAGE',
				message: `'${node.name}' has no system message. System-level instructions should be in the system message field.`,
				severity: 'warning',
				nodeName: node.name,
			});
		}

		return issues;
	},
};
