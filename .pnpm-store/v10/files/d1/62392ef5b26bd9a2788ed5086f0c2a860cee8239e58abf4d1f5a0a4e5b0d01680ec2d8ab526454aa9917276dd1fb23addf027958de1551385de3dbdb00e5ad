import simpleArraySearchRule from './shared/simple-array-search-rule.js';

const indexOfOverFindIndexRule = simpleArraySearchRule({
	method: 'findIndex',
	replacement: 'indexOf',
});

const lastIndexOfOverFindLastIndexRule = simpleArraySearchRule({
	method: 'findLastIndex',
	replacement: 'lastIndexOf',
});

/** @type {import('eslint').Rule.RuleModule} */
const config = {
	create(context) {
		indexOfOverFindIndexRule.listen(context);
		lastIndexOfOverFindLastIndexRule.listen(context);
	},
	meta: {
		type: 'suggestion',
		docs: {
			description: 'Prefer `Array#{indexOf,lastIndexOf}()` over `Array#{findIndex,findLastIndex}()` when looking for the index of an item.',
			recommended: true,
		},
		fixable: 'code',
		hasSuggestions: true,
		messages: {
			...indexOfOverFindIndexRule.messages,
			...lastIndexOfOverFindLastIndexRule.messages,
		},
	},
};

export default config;
