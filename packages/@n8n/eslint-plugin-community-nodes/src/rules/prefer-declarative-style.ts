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
	loopDepth: number;
};

function getMemberName(node: TSESTree.CallExpression): string | null {
	if (node.callee.type !== AST_NODE_TYPES.MemberExpression) return null;
	return node.callee.property.type === AST_NODE_TYPES.Identifier
		? node.callee.property.name
		: null;
}

function getHttpRequestMethod(node: TSESTree.CallExpression): string | null {
	if (node.callee.type !== AST_NODE_TYPES.MemberExpression) return null;

	const directMethod = getMemberName(node);
	if (
		directMethod &&
		HTTP_REQUEST_METHODS.has(directMethod) &&
		isThisHelpersAccess(node.callee)
	) {
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

		const enterLoop = () => {
			if (executeState) executeState.loopDepth++;
		};
		const exitLoop = () => {
			if (executeState) executeState.loopDepth--;
		};

		return {
			ClassDeclaration(node) {
				const description = findNodeDescriptionObject(node);
				const outputs = description ? findObjectProperty(description, 'outputs') : null;
				const hasOneOutput =
					outputs?.value.type === AST_NODE_TYPES.ArrayExpression && outputs.value.elements.length === 1;

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
						loopDepth: 0,
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

			ForStatement: enterLoop,
			ForInStatement: enterLoop,
			ForOfStatement: enterLoop,
			'ForStatement:exit': exitLoop,
			'ForInStatement:exit': exitLoop,
			'ForOfStatement:exit': exitLoop,

			Identifier(node) {
				if (executeState && ESCAPE_HATCH_NAME.test(node.name)) {
					executeState.hasEscapeHatch = true;
				}
			},
			CallExpression(node) {
				if (!executeState) return;

				const httpRequestMethod = getHttpRequestMethod(node);
				if (httpRequestMethod) {
					executeState.httpRequestCount++;
					executeState.requestInLoop ||= executeState.loopDepth > 0;
					return;
				}

				const methodName = getMemberName(node);
				if (methodName === 'getWorkflowStaticData' || !methodName || !ALLOWED_CALLS.has(methodName)) {
					executeState.hasEscapeHatch = true;
				}
			},
		};
	},
});
