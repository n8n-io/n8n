/**
 * Agent Validator Plugin
 *
 * Validates AI Agent nodes for common configuration issues.
 */

import type { GraphNode, NodeInstance } from '../../../types/base';
import { containsExpression, containsMalformedExpression } from '../../validation-helpers';
import type { ValidatorPlugin, ValidationIssue, PluginContext } from '../types';

/**
 * Validator for AI Agent nodes.
 *
 * Checks for:
 * - Static prompts without expressions (should usually have dynamic input)
 * - Missing system messages
 */
export const agentValidator: ValidatorPlugin = {
	id: 'core:agent',
	name: 'Agent Validator',
	nodeTypes: ['@n8n/n8n-nodes-langchain.agent'],
	priority: 50,

	validateNode(
		node: NodeInstance<string, string, unknown>,
		_graphNode: GraphNode,
		_ctx: PluginContext,
	): ValidationIssue[] {
		const issues: ValidationIssue[] = [];
		const params = node.config?.parameters as Record<string, unknown> | undefined;

		if (!params) {
			return issues;
		}

		const promptType = params.promptType as string | undefined;

		// Skip checks for auto/guardrails mode (undefined defaults to auto)
		if (!promptType || promptType === 'auto' || promptType === 'guardrails') {
			return issues;
		}

		// Check: Static prompt (no expression)
		const text = params.text;
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
