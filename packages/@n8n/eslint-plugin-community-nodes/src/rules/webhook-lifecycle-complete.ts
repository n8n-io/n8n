import { AST_NODE_TYPES, type TSESTree } from '@typescript-eslint/utils';

import {
	createRule,
	findClassProperty,
	findObjectProperty,
	isNodeTypeClass,
} from '../utils/index.js';

const REQUIRED_METHODS = ['checkExists', 'create', 'delete'] as const;
type RequiredMethod = (typeof REQUIRED_METHODS)[number];

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

function findMissingMethods(group: TSESTree.ObjectExpression): RequiredMethod[] {
	return REQUIRED_METHODS.filter(
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
			missingLifecycleMethod:
				'Webhook trigger lifecycle is incomplete. `webhookMethods.{{group}}` is missing: {{missing}}. All of `checkExists`, `create`, and `delete` must be implemented.',
		},
		schema: [],
	},
	defaultOptions: [],
	create(context) {
		return {
			ClassDeclaration(node) {
				if (!isNodeTypeClass(node)) return;

				const descriptionProperty = findClassProperty(node, 'description');
				if (!descriptionProperty) return;

				const descriptionValue = descriptionProperty.value;
				if (descriptionValue?.type !== AST_NODE_TYPES.ObjectExpression) return;

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

				if (webhookMethodsProperty.value.type !== AST_NODE_TYPES.ObjectExpression) {
					return;
				}

				for (const groupProperty of webhookMethodsProperty.value.properties) {
					if (groupProperty.type !== AST_NODE_TYPES.Property) continue;
					if (groupProperty.value.type !== AST_NODE_TYPES.ObjectExpression) continue;

					const groupName =
						groupProperty.key.type === AST_NODE_TYPES.Identifier
							? groupProperty.key.name
							: groupProperty.key.type === AST_NODE_TYPES.Literal
								? String(groupProperty.key.value)
								: 'default';

					const missing = findMissingMethods(groupProperty.value);
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
