import type { TSESLint, TSESTree } from '@typescript-eslint/utils';
import { AST_NODE_TYPES } from '@typescript-eslint/utils';

import { createRule, findJsonProperty, getTopLevelObjectInJson } from '../utils/index.js';

type MessageIds =
	| 'missingN8nObject'
	| 'wrongLocationApiVersion'
	| 'missingNodesApiVersion'
	| 'invalidNodesApiVersion'
	| 'missingN8nNodes'
	| 'n8nNodesNotArray'
	| 'emptyN8nNodes'
	| 'n8nCredentialsNotArray'
	| 'nodePathNotString'
	| 'nodePathNotInDist'
	| 'credentialPathNotString'
	| 'credentialPathNotInDist'
	| 'invalidStrict';

type Context = TSESLint.RuleContext<MessageIds, []>;

export const N8nObjectValidationRule = createRule<[], MessageIds>({
	name: 'n8n-object-validation',
	meta: {
		type: 'problem',
		docs: {
			description:
				'Validate the structure of the "n8n" object in community node package.json (required keys, types, and dist/ paths)',
		},
		messages: {
			missingN8nObject:
				'Community node package.json must contain an "n8n" object describing the package.',
			wrongLocationApiVersion:
				'"n8nNodesApiVersion" must be inside the "n8n" section, not at the root level of package.json.',
			missingNodesApiVersion:
				'The "n8n" object must declare "n8nNodesApiVersion" (a positive integer).',
			invalidNodesApiVersion:
				'"n8n.n8nNodesApiVersion" must be a positive integer, got {{ value }}.',
			missingN8nNodes: 'The "n8n" object must declare "nodes" as an array of "dist/" paths.',
			n8nNodesNotArray: '"n8n.nodes" must be an array of "dist/" paths.',
			emptyN8nNodes: '"n8n.nodes" must contain at least one path.',
			n8nCredentialsNotArray: '"n8n.credentials" must be an array of "dist/" paths.',
			nodePathNotString: 'Each entry in "n8n.nodes" must be a string starting with "dist/".',
			nodePathNotInDist:
				'Path "{{ path }}" in "n8n.nodes" must start with "dist/" (compiled output).',
			credentialPathNotString:
				'Each entry in "n8n.credentials" must be a string starting with "dist/".',
			credentialPathNotInDist:
				'Path "{{ path }}" in "n8n.credentials" must start with "dist/" (compiled output).',
			invalidStrict: '"n8n.strict" must be a boolean, got {{ value }}.',
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
				const root = getTopLevelObjectInJson(node);
				if (!root) return;

				// Catch n8nNodesApiVersion accidentally placed at root level.
				const rootApiVersionProp = findJsonProperty(root, 'n8nNodesApiVersion');
				if (rootApiVersionProp) {
					context.report({
						node: rootApiVersionProp,
						messageId: 'wrongLocationApiVersion',
					});
				}

				const n8nProp = findJsonProperty(root, 'n8n');
				if (!n8nProp) {
					context.report({
						node: root,
						messageId: 'missingN8nObject',
					});
					return;
				}

				if (n8nProp.value.type !== AST_NODE_TYPES.ObjectExpression) {
					context.report({
						node: n8nProp,
						messageId: 'missingN8nObject',
					});
					return;
				}

				const n8nObject = n8nProp.value;

				validateApiVersion(context, n8nObject);
				validateNodes(context, n8nObject);
				validateCredentials(context, n8nObject);
				validateStrict(context, n8nObject);
			},
		};
	},
});

function validateApiVersion(context: Context, n8nObject: TSESTree.ObjectExpression): void {
	const apiVersionProp = findJsonProperty(n8nObject, 'n8nNodesApiVersion');
	if (!apiVersionProp) {
		context.report({ node: n8nObject, messageId: 'missingNodesApiVersion' });
		return;
	}

	const valueNode = apiVersionProp.value;
	if (valueNode.type !== AST_NODE_TYPES.Literal || !isPositiveInteger(valueNode.value)) {
		context.report({
			node: apiVersionProp,
			messageId: 'invalidNodesApiVersion',
			data: {
				value: String(valueNode.type === AST_NODE_TYPES.Literal ? valueNode.value : 'non-literal'),
			},
		});
	}
}

function validateStrict(context: Context, n8nObject: TSESTree.ObjectExpression): void {
	const strictProp = findJsonProperty(n8nObject, 'strict');
	if (!strictProp) return; // optional

	const valueNode = strictProp.value;
	if (valueNode.type !== AST_NODE_TYPES.Literal || typeof valueNode.value !== 'boolean') {
		context.report({
			node: strictProp,
			messageId: 'invalidStrict',
			data: {
				value: String(valueNode.type === AST_NODE_TYPES.Literal ? valueNode.value : 'non-literal'),
			},
		});
	}
}

function validateNodes(context: Context, n8nObject: TSESTree.ObjectExpression): void {
	const nodesProp = findJsonProperty(n8nObject, 'nodes');
	if (!nodesProp) {
		context.report({ node: n8nObject, messageId: 'missingN8nNodes' });
		return;
	}

	if (nodesProp.value.type !== AST_NODE_TYPES.ArrayExpression) {
		context.report({ node: nodesProp, messageId: 'n8nNodesNotArray' });
		return;
	}

	const elements = nodesProp.value.elements;
	if (elements.length === 0) {
		context.report({ node: nodesProp, messageId: 'emptyN8nNodes' });
		return;
	}

	validatePathArray(context, elements, 'nodePathNotString', 'nodePathNotInDist');
}

function validateCredentials(context: Context, n8nObject: TSESTree.ObjectExpression): void {
	const credentialsProp = findJsonProperty(n8nObject, 'credentials');
	if (!credentialsProp) return; // optional

	if (credentialsProp.value.type !== AST_NODE_TYPES.ArrayExpression) {
		context.report({ node: credentialsProp, messageId: 'n8nCredentialsNotArray' });
		return;
	}

	validatePathArray(
		context,
		credentialsProp.value.elements,
		'credentialPathNotString',
		'credentialPathNotInDist',
	);
}

function validatePathArray(
	context: Context,
	elements: TSESTree.ArrayExpression['elements'],
	notStringMessageId: 'nodePathNotString' | 'credentialPathNotString',
	notInDistMessageId: 'nodePathNotInDist' | 'credentialPathNotInDist',
): void {
	for (const element of elements) {
		if (!element) continue;
		if (element.type !== AST_NODE_TYPES.Literal || typeof element.value !== 'string') {
			context.report({ node: element, messageId: notStringMessageId });
			continue;
		}
		if (!element.value.startsWith('dist/')) {
			context.report({
				node: element,
				messageId: notInDistMessageId,
				data: { path: element.value },
			});
		}
	}
}

function isPositiveInteger(value: unknown): boolean {
	return typeof value === 'number' && Number.isInteger(value) && value > 0;
}
