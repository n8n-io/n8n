import type { TSESTree, TSESLint } from '@typescript-eslint/utils';
import { AST_NODE_TYPES, ASTUtils } from '@typescript-eslint/utils';

import {
	createRule,
	findArrayLiteralProperty,
	findNodeDescriptionObject,
	findObjectProperty,
	getLiteralValue,
	getPropertyKeyName,
	isFileType,
	isNodeTypeClass,
} from '../utils/index.js';

type DisplayValue =
	| { kind: 'literal'; value: string }
	| {
			kind: 'importedMember';
			binding: NonNullable<ReturnType<typeof ASTUtils.findVariable>>;
			member: string;
	  };

function getDisplayValue(
	node: TSESTree.Node | null,
	sourceCode: TSESLint.SourceCode,
): DisplayValue | null {
	if (!node) return null;

	let value = ASTUtils.getStaticValue(node, sourceCode.getScope(node))?.value;
	if (
		value === undefined &&
		node.type === AST_NODE_TYPES.MemberExpression &&
		node.object.type === AST_NODE_TYPES.Identifier &&
		!node.computed &&
		node.property.type === AST_NODE_TYPES.Identifier
	) {
		const variable = ASTUtils.findVariable(sourceCode.getScope(node), node.object);
		const definition = variable?.defs.length === 1 ? variable.defs[0]?.node : null;
		if (definition?.type === AST_NODE_TYPES.TSEnumDeclaration) {
			const member = definition.body.members.find(
				({ id }) =>
					(id.type === AST_NODE_TYPES.Identifier && id.name === node.property.name) ||
					(id.type === AST_NODE_TYPES.Literal && id.value === node.property.name),
			);
			value = getLiteralValue(member?.initializer ?? null) ?? undefined;
		}
	}

	if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
		return { kind: 'literal', value: `${typeof value}:${String(value)}` };
	}

	if (
		node.type === AST_NODE_TYPES.MemberExpression &&
		node.object.type === AST_NODE_TYPES.Identifier &&
		!node.computed &&
		node.property.type === AST_NODE_TYPES.Identifier
	) {
		const binding = ASTUtils.findVariable(sourceCode.getScope(node), node.object);
		const definition = binding?.defs.length === 1 ? binding.defs[0]?.node : null;
		if (
			binding &&
			(definition?.type === AST_NODE_TYPES.ImportSpecifier ||
				definition?.type === AST_NODE_TYPES.ImportDefaultSpecifier ||
				definition?.type === AST_NODE_TYPES.ImportNamespaceSpecifier)
		) {
			return { kind: 'importedMember', binding, member: node.property.name };
		}
	}

	return null;
}

function areDifferent(left: DisplayValue, right: DisplayValue): boolean {
	if (left.kind === 'literal' && right.kind === 'literal') return left.value !== right.value;
	return (
		left.kind === 'importedMember' &&
		right.kind === 'importedMember' &&
		left.binding === right.binding &&
		left.member !== right.member
	);
}

function getShowConditions(
	element: TSESTree.ArrayExpression['elements'][number],
	sourceCode: TSESLint.SourceCode,
) {
	const conditions = new Map<string, DisplayValue[]>();
	if (element?.type !== AST_NODE_TYPES.ObjectExpression) return conditions;

	const displayOptions = findObjectProperty(element, 'displayOptions');
	if (displayOptions?.value.type !== AST_NODE_TYPES.ObjectExpression) return conditions;

	const show = findObjectProperty(displayOptions.value, 'show');
	if (show?.value.type !== AST_NODE_TYPES.ObjectExpression) return conditions;

	for (const property of show.value.properties) {
		if (
			property.type !== AST_NODE_TYPES.Property ||
			property.value.type !== AST_NODE_TYPES.ArrayExpression
		) {
			continue;
		}

		const name = getPropertyKeyName(property);
		if (!name) continue;

		const values: DisplayValue[] = [];
		for (const valueNode of property.value.elements) {
			const value = getDisplayValue(valueNode, sourceCode);
			if (value === null) {
				values.length = 0;
				break;
			}
			values.push(value);
		}

		if (values.length > 0) conditions.set(name, values);
	}

	return conditions;
}

function getMultiOptionPropertyNames(description: TSESTree.ObjectExpression): Set<string> {
	const names = new Set<string>();
	const properties = findArrayLiteralProperty(description, 'properties');

	for (const element of properties?.elements ?? []) {
		if (element?.type !== AST_NODE_TYPES.ObjectExpression) continue;

		const name = findObjectProperty(element, 'name');
		const type = findObjectProperty(element, 'type');
		if (
			name &&
			type?.value.type === AST_NODE_TYPES.Literal &&
			type.value.value === 'multiOptions'
		) {
			const nameValue = getLiteralValue(name.value);
			if (typeof nameValue === 'string') names.add(nameValue);
		}
	}

	return names;
}

function areMutuallyExclusive(
	left: TSESTree.ArrayExpression['elements'][number],
	right: TSESTree.ArrayExpression['elements'][number],
	multiOptionPropertyNames: Set<string>,
	sourceCode: TSESLint.SourceCode,
): boolean {
	const leftConditions = getShowConditions(left, sourceCode);
	const rightConditions = getShowConditions(right, sourceCode);

	for (const [name, leftValues] of leftConditions) {
		if (multiOptionPropertyNames.has(name)) continue;

		const rightValues = rightConditions.get(name);
		if (
			rightValues &&
			leftValues.every((left) => rightValues.every((right) => areDifferent(left, right)))
		) {
			return true;
		}
	}

	return false;
}

export const SingleCredentialPerNodeRule = createRule({
	name: 'single-credential-per-node',
	meta: {
		type: 'problem',
		docs: {
			description: 'Ensure a node uses only one credential at a time',
		},
		messages: {
			multipleCredentials:
				'A node can use only one credential at a time. Use mutually exclusive displayOptions for alternative authentication methods. Move non-authentication settings to a node property or collection so users can set them with expressions.',
		},
		schema: [],
	},
	defaultOptions: [],
	create(context) {
		if (!isFileType(context.filename, '.node.ts')) return {};

		return {
			ClassDeclaration(node) {
				if (!isNodeTypeClass(node)) return;

				const description = findNodeDescriptionObject(node);
				if (!description) return;
				const credentials = findArrayLiteralProperty(description, 'credentials');
				if (!credentials || credentials.elements.length < 2) return;
				const multiOptionPropertyNames = getMultiOptionPropertyNames(description);

				for (let leftIndex = 0; leftIndex < credentials.elements.length - 1; leftIndex++) {
					for (
						let rightIndex = leftIndex + 1;
						rightIndex < credentials.elements.length;
						rightIndex++
					) {
						const leftCredential = credentials.elements[leftIndex] ?? null;
						const rightCredential = credentials.elements[rightIndex] ?? null;
						if (
							!areMutuallyExclusive(
								leftCredential,
								rightCredential,
								multiOptionPropertyNames,
								context.sourceCode,
							)
						) {
							context.report({ node: credentials, messageId: 'multipleCredentials' });
							return;
						}
					}
				}
			},
		};
	},
});
