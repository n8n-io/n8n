import {getStaticValue} from '@eslint-community/eslint-utils';

const MESSAGE_ID = 'consistent-empty-array-spread';
const messages = {
	[MESSAGE_ID]: 'Prefer using empty {{replacementDescription}} since the {{anotherNodePosition}} is {{anotherNodeDescription}}.',
};

const isEmptyArrayExpression = node =>
	node.type === 'ArrayExpression'
	&& node.elements.length === 0;

const isEmptyStringLiteral = node =>
	node.type === 'Literal'
	&& node.value === '';

const isString = (node, context) => {
	const staticValueResult = getStaticValue(node, context.sourceCode.getScope(node));
	return typeof staticValueResult?.value === 'string';
};

const isArray = (node, context) => {
	if (node.type === 'ArrayExpression') {
		return true;
	}

	const staticValueResult = getStaticValue(node, context.sourceCode.getScope(node));
	return Array.isArray(staticValueResult?.value);
};

const cases = [
	{
		oneSidePredicate: isEmptyStringLiteral,
		anotherSidePredicate: isArray,
		anotherNodeDescription: 'an array',
		replacementDescription: 'array',
		replacementCode: '[]',
	},
	{
		oneSidePredicate: isEmptyArrayExpression,
		anotherSidePredicate: isString,
		anotherNodeDescription: 'a string',
		replacementDescription: 'string',
		replacementCode: '\'\'',
	},
];

function createProblem({
	problemNode,
	anotherNodePosition,
	anotherNodeDescription,
	replacementDescription,
	replacementCode,
}) {
	return {
		node: problemNode,
		messageId: MESSAGE_ID,
		data: {
			replacementDescription,
			anotherNodePosition,
			anotherNodeDescription,
		},
		fix: fixer => fixer.replaceText(problemNode, replacementCode),
	};
}

function getProblem(conditionalExpression, context) {
	const {
		consequent,
		alternate,
	} = conditionalExpression;

	for (const problemCase of cases) {
		const {
			oneSidePredicate,
			anotherSidePredicate,
		} = problemCase;

		if (oneSidePredicate(consequent, context) && anotherSidePredicate(alternate, context)) {
			return createProblem({
				...problemCase,
				problemNode: consequent,
				anotherNodePosition: 'alternate',
			});
		}

		if (oneSidePredicate(alternate, context) && anotherSidePredicate(consequent, context)) {
			return createProblem({
				...problemCase,
				problemNode: alternate,
				anotherNodePosition: 'consequent',
			});
		}
	}
}

/** @param {import('eslint').Rule.RuleContext} context */
const create = context => ({
	* ArrayExpression(arrayExpression) {
		for (const element of arrayExpression.elements) {
			if (
				element?.type !== 'SpreadElement'
				|| element.argument.type !== 'ConditionalExpression'
			) {
				continue;
			}

			yield getProblem(element.argument, context);
		}
	},
});

/** @type {import('eslint').Rule.RuleModule} */
const config = {
	create,
	meta: {
		type: 'suggestion',
		docs: {
			description: 'Prefer consistent types when spreading a ternary in an array literal.',
			recommended: true,
		},
		fixable: 'code',

		messages,
	},
};

export default config;
