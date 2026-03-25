import {getFunctionHeadLocation, getFunctionNameWithKind} from '@eslint-community/eslint-utils';
import {functionTypes} from './ast/index.js';

const MESSAGE_ID = 'prefer-native-coercion-functions';
const messages = {
	[MESSAGE_ID]: '{{functionNameWithKind}} is equivalent to `{{replacementFunction}}`. Use `{{replacementFunction}}` directly.',
};

const nativeCoercionFunctionNames = new Set(['String', 'Number', 'BigInt', 'Boolean', 'Symbol']);
const arrayMethodsWithBooleanCallback = new Set(['every', 'filter', 'find', 'findLast', 'findIndex', 'findLastIndex', 'some']);

const isNativeCoercionFunctionCall = (node, firstArgumentName) =>
	node?.type === 'CallExpression'
	&& !node.optional
	&& node.callee.type === 'Identifier'
	&& nativeCoercionFunctionNames.has(node.callee.name)
	&& node.arguments[0]?.type === 'Identifier'
	&& node.arguments[0].name === firstArgumentName;

const isIdentityFunction = node =>
	(
		// `v => v`
		node.type === 'ArrowFunctionExpression'
		&& node.body.type === 'Identifier'
		&& node.body.name === node.params[0].name
	)
	|| (
		// `(v) => {return v;}`
		// `function (v) {return v;}`
		node.body.type === 'BlockStatement'
		&& node.body.body.length === 1
		&& node.body.body[0].type === 'ReturnStatement'
		&& node.body.body[0].argument?.type === 'Identifier'
		&& node.body.body[0].argument.name === node.params[0].name
	);

const isArrayIdentityCallback = node =>
	isIdentityFunction(node)
	&& node.parent.type === 'CallExpression'
	&& !node.parent.optional
	&& node.parent.arguments[0] === node
	&& node.parent.callee.type === 'MemberExpression'
	&& !node.parent.callee.computed
	&& !node.parent.callee.optional
	&& node.parent.callee.property.type === 'Identifier'
	&& arrayMethodsWithBooleanCallback.has(node.parent.callee.property.name);

function getCallExpression(node) {
	const firstParameterName = node.params[0].name;

	// `(v) => String(v)`
	if (
		node.type === 'ArrowFunctionExpression'
		&& isNativeCoercionFunctionCall(node.body, firstParameterName)
	) {
		return node.body;
	}

	// `(v) => {return String(v);}`
	// `function (v) {return String(v);}`
	if (
		node.body.type === 'BlockStatement'
		&& node.body.body.length === 1
		&& node.body.body[0].type === 'ReturnStatement'
		&& isNativeCoercionFunctionCall(node.body.body[0].argument, firstParameterName)
	) {
		return node.body.body[0].argument;
	}
}

function getArrayCallbackProblem(node) {
	if (!isArrayIdentityCallback(node)) {
		return;
	}

	return {
		replacementFunction: 'Boolean',
		fix: fixer => fixer.replaceText(node, 'Boolean'),
	};
}

function getCoercionFunctionProblem(node) {
	const callExpression = getCallExpression(node);

	if (!callExpression) {
		return;
	}

	const {name} = callExpression.callee;

	const problem = {replacementFunction: name};

	if (node.type === 'FunctionDeclaration' || callExpression.arguments.length !== 1) {
		return problem;
	}

	/** @param {import('eslint').Rule.RuleFixer} fixer */
	problem.fix = fixer => {
		let text = name;

		if (
			node.parent.type === 'Property'
			&& node.parent.method
			&& node.parent.value === node
		) {
			text = `: ${text}`;
		} else if (node.parent.type === 'MethodDefinition') {
			text = ` = ${text};`;
		}

		return fixer.replaceText(node, text);
	};

	return problem;
}

/** @param {import('eslint').Rule.RuleContext} context */
const create = context => {
	context.on(functionTypes, node => {
		if (
			node.async
			|| node.generator
			|| node.params.length === 0
			|| node.params[0].type !== 'Identifier'
			|| (
				(
					(
						node.parent.type === 'MethodDefinition'
						&& (node.parent.kind === 'constructor' || node.parent.kind === 'set')
					)
					|| (node.parent.type === 'Property' && node.parent.kind === 'set')
				)
				&& node.parent.value === node
			)
		) {
			return;
		}

		let problem = getArrayCallbackProblem(node) || getCoercionFunctionProblem(node);

		if (!problem) {
			return;
		}

		const {sourceCode} = context;
		const {replacementFunction, fix} = problem;

		problem = {
			node,
			loc: getFunctionHeadLocation(node, sourceCode),
			messageId: MESSAGE_ID,
			data: {
				functionNameWithKind: getFunctionNameWithKind(node, sourceCode),
				replacementFunction,
			},
		};

		/*
		We do not fix if there are:
		- Comments: No proper place to put them.
		- Extra parameters: Removing them may break types.
		*/
		if (!fix || node.params.length !== 1 || sourceCode.getCommentsInside(node).length > 0) {
			return problem;
		}

		problem.fix = fix;

		return problem;
	});
};

/** @type {import('eslint').Rule.RuleModule} */
const config = {
	create,
	meta: {
		type: 'suggestion',
		docs: {
			description: 'Prefer using `String`, `Number`, `BigInt`, `Boolean`, and `Symbol` directly.',
			recommended: true,
		},
		fixable: 'code',
		messages,
	},
};

export default config;
