import { AST_NODE_TYPES, type TSESTree } from '@typescript-eslint/utils';

import {
	createRule,
	findClassProperty,
	findNodeDescriptionObject,
	findObjectProperty,
	getPropertyKeyName,
	hasTriggerGroup,
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

		const actionNodes = new WeakSet<TSESTree.ClassDeclaration>();
		const resumeUrlPattern = /\$execution\s*\.\s*resumeUrl\b/;
		const hasResumeUrlExpression = (value: string) =>
			[...value.matchAll(/\{\{[\s\S]*?\}\}/g)].some(([expression]) =>
				resumeUrlPattern.test(expression),
			);
		const reportResumeUrl = (node: TSESTree.Node) => {
			const containingClass = context.sourceCode
				.getAncestors(node)
				.reverse()
				.find(
					(ancestor) =>
						ancestor.type === AST_NODE_TYPES.ClassDeclaration ||
						ancestor.type === AST_NODE_TYPES.ClassExpression,
				);
			if (
				containingClass?.type === AST_NODE_TYPES.ClassDeclaration &&
				actionNodes.has(containingClass)
			) {
				context.report({ node, messageId: 'webhookOnActionNode' });
			}
		};

		return {
			ClassDeclaration(node) {
				if (!isNodeTypeClass(node)) return;

				const description = findNodeDescriptionObject(node);
				if (description && hasTriggerGroup(description)) {
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

				actionNodes.add(node);

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
			Literal(node) {
				if (typeof node.value === 'string' && hasResumeUrlExpression(node.value)) {
					reportResumeUrl(node);
				}
			},
			TemplateElement(node) {
				if (hasResumeUrlExpression(node.value.cooked ?? node.value.raw)) {
					reportResumeUrl(node);
				}
			},
			MemberExpression(node) {
				if (
					node.object.type === AST_NODE_TYPES.Identifier &&
					node.object.name === '$execution' &&
					((!node.computed &&
						node.property.type === AST_NODE_TYPES.Identifier &&
						node.property.name === 'resumeUrl') ||
						(node.computed &&
							node.property.type === AST_NODE_TYPES.Literal &&
							node.property.value === 'resumeUrl'))
				) {
					reportResumeUrl(node);
				}
			},
		};
	},
});
