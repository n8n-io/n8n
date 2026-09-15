import { AST_NODE_TYPES, type TSESTree } from '@typescript-eslint/utils';

import {
	createRule,
	findClassProperty,
	findObjectProperty,
	isNodeTypeClass,
	resolveIdentifier,
	WEBHOOK_LIFECYCLE_METHODS,
	type WebhookLifecycleMethod,
} from '../utils/index.js';

/**
 * Returns true if the description declares webhook endpoints, indicating the
 * node is a webhook-based trigger that needs a complete lifecycle.
 *
 * Polling triggers (group `['trigger']` without a `webhooks` array) do not
 * register remote webhooks and are intentionally out of scope.
 */
function hasWebhooksDeclared(descriptionValue: TSESTree.ObjectExpression): boolean {
	const webhooksProperty = findObjectProperty(descriptionValue, 'webhooks');
	if (webhooksProperty?.value.type !== AST_NODE_TYPES.ArrayExpression) return false;
	return webhooksProperty.value.elements.length > 0;
}

/** Returns true when the property defines a (possibly async) method named `name`. */
function isMethodProperty(property: TSESTree.ObjectLiteralElement, name: string): boolean {
	if (property.type !== AST_NODE_TYPES.Property) return false;
	if (property.computed) return false;

	const keyMatches =
		(property.key.type === AST_NODE_TYPES.Identifier && property.key.name === name) ||
		(property.key.type === AST_NODE_TYPES.Literal && property.key.value === name);
	if (!keyMatches) return false;

	return (
		property.value.type === AST_NODE_TYPES.FunctionExpression ||
		property.value.type === AST_NODE_TYPES.ArrowFunctionExpression
	);
}

function findMissingMethods(group: TSESTree.ObjectExpression): WebhookLifecycleMethod[] {
	return WEBHOOK_LIFECYCLE_METHODS.filter(
		(method) => !group.properties.some((property) => isMethodProperty(property, method)),
	);
}

export const WebhookLifecycleCompleteRule = createRule({
	name: 'webhook-lifecycle-complete',
	meta: {
		type: 'problem',
		docs: {
			description:
				'Require webhook trigger nodes to implement the complete webhookMethods lifecycle (checkExists, create, delete)',
		},
		messages: {
			missingWebhookMethods:
				'Webhook trigger node is missing the `webhookMethods` property. Implement `checkExists`, `create`, and `delete` to register, verify, and clean up the webhook on the third-party service.',
			emptyWebhookMethods:
				'Webhook trigger node has an empty `webhookMethods` object. Define at least one lifecycle group with `checkExists`, `create`, and `delete` methods.',
			missingLifecycleMethod:
				'Webhook trigger lifecycle is incomplete. `webhookMethods.{{group}}` is missing: {{missing}}. All of `checkExists`, `create`, and `delete` must be implemented.',
		},
		schema: [],
	},
	defaultOptions: [],
	create(context) {
		/**
		 * Reads a value as an object literal, following a name to its declaration
		 * when the object was written once and referred to by that name.
		 */
		function asObjectExpression(
			node: TSESTree.Node | null | undefined,
		): TSESTree.ObjectExpression | null {
			if (!node) return null;
			if (node.type === AST_NODE_TYPES.ObjectExpression) return node;
			if (node.type !== AST_NODE_TYPES.Identifier) return null;

			const declared = resolveIdentifier(context.sourceCode.getScope(node), node);
			return declared?.type === AST_NODE_TYPES.ObjectExpression ? declared : null;
		}

		return {
			ClassDeclaration(node) {
				if (!isNodeTypeClass(node)) return;

				const descriptionProperty = findClassProperty(node, 'description');
				if (!descriptionProperty) return;

				const descriptionValue = asObjectExpression(descriptionProperty.value);
				if (!descriptionValue) return;

				const webhookMethodsProperty = findClassProperty(node, 'webhookMethods');

				if (!hasWebhooksDeclared(descriptionValue) && !webhookMethodsProperty) {
					return;
				}

				if (!webhookMethodsProperty?.value) {
					context.report({
						node: node.id ?? node,
						messageId: 'missingWebhookMethods',
					});
					return;
				}

				const webhookMethods = asObjectExpression(webhookMethodsProperty.value);
				if (!webhookMethods) return;

				if (webhookMethods.properties.length === 0) {
					context.report({
						node: webhookMethodsProperty.key,
						messageId: 'emptyWebhookMethods',
					});
					return;
				}

				for (const groupProperty of webhookMethods.properties) {
					if (groupProperty.type !== AST_NODE_TYPES.Property) continue;

					const group = asObjectExpression(groupProperty.value);
					if (!group) continue;

					const groupName =
						groupProperty.key.type === AST_NODE_TYPES.Identifier
							? groupProperty.key.name
							: groupProperty.key.type === AST_NODE_TYPES.Literal
								? String(groupProperty.key.value)
								: 'default';

					const missing = findMissingMethods(group);
					if (missing.length === 0) continue;

					context.report({
						node: groupProperty.key,
						messageId: 'missingLifecycleMethod',
						data: {
							group: groupName,
							missing: missing.map((m) => `\`${m}\``).join(', '),
						},
					});
				}
			},
		};
	},
});
