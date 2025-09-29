import { TSESTree, AST_NODE_TYPES } from '@typescript-eslint/utils';

function implementsInterface(node: TSESTree.ClassDeclaration, interfaceName: string): boolean {
	return (
		node.implements?.some(
			(impl) =>
				impl.type === 'TSClassImplements' &&
				impl.expression.type === 'Identifier' &&
				impl.expression.name === interfaceName,
		) ?? false
	);
}

export function isNodeTypeClass(node: TSESTree.ClassDeclaration): boolean {
	if (implementsInterface(node, 'INodeType')) {
		return true;
	}

	if (node.superClass?.type === 'Identifier' && node.superClass.name === 'Node') {
		return true;
	}

	return false;
}

export function isCredentialTypeClass(node: TSESTree.ClassDeclaration): boolean {
	return implementsInterface(node, 'ICredentialType');
}

export function findClassProperty(
	node: TSESTree.ClassDeclaration,
	propertyName: string,
): TSESTree.PropertyDefinition | null {
	const property = node.body.body.find(
		(member) =>
			member.type === 'PropertyDefinition' &&
			member.key?.type === 'Identifier' &&
			member.key.name === propertyName,
	);
	return property?.type === 'PropertyDefinition' ? property : null;
}

export function findObjectProperty(
	obj: TSESTree.ObjectExpression,
	propertyName: string,
): TSESTree.Property | null {
	const property = obj.properties.find(
		(prop) =>
			prop.type === 'Property' && prop.key.type === 'Identifier' && prop.key.name === propertyName,
	);
	return property?.type === 'Property' ? property : null;
}

export function getLiteralValue(node: TSESTree.Node | null): string | boolean | number | null {
	if (node?.type === 'Literal') {
		return node.value as string | boolean | number | null;
	}
	return null;
}

export function getStringLiteralValue(node: TSESTree.Node | null): string | null {
	const value = getLiteralValue(node);
	return typeof value === 'string' ? value : null;
}

export function getModulePath(node: TSESTree.Node | null): string | null {
	const stringValue = getStringLiteralValue(node);
	if (stringValue) {
		return stringValue;
	}

	if (
		node?.type === 'TemplateLiteral' &&
		node.expressions.length === 0 &&
		node.quasis.length === 1
	) {
		return node.quasis[0]?.value.cooked ?? null;
	}

	return null;
}

export function getBooleanLiteralValue(node: TSESTree.Node | null): boolean | null {
	const value = getLiteralValue(node);
	return typeof value === 'boolean' ? value : null;
}

export function findArrayLiteralProperty(
	obj: TSESTree.ObjectExpression,
	propertyName: string,
): TSESTree.ArrayExpression | null {
	const property = findObjectProperty(obj, propertyName);
	if (property?.value.type === 'ArrayExpression') {
		return property.value;
	}
	return null;
}

export function hasArrayLiteralValue(
	node: TSESTree.PropertyDefinition,
	searchValue: string,
): boolean {
	if (node.value?.type !== 'ArrayExpression') return false;

	return node.value.elements.some(
		(element) =>
			element?.type === 'Literal' &&
			typeof element.value === 'string' &&
			element.value === searchValue,
	);
}

export function getTopLevelObjectInJson(
	node: TSESTree.ObjectExpression,
): TSESTree.ObjectExpression | null {
	if (node.parent?.type === AST_NODE_TYPES.Property) {
		return null;
	}
	return node;
}

export function isFileType(filename: string, extension: string): boolean {
	return filename.endsWith(extension);
}

export function isDirectRequireCall(node: TSESTree.CallExpression): boolean {
	return (
		node.callee.type === 'Identifier' && node.callee.name === 'require' && node.arguments.length > 0
	);
}

export function isRequireMemberCall(node: TSESTree.CallExpression): boolean {
	return (
		node.callee.type === 'MemberExpression' &&
		node.callee.object.type === 'Identifier' &&
		node.callee.object.name === 'require' &&
		node.arguments.length > 0
	);
}

export function extractCredentialInfoFromArray(
	element: TSESTree.ArrayExpression['elements'][number],
): { name: string; testedBy?: string; node: TSESTree.Node } | null {
	if (!element) return null;

	const stringValue = getStringLiteralValue(element);
	if (stringValue) {
		return { name: stringValue, node: element };
	}

	if (element.type === 'ObjectExpression') {
		const nameProperty = findObjectProperty(element, 'name');
		const testedByProperty = findObjectProperty(element, 'testedBy');

		if (nameProperty) {
			const nameValue = getStringLiteralValue(nameProperty.value);
			const testedByValue = testedByProperty
				? getStringLiteralValue(testedByProperty.value)
				: undefined;

			if (nameValue) {
				return {
					name: nameValue,
					testedBy: testedByValue || undefined,
					node: nameProperty.value,
				};
			}
		}
	}

	return null;
}

export function extractCredentialNameFromArray(
	element: TSESTree.ArrayExpression['elements'][number],
): { name: string; node: TSESTree.Node } | null {
	const info = extractCredentialInfoFromArray(element);
	return info ? { name: info.name, node: info.node } : null;
}
