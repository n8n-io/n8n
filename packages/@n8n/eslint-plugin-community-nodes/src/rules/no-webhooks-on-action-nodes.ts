import { AST_NODE_TYPES, type TSESTree } from '@typescript-eslint/utils';

import {
	createRule,
	findArrayLiteralProperty,
	findClassProperty,
	findNodeDescriptionObject,
	findObjectProperty,
	getPropertyKeyName,
	isFileType,
	isNodeTypeClass,
} from '../utils/index.js';

export const NoWebhooksOnActionNodesRule = createRule({
	name: 'no-webhooks-on-action-nodes',
	meta: {
		type: 'problem',
		docs: {
			description: 'Reserve webhook options for trigger nodes',
		},
		messages: {
			webhookOnActionNode:
				'Webhook options are reserved for trigger nodes. Move this to a dedicated trigger node, or have the action node poll instead.',
		},
		schema: [],
	},
	defaultOptions: [],
	create(context) {
		if (!isFileType(context.filename, '.node.ts') || context.filename.endsWith('Trigger.node.ts')) {
			return {};
		}

		return {
			ClassDeclaration(node) {
				if (!isNodeTypeClass(node)) return;

				const description = findNodeDescriptionObject(node);
				const group = description && findArrayLiteralProperty(description, 'group');
				if (
					group?.elements.some(
						(element) => element?.type === AST_NODE_TYPES.Literal && element.value === 'trigger',
					)
				) {
					return;
				}

				const methods = node.body.body.filter(
					(member): member is TSESTree.MethodDefinition =>
						member.type === AST_NODE_TYPES.MethodDefinition && member.kind === 'method',
				);
				if (
					methods.some((method) => ['poll', 'trigger'].includes(getPropertyKeyName(method) ?? ''))
				) {
					return;
				}

				const webhooks = description && findObjectProperty(description, 'webhooks');
				const webhookMethods = findClassProperty(node, 'webhookMethods');
				for (const property of [webhooks, webhookMethods]) {
					if (property) {
						context.report({ node: property.key, messageId: 'webhookOnActionNode' });
					}
				}

				for (const method of methods) {
					if (getPropertyKeyName(method) === 'webhook' && method.value.async) {
						context.report({ node: method.key, messageId: 'webhookOnActionNode' });
					}
				}
			},
		};
	},
});
