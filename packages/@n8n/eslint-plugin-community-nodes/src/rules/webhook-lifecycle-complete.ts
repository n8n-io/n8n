import { AST_NODE_TYPES, type TSESTree } from '@typescript-eslint/utils';

import {
	createRule,
	findClassProperty,
	findObjectProperty,
	isNodeTypeClass,
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

/**
 * Returns true when the value supplies an implementation. A method may be
 * written inline or handed over as a reference (`{ checkExists }`,
 * `{ delete: removeWebhook }`, `{ create: hooks.create }`), which is just as
 * implemented as a function expression. `undefined` is an identifier too, but
 * it supplies nothing.
 */
function isImplementation(node: TSESTree.Node): boolean {
	switch (node.type) {
		case AST_NODE_TYPES.FunctionExpression:
		case AST_NODE_TYPES.ArrowFunctionExpression:
		case AST_NODE_TYPES.MemberExpression:
			return true;
		case AST_NODE_TYPES.Identifier:
			return node.name !== 'undefined';
		case AST_NODE_TYPES.TSAsExpression:
		case AST_NODE_TYPES.TSSatisfiesExpression:
		case AST_NODE_TYPES.TSNonNullExpression:
		case AST_NODE_TYPES.TSTypeAssertion:
			return isImplementation(node.expression);
		default:
			return false;
	}
}

/** Returns true when the property supplies a method named `name`. */
function isMethodProperty(property: TSESTree.ObjectLiteralElement, name: string): boolean {
	if (property.type !== AST_NODE_TYPES.Property) return false;
	if (property.computed) return false;

	const keyMatches =
		(property.key.type === AST_NODE_TYPES.Identifier && property.key.name === name) ||
		(property.key.type === AST_NODE_TYPES.Literal && property.key.value === name);
	if (!keyMatches) return false;

	return isImplementation(property.value);
}

/** A group built up by spreading another object does not list its methods. */
function isComposedBySpread(group: TSESTree.ObjectExpression): boolean {
	return group.properties.some((property) => property.type === AST_NODE_TYPES.SpreadElement);
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

				if (webhookMethodsProperty.value.properties.length === 0) {
					context.report({
						node: webhookMethodsProperty.key,
						messageId: 'emptyWebhookMethods',
					});
					return;
				}

				for (const groupProperty of webhookMethodsProperty.value.properties) {
					if (groupProperty.type !== AST_NODE_TYPES.Property) continue;
					if (groupProperty.value.type !== AST_NODE_TYPES.ObjectExpression) continue;
					if (isComposedBySpread(groupProperty.value)) continue;

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
