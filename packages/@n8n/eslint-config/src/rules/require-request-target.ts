import { ASTUtils, ESLintUtils, type TSESTree } from '@typescript-eslint/utils';

type MessageIds = 'plainUrl' | 'dynamicBaseUrl' | 'unverifiableOptions';

const WORKFLOW_PACKAGE = 'n8n-workflow';
const REQUEST_TAGS = new Set(['requestPath', 'requestUrl']);
const REQUEST_TARGET_TYPES = new Set(['RequestPath', 'RequestUrl']);
const OPTIONS_TYPES = new Set(['WithRequestTarget']);
const URL_KEYS = new Set(['url', 'uri']);
const BASE_URL_KEY = 'baseURL';
const MAX_DEPTH = 5;

const OPTIONS_INDEX = new Map([
	['httpRequest', 0],
	['request', 0],
	['httpRequestWithAuthentication', 1],
	['requestWithAuthentication', 1],
	['requestOAuth1', 1],
	['requestOAuth2', 1],
	['requestWithAuthenticationPaginated', 0],
]);

function unwrap(node: TSESTree.Node): TSESTree.Node {
	return node.type === 'TSAsExpression' ||
		node.type === 'TSNonNullExpression' ||
		node.type === 'TSSatisfiesExpression'
		? unwrap(node.expression)
		: node;
}

function propertyName(node: TSESTree.Node): string | undefined {
	if (node.type === 'Identifier') return node.name;
	return node.type === 'Literal' && typeof node.value === 'string' ? node.value : undefined;
}

function helperName(node: TSESTree.Node): string | undefined {
	if (node.type !== 'MemberExpression' || node.computed) return undefined;
	const name = propertyName(node.property);
	if (name === undefined || !OPTIONS_INDEX.has(name)) return undefined;
	const owner = node.object;
	const isHelpers =
		(owner.type === 'Identifier' && owner.name === 'helpers') ||
		(owner.type === 'MemberExpression' &&
			!owner.computed &&
			propertyName(owner.property) === 'helpers');
	return isHelpers ? name : undefined;
}

function helperCall(node: TSESTree.CallExpression) {
	const direct = helperName(node.callee);
	if (direct !== undefined) return { name: direct, args: node.arguments };

	const { callee } = node;
	if (
		callee.type === 'MemberExpression' &&
		!callee.computed &&
		propertyName(callee.property) === 'call'
	) {
		const name = helperName(callee.object);
		if (name !== undefined) return { name, args: node.arguments.slice(1) };
	}
	return undefined;
}

export const RequireRequestTargetRule = ESLintUtils.RuleCreator.withoutDocs<[], MessageIds>({
	meta: {
		type: 'problem',
		docs: {
			description:
				'Require the url of a request helper call to be built with the requestPath or requestUrl tag.',
		},
		schema: [],
		messages: {
			plainUrl:
				'Build the request URL with the requestPath or requestUrl tag from n8n-workflow, or use a constant string.',
			dynamicBaseUrl:
				'Do not build baseURL from a template or a concatenation. Put the dynamic part in url with the requestPath tag.',
			unverifiableOptions:
				'The rule cannot see the url of these request options. Build the options in this call or type them with WithRequestTarget.',
		},
	},
	defaultOptions: [],
	create(context) {
		const { sourceCode } = context;

		const variableOf = (identifier: TSESTree.Identifier) =>
			ASTUtils.findVariable(sourceCode.getScope(identifier), identifier);

		const isWorkflowImport = (identifier: TSESTree.Identifier, names: Set<string>) => {
			const [definition] = variableOf(identifier)?.defs ?? [];
			if (
				definition?.type !== 'ImportBinding' ||
				definition.node.type !== 'ImportSpecifier' ||
				definition.parent.type !== 'ImportDeclaration'
			) {
				return false;
			}
			const imported = propertyName(definition.node.imported);
			return (
				definition.parent.source.value === WORKFLOW_PACKAGE &&
				imported !== undefined &&
				names.has(imported)
			);
		};

		const isTargetType = (type: TSESTree.TypeNode | undefined): boolean => {
			if (type?.type === 'TSTypeReference') {
				return (
					type.typeName.type === 'Identifier' &&
					isWorkflowImport(type.typeName, REQUEST_TARGET_TYPES)
				);
			}
			if (type?.type === 'TSUnionType') {
				return type.types.every(
					(member) => member.type === 'TSUndefinedKeyword' || isTargetType(member),
				);
			}
			return false;
		};

		const isOptionsType = (type: TSESTree.TypeNode | undefined) =>
			type?.type === 'TSTypeReference' &&
			type.typeName.type === 'Identifier' &&
			isWorkflowImport(type.typeName, OPTIONS_TYPES);

		const declaredTypeOf = (identifier: TSESTree.Identifier) => {
			const [definition] = variableOf(identifier)?.defs ?? [];
			return definition?.name.type === 'Identifier'
				? definition.name.typeAnnotation?.typeAnnotation
				: undefined;
		};

		function checkValue(node: TSESTree.Node, depth = 0): void {
			const value = unwrap(node);
			switch (value.type) {
				case 'TaggedTemplateExpression':
					if (value.tag.type !== 'Identifier' || !isWorkflowImport(value.tag, REQUEST_TAGS)) {
						context.report({ node: value, messageId: 'plainUrl' });
					}
					return;
				case 'Literal':
					return;
				case 'TemplateLiteral':
					if (value.expressions.length > 0) context.report({ node: value, messageId: 'plainUrl' });
					return;
				case 'ConditionalExpression':
					checkValue(value.consequent, depth);
					checkValue(value.alternate, depth);
					return;
				case 'LogicalExpression':
					checkValue(value.left, depth);
					checkValue(value.right, depth);
					return;
				case 'Identifier':
					checkIdentifierValue(value, depth);
					return;
				default:
					context.report({ node: value, messageId: 'plainUrl' });
			}
		}

		function checkIdentifierValue(identifier: TSESTree.Identifier, depth: number): void {
			if (identifier.name === 'undefined') return;
			const writes =
				variableOf(identifier)?.references.filter((reference) => reference.writeExpr) ?? [];
			if (writes.length === 0 && isTargetType(declaredTypeOf(identifier))) return;
			if (depth >= MAX_DEPTH || writes.length === 0) {
				context.report({ node: identifier, messageId: 'plainUrl' });
				return;
			}
			for (const reference of writes) checkValue(reference.writeExpr!, depth + 1);
		}

		function checkBaseUrl(node: TSESTree.Node, depth = 0): void {
			const value = unwrap(node);
			switch (value.type) {
				case 'TemplateLiteral':
					if (value.expressions.length > 0) {
						context.report({ node: value, messageId: 'dynamicBaseUrl' });
					}
					return;
				case 'BinaryExpression':
					context.report({ node: value, messageId: 'dynamicBaseUrl' });
					return;
				case 'ConditionalExpression':
					checkBaseUrl(value.consequent, depth);
					checkBaseUrl(value.alternate, depth);
					return;
				case 'LogicalExpression':
					checkBaseUrl(value.left, depth);
					checkBaseUrl(value.right, depth);
					return;
				case 'Identifier': {
					if (depth >= MAX_DEPTH) {
						context.report({ node: value, messageId: 'dynamicBaseUrl' });
						return;
					}
					const writes = variableOf(value)?.references.filter((reference) => reference.writeExpr);
					for (const reference of writes ?? []) checkBaseUrl(reference.writeExpr!, depth + 1);
					return;
				}
				default:
			}
		}

		function checkObject(object: TSESTree.ObjectExpression, depth = 0): void {
			for (const property of object.properties) {
				if (property.type === 'SpreadElement') {
					checkSpread(property, depth);
					continue;
				}
				const key = property.computed
					? property.key.type === 'Literal'
						? propertyName(property.key)
						: undefined
					: propertyName(property.key);
				if (key === undefined) {
					context.report({ node: property, messageId: 'unverifiableOptions' });
				} else if (URL_KEYS.has(key)) {
					checkValue(property.value);
				} else if (key === BASE_URL_KEY) {
					checkBaseUrl(property.value);
				}
			}
		}

		function checkSpread(spread: TSESTree.SpreadElement, depth: number): void {
			const source = unwrap(spread.argument);
			if (source.type === 'ObjectExpression') return checkObject(source, depth + 1);
			if (source.type === 'Identifier' && depth < MAX_DEPTH) {
				const variable = variableOf(source);
				const [definition] = variable?.defs ?? [];
				const init = definition?.type === 'Variable' ? definition.node.init : undefined;
				const initValue = init && unwrap(init);
				if (variable && initValue?.type === 'ObjectExpression') {
					checkObject(initValue, depth + 1);
					checkAssignments(variable);
					return;
				}
			}
			context.report({ node: spread, messageId: 'unverifiableOptions' });
		}

		function checkAssignments(variable: { references: Array<{ identifier: TSESTree.Node }> }) {
			for (const { identifier } of variable.references) {
				const member = identifier.parent;
				if (
					member?.type !== 'MemberExpression' ||
					member.object !== identifier ||
					member.computed
				) {
					continue;
				}
				const key = propertyName(member.property) ?? '';
				const assignment = member.parent;
				if (assignment?.type !== 'AssignmentExpression' || assignment.left !== member) continue;
				if (URL_KEYS.has(key)) checkValue(assignment.right);
				else if (key === BASE_URL_KEY) checkBaseUrl(assignment.right);
			}
		}

		function checkOptions(node: TSESTree.Node): void {
			const options = unwrap(node);
			if (options.type === 'ObjectExpression') return checkObject(options);

			if (options.type === 'Identifier') {
				const variable = variableOf(options);
				const [definition] = variable?.defs ?? [];
				if (variable && definition?.name.type === 'Identifier') {
					const init = definition.type === 'Variable' ? definition.node.init : undefined;
					const initValue = init && unwrap(init);
					if (initValue?.type === 'ObjectExpression') {
						checkObject(initValue);
						checkAssignments(variable);
						return;
					}
					if (isOptionsType(definition.name.typeAnnotation?.typeAnnotation)) return;
				}
			}
			context.report({ node: options, messageId: 'unverifiableOptions' });
		}

		return {
			CallExpression(node) {
				const call = helperCall(node);
				if (!call) return;

				if (call.name === 'request') {
					const [first, second] = call.args;
					if (first && isUrlLike(first)) checkValue(first);
					else if (first) checkOptions(first);
					if (second) checkOptions(second);
					return;
				}

				const options = call.args[OPTIONS_INDEX.get(call.name) ?? 0];
				if (options) checkOptions(options);
			},
		};
	},
});

function isUrlLike(node: TSESTree.Node): boolean {
	const value = unwrap(node);
	return (
		value.type === 'Literal' ||
		value.type === 'TemplateLiteral' ||
		value.type === 'TaggedTemplateExpression' ||
		value.type === 'BinaryExpression'
	);
}
