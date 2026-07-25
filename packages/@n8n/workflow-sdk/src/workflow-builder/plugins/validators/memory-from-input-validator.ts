/**
 * Memory From-Input Validator
 *
 * `sessionIdType: 'fromInput'` (the default) only works with a connected Chat
 * Trigger. For Telegram / Webhook / Form / other triggers, switch to
 * `customKey` and set `sessionKey` explicitly.
 */

import { isRecord } from '@n8n/utils/is-record';

import type { GraphNode, NodeInstance } from '../../../types/base';
import type { PluginContext, ValidationIssue, ValidatorPlugin } from '../types';

const MEMORY_SUBNODE_TYPE = 'ai_memory';
const CHAT_TRIGGER_TYPES = new Set([
	'@n8n/n8n-nodes-langchain.chatTrigger',
	'n8n-nodes-base.chatTrigger',
]);

function hasSubnodeType(
	node: NodeInstance<string, string, unknown>,
): node is NodeInstance<string, string, unknown> & { readonly _subnodeType: string } {
	return '_subnodeType' in node && typeof node._subnodeType === 'string';
}

function isMemorySubnode(node: NodeInstance<string, string, unknown>): boolean {
	return hasSubnodeType(node) && node._subnodeType === MEMORY_SUBNODE_TYPE;
}

function usesFromInputSessionId(parameters: Record<string, unknown>): boolean {
	// Default when omitted is fromInput on Buffer Window memory.
	return parameters.sessionIdType === undefined || parameters.sessionIdType === 'fromInput';
}

function workflowHasChatTrigger(nodes: ReadonlyMap<string, GraphNode>): boolean {
	for (const graphNode of nodes.values()) {
		if (CHAT_TRIGGER_TYPES.has(graphNode.instance.type)) {
			return true;
		}
	}
	return false;
}

/**
 * Validator for memory sessionIdType: fromInput without a Chat Trigger.
 */
export const memoryFromInputValidator: ValidatorPlugin = {
	id: 'core:memory-from-input',
	name: 'Memory From-Input Validator',
	priority: 49,

	validateNode(
		node: NodeInstance<string, string, unknown>,
		_graphNode: GraphNode,
		ctx: PluginContext,
	): ValidationIssue[] {
		if (!isMemorySubnode(node)) {
			return [];
		}

		const parameters = node.config?.parameters;
		if (!isRecord(parameters) || !usesFromInputSessionId(parameters)) {
			return [];
		}

		if (workflowHasChatTrigger(ctx.nodes)) {
			return [];
		}

		return [
			{
				code: 'MEMORY_FROM_INPUT_WITHOUT_CHAT_TRIGGER',
				message:
					`'${node.name}' uses sessionIdType: 'fromInput' (the default), but this workflow has no Chat Trigger. ` +
					'fromInput only works with a connected Chat Trigger. For Telegram, Webhook, Form, or other triggers, ' +
					"set sessionIdType: 'customKey' and sessionKey explicitly (e.g. nodeJson(trigger, 'message.chat.id')).",
				severity: 'warning',
				violationLevel: 'major',
				nodeName: node.name,
				parameterPath: 'sessionIdType',
			},
		];
	},
};
