import {findVariable} from '@eslint-community/eslint-utils';
import {fixSpaceAroundKeyword} from './fix/index.js';
import {isNewExpression, isMemberExpression} from './ast/index.js';

const MESSAGE_ID = 'prefer-set-size';
const messages = {
	[MESSAGE_ID]: 'Prefer using `Set#size` instead of `Array#length`.',
};

const isNewSet = node => isNewExpression(node, {name: 'Set'});

function isSet(node, scope) {
	if (isNewSet(node)) {
		return true;
	}

	if (node.type !== 'Identifier') {
		return false;
	}

	const variable = findVariable(scope, node);

	if (!variable || variable.defs.length !== 1) {
		return false;
	}

	const [definition] = variable.defs;

	if (definition.type !== 'Variable' || definition.kind !== 'const') {
		return false;
	}

	const declarator = definition.node;
	return declarator.type === 'VariableDeclarator'
		&& declarator.id.type === 'Identifier'
		&& isNewSet(definition.node.init);
}

// `[...set].length` -> `set.size`
function fix(sourceCode, lengthAccessNodes) {
	const {
		object: arrayExpression,
		property,
	} = lengthAccessNodes;
	const set = arrayExpression.elements[0].argument;

	if (sourceCode.getCommentsInside(arrayExpression).length > sourceCode.getCommentsInside(set).length) {
		return;
	}

	/** @param {import('eslint').Rule.RuleFixer} fixer */
	return function * (fixer) {
		yield fixer.replaceText(property, 'size');
		yield fixer.replaceText(arrayExpression, sourceCode.getText(set));
		yield * fixSpaceAroundKeyword(fixer, lengthAccessNodes, sourceCode);
	};
}

/** @param {import('eslint').Rule.RuleContext} context */
const create = context => {
	const {sourceCode} = context;

	return {
		MemberExpression(node) {
			if (
				!isMemberExpression(node, {
					property: 'length',
					optional: false,
				})
				|| node.object.type !== 'ArrayExpression'
				|| node.object.elements.length !== 1
				|| node.object.elements[0]?.type !== 'SpreadElement'
			) {
				return;
			}

			const maybeSet = node.object.elements[0].argument;
			if (!isSet(maybeSet, sourceCode.getScope(maybeSet))) {
				return;
			}

			return {
				node: node.property,
				messageId: MESSAGE_ID,
				fix: fix(sourceCode, node),
			};
		},
	};
};

/** @type {import('eslint').Rule.RuleModule} */
const config = {
	create,
	meta: {
		type: 'suggestion',
		docs: {
			description: 'Prefer using `Set#size` instead of `Array#length`.',
			recommended: true,
		},
		fixable: 'code',
		messages,
	},
};

export default config;
