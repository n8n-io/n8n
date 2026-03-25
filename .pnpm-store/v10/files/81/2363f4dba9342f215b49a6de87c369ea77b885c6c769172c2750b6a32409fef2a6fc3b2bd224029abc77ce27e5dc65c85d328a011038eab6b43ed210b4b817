import {isEmptyNode} from './ast/index.js';
import getSwitchCaseHeadLocation from './utils/get-switch-case-head-location.js';

const MESSAGE_ID_ERROR = 'no-useless-switch-case/error';
const MESSAGE_ID_SUGGESTION = 'no-useless-switch-case/suggestion';
const messages = {
	[MESSAGE_ID_ERROR]: 'Useless case in switch statement.',
	[MESSAGE_ID_SUGGESTION]: 'Remove this case.',
};

const isEmptySwitchCase = node => node.consequent.every(node => isEmptyNode(node));

/** @param {import('eslint').Rule.RuleContext} context */
const create = context => ({
	* SwitchStatement(switchStatement) {
		const {cases} = switchStatement;

		// We only check cases where the last case is the `default` case
		if (cases.length < 2 || cases.at(-1).test !== null) {
			return;
		}

		for (let index = cases.length - 2; index >= 0; index--) {
			const node = cases[index];
			if (!isEmptySwitchCase(node)) {
				break;
			}

			yield {
				node,
				loc: getSwitchCaseHeadLocation(node, context.sourceCode),
				messageId: MESSAGE_ID_ERROR,
				suggest: [
					{
						messageId: MESSAGE_ID_SUGGESTION,
						/** @param {import('eslint').Rule.RuleFixer} fixer */
						fix: fixer => fixer.remove(node),
					},
				],
			};
		}
	},
});

/** @type {import('eslint').Rule.RuleModule} */
const config = {
	create,
	meta: {
		type: 'suggestion',
		docs: {
			description: 'Disallow useless case in switch statements.',
			recommended: true,
		},
		hasSuggestions: true,
		messages,
	},
};

export default config;
