import {isCommaToken} from '@eslint-community/eslint-utils';
import typedArray from './shared/typed-array.js';
import {removeParentheses, fixSpaceAroundKeyword, addParenthesizesToReturnOrThrowExpression} from './fix/index.js';
import {isParenthesized, isOnSameLine} from './utils/index.js';
import {isNewExpression, isMethodCall, isCallOrNewExpression} from './ast/index.js';

const SPREAD_IN_LIST = 'spread-in-list';
const ITERABLE_TO_ARRAY = 'iterable-to-array';
const ITERABLE_TO_ARRAY_IN_FOR_OF = 'iterable-to-array-in-for-of';
const ITERABLE_TO_ARRAY_IN_YIELD_STAR = 'iterable-to-array-in-yield-star';
const CLONE_ARRAY = 'clone-array';
const messages = {
	[SPREAD_IN_LIST]: 'Spread an {{argumentType}} literal in {{parentDescription}} is unnecessary.',
	[ITERABLE_TO_ARRAY]: '`{{parentDescription}}` accepts iterable as argument, it\'s unnecessary to convert to an array.',
	[ITERABLE_TO_ARRAY_IN_FOR_OF]: '`for…of` can iterate over iterable, it\'s unnecessary to convert to an array.',
	[ITERABLE_TO_ARRAY_IN_YIELD_STAR]: '`yield*` can delegate iterable, it\'s unnecessary to convert to an array.',
	[CLONE_ARRAY]: 'Unnecessarily cloning an array.',
};

const isSingleArraySpread = node =>
	node.type === 'ArrayExpression'
	&& node.elements.length === 1
	&& node.elements[0]?.type === 'SpreadElement';

const parentDescriptions = {
	ArrayExpression: 'array literal',
	ObjectExpression: 'object literal',
	CallExpression: 'arguments',
	NewExpression: 'arguments',
};

function getCommaTokens(arrayExpression, sourceCode) {
	let startToken = sourceCode.getFirstToken(arrayExpression);

	return arrayExpression.elements.map((element, index, elements) => {
		if (index === elements.length - 1) {
			const penultimateToken = sourceCode.getLastToken(arrayExpression, {skip: 1});
			if (isCommaToken(penultimateToken)) {
				return penultimateToken;
			}

			return;
		}

		const commaToken = sourceCode.getTokenAfter(element || startToken, isCommaToken);
		startToken = commaToken;
		return commaToken;
	});
}

function * unwrapSingleArraySpread(fixer, arrayExpression, sourceCode) {
	const [
		openingBracketToken,
		spreadToken,
		thirdToken,
	] = sourceCode.getFirstTokens(arrayExpression, 3);

	// `[...value]`
	//  ^
	yield fixer.remove(openingBracketToken);

	// `[...value]`
	//   ^^^
	yield fixer.remove(spreadToken);

	const [
		commaToken,
		closingBracketToken,
	] = sourceCode.getLastTokens(arrayExpression, 2);

	// `[...value]`
	//           ^
	yield fixer.remove(closingBracketToken);

	// `[...value,]`
	//           ^
	if (isCommaToken(commaToken)) {
		yield fixer.remove(commaToken);
	}

	/*
	```js
	function foo() {
		return [
			...value,
		];
	}
	```
	*/
	const {parent} = arrayExpression;
	if (
		(parent.type === 'ReturnStatement' || parent.type === 'ThrowStatement')
		&& parent.argument === arrayExpression
		&& !isOnSameLine(openingBracketToken, thirdToken)
		&& !isParenthesized(arrayExpression, sourceCode)
	) {
		yield * addParenthesizesToReturnOrThrowExpression(fixer, parent, sourceCode);
		return;
	}

	yield * fixSpaceAroundKeyword(fixer, arrayExpression, sourceCode);
}

/** @param {import('eslint').Rule.RuleContext} context */
const create = context => {
	const {sourceCode} = context;

	// Useless spread in list
	context.on(['ArrayExpression', 'ObjectExpression'], node => {
		if (!(
			node.parent.type === 'SpreadElement'
			&& node.parent.argument === node
			&& (
				(
					node.type === 'ObjectExpression'
					&& node.parent.parent.type === 'ObjectExpression'
					&& node.parent.parent.properties.includes(node.parent)
				)
				|| (
					node.type === 'ArrayExpression'
					&& (
						(
							node.parent.parent.type === 'ArrayExpression'
							&& node.parent.parent.elements.includes(node.parent)
						)
						|| (
							isCallOrNewExpression(node.parent.parent)
							&& node.parent.parent.arguments.includes(node.parent)
						)
					)
				)
			)
		)) {
			return;
		}

		const spreadObject = node;
		const spreadElement = spreadObject.parent;
		const spreadToken = sourceCode.getFirstToken(spreadElement);
		const parentType = spreadElement.parent.type;

		return {
			node: spreadToken,
			messageId: SPREAD_IN_LIST,
			data: {
				argumentType: spreadObject.type === 'ArrayExpression' ? 'array' : 'object',
				parentDescription: parentDescriptions[parentType],
			},
			/** @param {import('eslint').Rule.RuleFixer} fixer */
			* fix(fixer) {
				// `[...[foo]]`
				//   ^^^
				yield fixer.remove(spreadToken);

				// `[...(( [foo] ))]`
				//      ^^       ^^
				yield * removeParentheses(spreadObject, fixer, sourceCode);

				// `[...[foo]]`
				//      ^
				const firstToken = sourceCode.getFirstToken(spreadObject);
				yield fixer.remove(firstToken);

				const [
					penultimateToken,
					lastToken,
				] = sourceCode.getLastTokens(spreadObject, 2);

				// `[...[foo]]`
				//          ^
				yield fixer.remove(lastToken);

				// `[...[foo,]]`
				//          ^
				if (isCommaToken(penultimateToken)) {
					yield fixer.remove(penultimateToken);
				}

				if (parentType !== 'CallExpression' && parentType !== 'NewExpression') {
					return;
				}

				const commaTokens = getCommaTokens(spreadObject, sourceCode);
				for (const [index, commaToken] of commaTokens.entries()) {
					if (spreadObject.elements[index]) {
						continue;
					}

					// `call(...[foo, , bar])`
					//               ^ Replace holes with `undefined`
					yield fixer.insertTextBefore(commaToken, 'undefined');
				}
			},
		};
	});

	// Useless iterable to array
	context.on('ArrayExpression', arrayExpression => {
		if (!isSingleArraySpread(arrayExpression)) {
			return;
		}

		const {parent} = arrayExpression;
		if (!(
			(parent.type === 'ForOfStatement' && parent.right === arrayExpression)
			|| (parent.type === 'YieldExpression' && parent.delegate && parent.argument === arrayExpression)
			|| (
				(
					isNewExpression(parent, {names: ['Map', 'WeakMap', 'Set', 'WeakSet'], argumentsLength: 1})
					|| isNewExpression(parent, {names: typedArray, minimumArguments: 1})
					|| isMethodCall(parent, {
						object: 'Promise',
						methods: ['all', 'allSettled', 'any', 'race'],
						argumentsLength: 1,
						optionalCall: false,
						optionalMember: false,
					})
					|| isMethodCall(parent, {
						objects: ['Array', ...typedArray],
						method: 'from',
						argumentsLength: 1,
						optionalCall: false,
						optionalMember: false,
					})
					|| isMethodCall(parent, {
						object: 'Object',
						method: 'fromEntries',
						argumentsLength: 1,
						optionalCall: false,
						optionalMember: false,
					})
				)
				&& parent.arguments[0] === arrayExpression
			)
		)) {
			return;
		}

		let parentDescription = '';
		let messageId = ITERABLE_TO_ARRAY;
		switch (parent.type) {
			case 'ForOfStatement': {
				messageId = ITERABLE_TO_ARRAY_IN_FOR_OF;
				break;
			}

			case 'YieldExpression': {
				messageId = ITERABLE_TO_ARRAY_IN_YIELD_STAR;
				break;
			}

			case 'NewExpression': {
				parentDescription = `new ${parent.callee.name}(…)`;
				break;
			}

			case 'CallExpression': {
				parentDescription = `${parent.callee.object.name}.${parent.callee.property.name}(…)`;
				break;
			}
			// No default
		}

		return {
			node: arrayExpression,
			messageId,
			data: {parentDescription},
			fix: fixer => unwrapSingleArraySpread(fixer, arrayExpression, sourceCode),
		};
	});

	// Useless array clone
	context.on('ArrayExpression', arrayExpression => {
		if (!isSingleArraySpread(arrayExpression)) {
			return;
		}

		const node = arrayExpression.elements[0].argument;
		if (!(
			// Array methods returns a new array
			isMethodCall(node, {
				methods: [
					'concat',
					'copyWithin',
					'filter',
					'flat',
					'flatMap',
					'map',
					'slice',
					'splice',
					'toReversed',
					'toSorted',
					'toSpliced',
					'with',
				],
				optionalCall: false,
				optionalMember: false,
			})
			// `String#split()`
			|| isMethodCall(node, {
				method: 'split',
				optionalCall: false,
				optionalMember: false,
			})
			// `Object.keys()` and `Object.values()`
			|| isMethodCall(node, {
				object: 'Object',
				methods: ['keys', 'values'],
				argumentsLength: 1,
				optionalCall: false,
				optionalMember: false,
			})
			// `await Promise.all()` and `await Promise.allSettled`
			|| (
				node.type === 'AwaitExpression'
				&& isMethodCall(node.argument, {
					object: 'Promise',
					methods: ['all', 'allSettled'],
					argumentsLength: 1,
					optionalCall: false,
					optionalMember: false,
				})
			)
			// `Array.from()`, `Array.of()`
			|| isMethodCall(node, {
				object: 'Array',
				methods: ['from', 'of'],
				optionalCall: false,
				optionalMember: false,
			})
			// `new Array()`
			|| isNewExpression(node, {name: 'Array'})
		)) {
			return;
		}

		const problem = {
			node: arrayExpression,
			messageId: CLONE_ARRAY,
		};

		if (
			// `[...new Array(1)]` -> `new Array(1)` is not safe to fix since there are holes
			isNewExpression(node, {name: 'Array'})
			// `[...foo.slice(1)]` -> `foo.slice(1)` is not safe to fix since `foo` can be a string
			|| (
				node.type === 'CallExpression'
				&& node.callee.type === 'MemberExpression'
				&& node.callee.property.type === 'Identifier'
				&& node.callee.property.name === 'slice'
			)
		) {
			return problem;
		}

		return Object.assign(problem, {
			fix: fixer => unwrapSingleArraySpread(fixer, arrayExpression, sourceCode),
		});
	});
};

/** @type {import('eslint').Rule.RuleModule} */
const config = {
	create,
	meta: {
		type: 'suggestion',
		docs: {
			description: 'Disallow unnecessary spread.',
			recommended: true,
		},
		fixable: 'code',
		messages,
	},
};

export default config;
