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
 * Strips `as` / `satisfies` / `!` / type assertions to reach the value they
 * annotate. Annotating a value says nothing about what it holds, so the rule
 * reads through them everywhere rather than losing sight of the node.
 */
function unwrapTypeAnnotations(node: TSESTree.Node): TSESTree.Node {
	switch (node.type) {
		case AST_NODE_TYPES.TSAsExpression:
		case AST_NODE_TYPES.TSSatisfiesExpression:
		case AST_NODE_TYPES.TSNonNullExpression:
		case AST_NODE_TYPES.TSTypeAssertion:
			return unwrapTypeAnnotations(node.expression);
		default:
			return node;
	}
}

/** Returns the value as an object literal, or undefined when it is not one. */
function asObjectExpression(
	node: TSESTree.Node | null | undefined,
): TSESTree.ObjectExpression | undefined {
	if (!node) return undefined;

	const value = unwrapTypeAnnotations(node);
	return value.type === AST_NODE_TYPES.ObjectExpression ? value : undefined;
}

/**
 * Returns true if the description declares webhook endpoints, indicating the
 * node is a webhook-based trigger that needs a complete lifecycle.
 *
 * Polling triggers (group `['trigger']` without a `webhooks` array) do not
 * register remote webhooks and are intentionally out of scope.
 */
function hasWebhooksDeclared(descriptionValue: TSESTree.ObjectExpression): boolean {
	const webhooksProperty = findObjectProperty(descriptionValue, 'webhooks');
	if (!webhooksProperty) return false;

	const webhooks = unwrapTypeAnnotations(webhooksProperty.value);
	if (webhooks.type !== AST_NODE_TYPES.ArrayExpression) return false;
	return webhooks.elements.length > 0;
}

/**
 * Returns true when the value supplies an implementation. A method may be
 * written inline or handed over as a reference (`{ checkExists }`,
 * `{ delete: removeWebhook }`, `{ create: hooks.create }`), which is just as
 * implemented as a function expression. `undefined` is an identifier too, but
 * it supplies nothing.
 */
function isImplementation(node: TSESTree.Node): boolean {
	const value = unwrapTypeAnnotations(node);

	switch (value.type) {
		case AST_NODE_TYPES.FunctionExpression:
		case AST_NODE_TYPES.ArrowFunctionExpression:
		case AST_NODE_TYPES.MemberExpression:
			return true;
		case AST_NODE_TYPES.Identifier:
			return value.name !== 'undefined';
		default:
			return false;
	}
}

/** Returns true when the property states the key `name`, whatever value it gives it. */
function declaresKey(
	property: TSESTree.ObjectLiteralElement,
	name: string,
): property is TSESTree.Property {
	if (property.type !== AST_NODE_TYPES.Property) return false;
	if (property.computed) return false;

	return (
		(property.key.type === AST_NODE_TYPES.Identifier && property.key.name === name) ||
		(property.key.type === AST_NODE_TYPES.Literal && property.key.value === name)
	);
}

/** Returns true when the property supplies a method named `name`. */
function isMethodProperty(property: TSESTree.ObjectLiteralElement, name: string): boolean {
	return declaresKey(property, name) && isImplementation(property.value);
}

/**
 * Whatever a spread carries in cannot be read from the class, so only the
 * properties written after the last one settle the group. Everything before it
 * may be replaced by that spread, and the spread itself may fill in a key the
 * group never mentions.
 */
function conclusiveProperties(
	group: TSESTree.ObjectExpression,
): [properties: TSESTree.ObjectLiteralElement[], spreads: boolean] {
	let lastSpread = -1;
	group.properties.forEach((property, index) => {
		if (property.type === AST_NODE_TYPES.SpreadElement) lastSpread = index;
	});

	return [group.properties.slice(lastSpread + 1), lastSpread !== -1];
}

function findMissingMethods(group: TSESTree.ObjectExpression): WebhookLifecycleMethod[] {
	const [properties, spreads] = conclusiveProperties(group);

	return WEBHOOK_LIFECYCLE_METHODS.filter((method) => {
		const declared = properties.find((property): property is TSESTree.Property =>
			declaresKey(property, method),
		);

		// A key stated last says what the method really is, `delete: undefined`
		// included. Otherwise a spread leaves it open, and its absence proves
		// nothing; without one, an absent key is simply missing.
		if (declared) return !isImplementation(declared.value);
		return !spreads;
	});
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
