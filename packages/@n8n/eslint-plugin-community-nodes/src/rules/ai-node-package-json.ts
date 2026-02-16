import type { TSESTree } from '@typescript-eslint/utils';
import { AST_NODE_TYPES } from '@typescript-eslint/utils';

import { createRule } from '../utils/index.js';

export const AiNodePackageJsonRule = createRule({
	name: 'ai-node-package-json',
	meta: {
		type: 'problem',
		docs: {
			description:
				'Enforce consistency between aiNodeSdkVersion and ai-node-sdk peer dependency in community node packages',
		},
		messages: {
			missingPeerDep:
				'Package declares "aiNodeSdkVersion" but is missing "ai-node-sdk" in peerDependencies. Add "ai-node-sdk": "*" to peerDependencies.',
			missingSdkVersion:
				'Package has "ai-node-sdk" in peerDependencies but is missing "aiNodeSdkVersion" at the top level of package.json.',
			invalidSdkVersion: '"aiNodeSdkVersion" must be a positive integer, got {{ value }}.',
		},
		schema: [],
	},
	defaultOptions: [],
	create(context) {
		if (!context.filename.endsWith('package.json')) {
			return {};
		}

		return {
			ObjectExpression(node: TSESTree.ObjectExpression) {
				// Only process the root object, not nested ones
				if (node.parent?.type === AST_NODE_TYPES.Property) {
					return;
				}

				const aiNodeSdkVersionProp = findProperty(node, 'aiNodeSdkVersion');
				const peerDependenciesProp = findProperty(node, 'peerDependencies');

				const hasAiNodeSdkVersion = aiNodeSdkVersionProp !== undefined;
				const hasAiNodeSdkPeerDep = hasPeerDependency(peerDependenciesProp, 'ai-node-sdk');

				// Validate aiNodeSdkVersion is a positive integer when present
				if (hasAiNodeSdkVersion) {
					const valueNode = aiNodeSdkVersionProp.value;
					if (valueNode.type !== AST_NODE_TYPES.Literal || !isPositiveInteger(valueNode.value)) {
						context.report({
							node: aiNodeSdkVersionProp,
							messageId: 'invalidSdkVersion',
							data: {
								value: String(
									valueNode.type === AST_NODE_TYPES.Literal ? valueNode.value : 'non-literal',
								),
							},
						});
					}
				}

				// If aiNodeSdkVersion is declared, ai-node-sdk must be in peerDependencies
				if (hasAiNodeSdkVersion && !hasAiNodeSdkPeerDep) {
					context.report({
						node: aiNodeSdkVersionProp,
						messageId: 'missingPeerDep',
					});
				}

				// If ai-node-sdk is in peerDependencies, aiNodeSdkVersion must be declared
				if (hasAiNodeSdkPeerDep && !hasAiNodeSdkVersion) {
					context.report({
						node: peerDependenciesProp!,
						messageId: 'missingSdkVersion',
					});
				}
			},
		};
	},
});

function findProperty(
	node: TSESTree.ObjectExpression,
	name: string,
): TSESTree.Property | undefined {
	return node.properties.find(
		(property): property is TSESTree.Property =>
			property.type === AST_NODE_TYPES.Property &&
			property.key.type === AST_NODE_TYPES.Literal &&
			property.key.value === name,
	);
}

function hasPeerDependency(
	peerDependenciesProp: TSESTree.Property | undefined,
	depName: string,
): boolean {
	if (!peerDependenciesProp) return false;
	if (peerDependenciesProp.value.type !== AST_NODE_TYPES.ObjectExpression) return false;

	return peerDependenciesProp.value.properties.some(
		(property) =>
			property.type === AST_NODE_TYPES.Property &&
			property.key.type === AST_NODE_TYPES.Literal &&
			property.key.value === depName,
	);
}

function isPositiveInteger(value: unknown): boolean {
	return typeof value === 'number' && Number.isInteger(value) && value > 0;
}
