import type { TSESTree } from '@typescript-eslint/utils';
import { AST_NODE_TYPES } from '@typescript-eslint/utils';
import { distance } from 'fastest-levenshtein';

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

/** Matches this plugin's convention for identifying trigger nodes: class name ends with `Trigger`. */
export function isTriggerNodeClass(node: TSESTree.ClassDeclaration): boolean {
	return node.id?.name.endsWith('Trigger') ?? false;
}

function hasTriggerGroup(descriptionValue: TSESTree.ObjectExpression): boolean {
	const groupArray = findArrayLiteralProperty(descriptionValue, 'group');
	return (
		groupArray?.elements.some(
			(element) => element?.type === AST_NODE_TYPES.Literal && element.value === 'trigger',
		) ?? false
	);
}

/**
 * `group` is the authoritative signal for "is this a trigger node" (also catches e.g. Cron,
 * Webhook, versioned `*TriggerV1` classes); the name suffix is kept as a fallback for dynamic
 * `group` values.
 */
export function isTriggerNode(
	node: TSESTree.ClassDeclaration,
	descriptionValue: TSESTree.ObjectExpression,
): boolean {
	return hasTriggerGroup(descriptionValue) || isTriggerNodeClass(node);
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

/**
 * Returns the object literal behind an expression, and looks through the type
 * assertions node authors write, e.g. `{ … } as INodeTypeDescription`.
 */
function asObjectExpression(node: TSESTree.Node | null): TSESTree.ObjectExpression | null {
	let current = node;
	while (
		current?.type === AST_NODE_TYPES.TSAsExpression ||
		current?.type === AST_NODE_TYPES.TSSatisfiesExpression ||
		current?.type === AST_NODE_TYPES.TSTypeAssertion ||
		current?.type === AST_NODE_TYPES.TSNonNullExpression
	) {
		current = current.expression;
	}

	return current?.type === AST_NODE_TYPES.ObjectExpression ? current : null;
}

function findConstructorAssignedDescription(
	node: TSESTree.ClassDeclaration,
): TSESTree.ObjectExpression | null {
	const constructor = node.body.body.find(
		(member) => member.type === AST_NODE_TYPES.MethodDefinition && member.kind === 'constructor',
	);
	if (constructor?.type !== AST_NODE_TYPES.MethodDefinition) {
		return null;
	}

	for (const statement of constructor.value.body?.body ?? []) {
		if (statement.type !== AST_NODE_TYPES.ExpressionStatement) continue;

		const { expression } = statement;
		if (
			expression.type === AST_NODE_TYPES.AssignmentExpression &&
			expression.operator === '=' &&
			expression.left.type === AST_NODE_TYPES.MemberExpression &&
			expression.left.object.type === AST_NODE_TYPES.ThisExpression &&
			expression.left.property.type === AST_NODE_TYPES.Identifier &&
			expression.left.property.name === 'description'
		) {
			const description = asObjectExpression(expression.right);
			if (description) {
				return description;
			}
		}
	}

	return null;
}

/**
 * Returns the `description` object literal of a node class. Versioned nodes
 * follow the layout in the node-building docs and assign `this.description` in
 * their constructor, so look there when the class property has no initializer.
 */
export function findNodeDescriptionObject(
	node: TSESTree.ClassDeclaration,
): TSESTree.ObjectExpression | null {
	const property = findClassProperty(node, 'description');
	const propertyValue = asObjectExpression(property?.value ?? null);
	if (propertyValue) {
		return propertyValue;
	}

	return findConstructorAssignedDescription(node);
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

/**
 * Returns the statically-known string a node evaluates to — a string literal or
 * a template literal with no substitutions — or null when it cannot be known
 * without evaluating the code.
 */
export function getStaticStringValue(node: TSESTree.Node | null): string | null {
	const stringValue = getStringLiteralValue(node);
	if (stringValue !== null) {
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
