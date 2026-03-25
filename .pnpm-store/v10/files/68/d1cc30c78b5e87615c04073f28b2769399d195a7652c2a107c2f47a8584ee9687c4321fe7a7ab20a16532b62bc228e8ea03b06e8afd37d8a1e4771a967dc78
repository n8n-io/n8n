import {getNegativeIndexLengthNode, removeLengthNode} from './shared/negative-index.js';
import typedArray from './shared/typed-array.js';
import {isLiteral} from './ast/index.js';

const MESSAGE_ID = 'prefer-negative-index';
const messages = {
	[MESSAGE_ID]: 'Prefer negative index over length minus index for `{{method}}`.',
};

const methods = new Map([
	[
		'slice',
		{
			argumentsIndexes: [0, 1],
			supportObjects: new Set([
				'Array',
				'String',
				'ArrayBuffer',
				...typedArray,
				// `{Blob,File}#slice()` are not generally used
				// 'Blob'
				// 'File'
			]),
		},
	],
	[
		'subarray',
		{
			argumentsIndexes: [0, 1],
			supportObjects: new Set(typedArray),
		},
	],
	[
		'splice',
		{
			argumentsIndexes: [0],
			supportObjects: new Set([
				'Array',
			]),
		},
	],
	[
		'toSpliced',
		{
			argumentsIndexes: [0],
			supportObjects: new Set([
				'Array',
			]),
		},
	],
	[
		'at',
		{
			argumentsIndexes: [0],
			supportObjects: new Set([
				'Array',
				'String',
				...typedArray,
			]),
		},
	],
	[
		'with',
		{
			argumentsIndexes: [0],
			supportObjects: new Set([
				'Array',
				...typedArray,
			]),
		},
	],
]);

const getMemberName = node => {
	const {type, property} = node;

	if (
		type === 'MemberExpression'
		&& property.type === 'Identifier'
	) {
		return property.name;
	}
};

function parse(node) {
	const {callee, arguments: originalArguments} = node;

	let method = callee.property.name;
	let target = callee.object;
	let argumentsNodes = originalArguments;

	if (methods.has(method)) {
		return {
			method,
			target,
			argumentsNodes,
		};
	}

	if (method !== 'call' && method !== 'apply') {
		return;
	}

	const isApply = method === 'apply';

	method = getMemberName(callee.object);

	if (!methods.has(method)) {
		return;
	}

	const {supportObjects} = methods.get(method);

	const parentCallee = callee.object.object;

	if (
		// `[].{slice,splice,toSpliced,at,with}`
		(
			parentCallee.type === 'ArrayExpression'
			&& parentCallee.elements.length === 0
		)
		// `''.slice`
		|| (
			method === 'slice'
			&& isLiteral(parentCallee, '')
		)
		// {Array,String...}.prototype.slice
		// Array.prototype.splice
		|| (
			getMemberName(parentCallee) === 'prototype'
			&& parentCallee.object.type === 'Identifier'
			&& supportObjects.has(parentCallee.object.name)
		)
	) {
		[target] = originalArguments;

		if (isApply) {
			const [, secondArgument] = originalArguments;
			if (!secondArgument || secondArgument.type !== 'ArrayExpression') {
				return;
			}

			argumentsNodes = secondArgument.elements;
		} else {
			argumentsNodes = originalArguments.slice(1);
		}

		return {
			method,
			target,
			argumentsNodes,
		};
	}
}

/** @param {import('eslint').Rule.RuleContext} context */
const create = context => ({
	CallExpression(node) {
		if (node.callee.type !== 'MemberExpression') {
			return;
		}

		const parsed = parse(node);

		if (!parsed) {
			return;
		}

		const {
			method,
			target,
			argumentsNodes,
		} = parsed;

		const {argumentsIndexes} = methods.get(method);
		const removableNodes = argumentsIndexes
			.map(index => getNegativeIndexLengthNode(argumentsNodes[index], target))
			.filter(Boolean);

		if (removableNodes.length === 0) {
			return;
		}

		return {
			node,
			messageId: MESSAGE_ID,
			data: {method},
			* fix(fixer) {
				const {sourceCode} = context;
				for (const node of removableNodes) {
					yield removeLengthNode(node, fixer, sourceCode);
				}
			},
		};
	},
});

/** @type {import('eslint').Rule.RuleModule} */
const config = {
	create,
	meta: {
		type: 'suggestion',
		docs: {
			description: 'Prefer negative index over `.length - index` when possible.',
			recommended: true,
		},
		fixable: 'code',
		messages,
	},
};

export default config;
