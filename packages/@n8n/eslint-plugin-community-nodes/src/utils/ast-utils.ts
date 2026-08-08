import type { TSESTree } from '@typescript-eslint/utils';
import { AST_NODE_TYPES, ASTUtils, TSESLint } from '@typescript-eslint/utils';
import { distance } from 'fastest-levenshtein';

/**
 * True when a reference could change what the name stands for, or change the
 * value it already holds. `const` fixes the binding and not the object behind
 * it, and a function declaration fixes neither, so a name is only worth
 * following when nothing in the file can touch it after it is declared.
 */
function canChangeValue(reference: TSESLint.Scope.Reference): boolean {
	// The declaration writes the value; anything later replaces it.
	if (reference.isWrite() && !reference.init) return true;

	// Follow `value.a.b` up to the outermost property read, since that is what
	// the surrounding code actually acts on.
	let member: TSESTree.Node = reference.identifier;
	while (
		member.parent?.type === AST_NODE_TYPES.MemberExpression &&
		member.parent.object === member
	) {
		member = member.parent;
	}

	const owner = member.parent;
	if (owner === undefined) return false;

	// `Object.assign(value.default, ...)`: handing the object to a call gives
	// that call the chance to fill it in.
	if (
		(owner.type === AST_NODE_TYPES.CallExpression || owner.type === AST_NODE_TYPES.NewExpression) &&
		owner.arguments.some((argument) => argument === member)
	) {
		return true;
	}

	// `value.a.b = fn`, `delete value.a`, `value.a++`: the binding is untouched
	// while what it holds is not.
	return (
		(owner.type === AST_NODE_TYPES.AssignmentExpression && owner.left === member) ||
		owner.type === AST_NODE_TYPES.UpdateExpression ||
		(owner.type === AST_NODE_TYPES.UnaryExpression && owner.operator === 'delete')
	);
}

/**
 * Follows an identifier to the value it stands for, when that value is fixed
 * and written in this file: a `const` with an initialiser, or a function
 * declaration that nothing reassigns. Anything that can hold something else by
 * the time the node runs (`let`, a parameter, a re-declared name) reads as
 * unresolved, and so does an import, whose value lives in another file the rule
 * cannot see.
 */
export function resolveIdentifier(
	scope: TSESLint.Scope.Scope,
	identifier: TSESTree.Identifier,
): TSESTree.Node | null {
	const variable = ASTUtils.findVariable(scope, identifier);
	if (variable === null || variable.defs.length !== 1) return null;
	if (variable.references.some(canChangeValue)) return null;

	const [definition] = variable.defs;
	if (definition === undefined) return null;

	if (definition.type === TSESLint.Scope.DefinitionType.FunctionName) {
		return definition.node;
	}

	if (definition.type !== TSESLint.Scope.DefinitionType.Variable) return null;
	if (definition.parent.kind !== 'const') return null;

	return definition.node.init;
}

function implementsInterface(node: TSESTree.ClassDeclaration, interfaceName: string): boolean {
	return (
		node.implements?.some(
			(impl) =>
				impl.type === AST_NODE_TYPES.TSClassImplements &&
				impl.expression.type === AST_NODE_TYPES.Identifier &&
				impl.expression.name === interfaceName,
		) ?? false
	);
}

export function isNodeTypeClass(node: TSESTree.ClassDeclaration): boolean {
	if (implementsInterface(node, 'INodeType')) {
		return true;
	}

	if (node.superClass?.type === AST_NODE_TYPES.Identifier && node.superClass.name === 'Node') {
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
			member.type === AST_NODE_TYPES.PropertyDefinition &&
			member.key?.type === AST_NODE_TYPES.Identifier &&
			member.key.name === propertyName,
	);
	return property?.type === AST_NODE_TYPES.PropertyDefinition ? property : null;
}

export function findObjectProperty(
	obj: TSESTree.ObjectExpression,
	propertyName: string,
): TSESTree.Property | null {
	const property = obj.properties.find(
		(prop) =>
			prop.type === AST_NODE_TYPES.Property &&
			prop.key.type === AST_NODE_TYPES.Identifier &&
			prop.key.name === propertyName,
	);
	return property?.type === AST_NODE_TYPES.Property ? property : null;
}

export function getLiteralValue(node: TSESTree.Node | null): string | boolean | number | null {
	if (node?.type === AST_NODE_TYPES.Literal) {
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
		node?.type === AST_NODE_TYPES.TemplateLiteral &&
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

export function findJsonProperty(
	obj: TSESTree.ObjectExpression,
	propertyName: string,
): TSESTree.Property | null {
	const property = obj.properties.find(
		(prop) =>
			prop.type === AST_NODE_TYPES.Property &&
			prop.key.type === AST_NODE_TYPES.Literal &&
			prop.key.value === propertyName,
	);
	return property?.type === AST_NODE_TYPES.Property ? property : null;
}

export function findArrayLiteralProperty(
	obj: TSESTree.ObjectExpression,
	propertyName: string,
): TSESTree.ArrayExpression | null {
	const property = findObjectProperty(obj, propertyName);
	if (property?.value.type === AST_NODE_TYPES.ArrayExpression) {
		return property.value;
	}
	return null;
}

export function hasArrayLiteralValue(
	node: TSESTree.PropertyDefinition,
	searchValue: string,
): boolean {
	if (node.value?.type !== AST_NODE_TYPES.ArrayExpression) return false;

	return node.value.elements.some(
		(element) =>
			element?.type === AST_NODE_TYPES.Literal &&
			typeof element.value === 'string' &&
			element.value === searchValue,
	);
}

export function getTopLevelObjectInJson(
	node: TSESTree.ObjectExpression,
): TSESTree.ObjectExpression | null {
	// In a JSON file parsed as JS, the root object is the sole expression of
	// the program, so its parent is an ExpressionStatement. Anything else
	// (Property, ArrayExpression, etc.) is nested and must not be treated as
	// the package root.
	if (node.parent?.type !== AST_NODE_TYPES.ExpressionStatement) {
		return null;
	}
	return node;
}

export function isFileType(filename: string, extension: string): boolean {
	return filename.endsWith(extension);
}

export function isDirectRequireCall(node: TSESTree.CallExpression): boolean {
	return (
		node.callee.type === AST_NODE_TYPES.Identifier &&
		node.callee.name === 'require' &&
		node.arguments.length > 0
	);
}

export function isRequireMemberCall(node: TSESTree.CallExpression): boolean {
	return (
		node.callee.type === AST_NODE_TYPES.MemberExpression &&
		node.callee.object.type === AST_NODE_TYPES.Identifier &&
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

	if (element.type === AST_NODE_TYPES.ObjectExpression) {
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
					testedBy: testedByValue ?? undefined,
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

/** Matches the `this.helpers` MemberExpression (the object part of `this.helpers.foo`). */
export function isThisHelpersAccess(node: TSESTree.MemberExpression): boolean {
	return (
		node.object?.type === AST_NODE_TYPES.MemberExpression &&
		node.object.object?.type === AST_NODE_TYPES.ThisExpression &&
		node.object.property?.type === AST_NODE_TYPES.Identifier &&
		node.object.property.name === 'helpers'
	);
}

/** Matches a call expression of the form `this.methodName(...)`. */
export function isThisMethodCall(node: TSESTree.CallExpression, method: string): boolean {
	return (
		node.callee.type === AST_NODE_TYPES.MemberExpression &&
		node.callee.object.type === AST_NODE_TYPES.ThisExpression &&
		node.callee.property.type === AST_NODE_TYPES.Identifier &&
		node.callee.property.name === method
	);
}

/** Matches a call expression of the form `this.helpers.methodName(...)`. */
export function isThisHelpersMethodCall(node: TSESTree.CallExpression, method: string): boolean {
	return (
		node.callee.type === AST_NODE_TYPES.MemberExpression &&
		node.callee.property.type === AST_NODE_TYPES.Identifier &&
		node.callee.property.name === method &&
		isThisHelpersAccess(node.callee)
	);
}

export function findSimilarStrings(
	target: string,
	candidates: Set<string>,
	maxDistance: number = 3,
	maxResults: number = 3,
): string[] {
	const matches: Array<{ name: string; distance: number }> = [];

	for (const candidate of candidates) {
		const levenshteinDistance = distance(target.toLowerCase(), candidate.toLowerCase());

		if (levenshteinDistance <= maxDistance) {
			matches.push({ name: candidate, distance: levenshteinDistance });
		}
	}

	return matches
		.sort((a, b) => a.distance - b.distance)
		.slice(0, maxResults)
		.map((match) => match.name);
}
