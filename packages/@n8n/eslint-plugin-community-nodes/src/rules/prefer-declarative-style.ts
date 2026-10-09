import type { TSESTree } from '@typescript-eslint/utils';
import { AST_NODE_TYPES } from '@typescript-eslint/utils';

import {
	createRule,
	findNodeDescriptionObject,
	findObjectProperty,
	getPropertyKeyName,
	isFileType,
	isNodeTypeClass,
	isThisHelpersAccess,
	isThisMethodCall,
	isTriggerNode,
} from '../utils/index.js';

const HTTP_REQUEST_METHODS = new Set(['httpRequest', 'httpRequestWithAuthentication']);
const ALLOWED_CALLS = new Set(['getCredentials', 'getInputData', 'getNodeParameter', 'push']);
const ESCAPE_HATCH_NAME = /binary|cursor|offset|page|pagination|returnAll/i;

type ExecuteState = {
	node: TSESTree.MethodDefinition;
	httpRequestCount: number;
	hasEscapeHatch: boolean;
	requestInLoop: boolean;
	inputItems: Set<string>;
	zeroIndexes: Set<string>;
	loopStack: Array<{ index: string | null; referencesItem: boolean; hasRequest: boolean }>;
};

function isInputItems(node: TSESTree.Expression, inputItems: Set<string>): boolean {
	return (
		(node.type === AST_NODE_TYPES.Identifier && inputItems.has(node.name)) ||
		(node.type === AST_NODE_TYPES.CallExpression && isThisMethodCall(node, 'getInputData'))
	);
}

function isInputItemsLength(node: TSESTree.Expression, inputItems: Set<string>): boolean {
	return (
		node.type === AST_NODE_TYPES.MemberExpression &&
		!node.computed &&
		node.property.type === AST_NODE_TYPES.Identifier &&
		node.property.name === 'length' &&
		isInputItems(node.object, inputItems)
	);
}

function getBoundedIndex(test: TSESTree.Expression | null, inputItems: Set<string>): string | null {
	return test?.type === AST_NODE_TYPES.BinaryExpression &&
		test.operator === '<' &&
		test.left.type === AST_NODE_TYPES.Identifier &&
		isInputItemsLength(test.right, inputItems)
		? test.left.name
		: null;
}

function incrementsIndex(node: TSESTree.Expression, index: string): boolean {
	return (
		node.type === AST_NODE_TYPES.UpdateExpression &&
		node.operator === '++' &&
		node.argument.type === AST_NODE_TYPES.Identifier &&
		node.argument.name === index
	);
}

function getItemLoopIndex(
	node:
		| TSESTree.ForStatement
		| TSESTree.ForInStatement
		| TSESTree.ForOfStatement
		| TSESTree.WhileStatement
		| TSESTree.DoWhileStatement,
	state: ExecuteState,
): string | null {
	if (node.type === AST_NODE_TYPES.ForOfStatement || node.type === AST_NODE_TYPES.ForInStatement) {
		return isInputItems(node.right, state.inputItems) ? '' : null;
	}

	const index = getBoundedIndex(node.test, state.inputItems);
	if (!index) return null;

	if (node.type === AST_NODE_TYPES.ForStatement) {
		const isItemLoop =
			node.init?.type === AST_NODE_TYPES.VariableDeclaration &&
			node.init.declarations.some(
				(declaration) =>
					declaration.id.type === AST_NODE_TYPES.Identifier &&
					declaration.id.name === index &&
					declaration.init?.type === AST_NODE_TYPES.Literal &&
					declaration.init.value === 0,
			) &&
			node.update !== null &&
			incrementsIndex(node.update, index);
		return isItemLoop ? index : null;
	}

	const isItemLoop =
		state.zeroIndexes.has(index) &&
		node.body.type === AST_NODE_TYPES.BlockStatement &&
		node.body.body.some(
			(statement) =>
				statement.type === AST_NODE_TYPES.ExpressionStatement &&
				incrementsIndex(statement.expression, index),
		);
	return isItemLoop ? index : null;
}

function getMemberName(node: TSESTree.CallExpression): string | null {
	if (node.callee.type !== AST_NODE_TYPES.MemberExpression) return null;
	return node.callee.property.type === AST_NODE_TYPES.Identifier ? node.callee.property.name : null;
}

function getHttpRequestMethod(node: TSESTree.CallExpression): string | null {
	if (node.callee.type !== AST_NODE_TYPES.MemberExpression) return null;

	const directMethod = getMemberName(node);
	if (directMethod && HTTP_REQUEST_METHODS.has(directMethod) && isThisHelpersAccess(node.callee)) {
		return directMethod;
	}

	if (
		directMethod === 'call' &&
		node.callee.object.type === AST_NODE_TYPES.MemberExpression &&
		node.callee.object.property.type === AST_NODE_TYPES.Identifier &&
		HTTP_REQUEST_METHODS.has(node.callee.object.property.name) &&
		isThisHelpersAccess(node.callee.object)
	) {
		return node.callee.object.property.name;
	}

	return null;
}

export const PreferDeclarativeStyleRule = createRule({
	name: 'prefer-declarative-style',
	meta: {
		type: 'suggestion',
		docs: {
			description: 'Prefer declarative routing for nodes that only send one HTTP request per item.',
		},
		messages: {
			preferDeclarativeStyle:
				'This execute() method only sends one HTTP request per input item. Use declarative routing and requestDefaults instead.',
		},
		schema: [],
	},
	defaultOptions: [],
	create(context) {
		if (!isFileType(context.filename, '.node.ts')) return {};

		const eligibleClassStack: boolean[] = [];
		let executeState: ExecuteState | null = null;

		const enterLoop = (
			node:
				| TSESTree.ForStatement
				| TSESTree.ForInStatement
				| TSESTree.ForOfStatement
				| TSESTree.WhileStatement
				| TSESTree.DoWhileStatement,
		) => {
			if (executeState) {
				const index = getItemLoopIndex(node, executeState);
				executeState.loopStack.push({ index, referencesItem: index === '', hasRequest: false });
			}
		};
		const exitLoop = () => {
			if (!executeState) return;
			const loop = executeState.loopStack.pop();
			executeState.requestInLoop ||=
				executeState.loopStack.length === 0 &&
				loop !== undefined &&
				loop.index !== null &&
				loop.referencesItem &&
				loop.hasRequest;
		};

		return {
			ClassDeclaration(node) {
				const description = findNodeDescriptionObject(node);
				const outputs = description ? findObjectProperty(description, 'outputs') : null;
				const hasOneOutput =
					outputs?.value.type === AST_NODE_TYPES.ArrayExpression &&
					outputs.value.elements.length === 1;

				eligibleClassStack.push(
					isNodeTypeClass(node) &&
						description !== null &&
						!isTriggerNode(node, description) &&
						hasOneOutput,
				);
			},
			'ClassDeclaration:exit'() {
				eligibleClassStack.pop();
			},

			MethodDefinition(node) {
				if (eligibleClassStack.at(-1) && getPropertyKeyName(node) === 'execute') {
					executeState = {
						node,
						httpRequestCount: 0,
						hasEscapeHatch: false,
						requestInLoop: false,
						inputItems: new Set(),
						zeroIndexes: new Set(),
						loopStack: [],
					};
				}
			},
			'MethodDefinition:exit'(node) {
				if (executeState?.node !== node) return;

				if (
					executeState.httpRequestCount === 1 &&
					executeState.requestInLoop &&
					!executeState.hasEscapeHatch
				) {
					context.report({ node, messageId: 'preferDeclarativeStyle' });
				}
				executeState = null;
			},

			VariableDeclarator(node) {
				if (!executeState || node.id.type !== AST_NODE_TYPES.Identifier) return;
				if (
					node.init?.type === AST_NODE_TYPES.CallExpression &&
					isThisMethodCall(node.init, 'getInputData')
				) {
					executeState.inputItems.add(node.id.name);
				}
				if (node.init?.type === AST_NODE_TYPES.Literal && node.init.value === 0) {
					executeState.zeroIndexes.add(node.id.name);
				}
			},
			ForStatement: enterLoop,
			ForInStatement: enterLoop,
			ForOfStatement: enterLoop,
			WhileStatement: enterLoop,
			DoWhileStatement: enterLoop,
			'ForStatement:exit': exitLoop,
			'ForInStatement:exit': exitLoop,
			'ForOfStatement:exit': exitLoop,
			'WhileStatement:exit': exitLoop,
			'DoWhileStatement:exit': exitLoop,

			Identifier(node) {
				if (!executeState) return;
				if (ESCAPE_HATCH_NAME.test(node.name)) {
					executeState.hasEscapeHatch = true;
				}
				const loop = executeState.loopStack.at(-1);
				if (loop?.index !== node.name) return;
				if (
					(node.parent.type === AST_NODE_TYPES.MemberExpression &&
						node.parent.computed &&
						node.parent.property === node &&
						isInputItems(node.parent.object, executeState.inputItems)) ||
					(node.parent.type === AST_NODE_TYPES.CallExpression &&
						isThisMethodCall(node.parent, 'getNodeParameter') &&
						node.parent.arguments[1] === node) ||
					(node.parent.type === AST_NODE_TYPES.Property &&
						node.parent.value === node &&
						getPropertyKeyName(node.parent) === 'item')
				) {
					loop.referencesItem = true;
				}
			},
			Literal(node) {
				if (!executeState || typeof node.value !== 'string' || !ESCAPE_HATCH_NAME.test(node.value))
					return;
				if (
					(node.parent.type === AST_NODE_TYPES.CallExpression &&
						getMemberName(node.parent) === 'getNodeParameter' &&
						node.parent.arguments[0] === node) ||
					(node.parent.type === AST_NODE_TYPES.Property && node.parent.key === node)
				) {
					executeState.hasEscapeHatch = true;
				}
			},
			TemplateLiteral(node) {
				if (
					executeState &&
					node.parent.type === AST_NODE_TYPES.CallExpression &&
					getMemberName(node.parent) === 'getNodeParameter' &&
					node.parent.arguments[0] === node &&
					node.quasis.some((part) => ESCAPE_HATCH_NAME.test(part.value.cooked ?? ''))
				) {
					executeState.hasEscapeHatch = true;
				}
			},
			CallExpression(node) {
				if (!executeState) return;

				const httpRequestMethod = getHttpRequestMethod(node);
				if (httpRequestMethod) {
					executeState.httpRequestCount++;
					const loop = executeState.loopStack.length === 1 ? executeState.loopStack[0] : null;
					if (loop) {
						loop.hasRequest = true;
					}
					return;
				}

				const methodName = getMemberName(node);
				if (
					methodName === 'getWorkflowStaticData' ||
					!methodName ||
					!ALLOWED_CALLS.has(methodName)
				) {
					executeState.hasEscapeHatch = true;
				}
			},
		};
	},
});
