import helperValidatorIdentifier from '@babel/helper-validator-identifier';
import {escapeString, hasOptionalChainElement, isValueNotUsable} from './utils/index.js';
import {isMethodCall, isStringLiteral, isExpressionStatement} from './ast/index.js';

const {isIdentifierName} = helperValidatorIdentifier;
const MESSAGE_ID = 'prefer-dom-node-dataset';
const messages = {
	[MESSAGE_ID]: 'Prefer `.dataset` over `{{method}}(…)`.',
};

const dashToCamelCase = string => string.replaceAll(/-[a-z]/g, s => s[1].toUpperCase());

function getFix(callExpression, context) {
	const method = callExpression.callee.property.name;

	// `foo?.bar = ''` is invalid
	// TODO: Remove this restriction if https://github.com/nicolo-ribaudo/ecma262/pull/4 get merged
	if (method === 'setAttribute' && hasOptionalChainElement(callExpression.callee)) {
		return;
	}

	// `element.setAttribute(…)` returns `undefined`, but `AssignmentExpression` returns value of RHS
	if (method === 'setAttribute' && !isValueNotUsable(callExpression)) {
		return;
	}

	if (method === 'removeAttribute' && !isExpressionStatement(callExpression.parent)) {
		return;
	}

	return fixer => {
		const [nameNode] = callExpression.arguments;
		const name = dashToCamelCase(nameNode.value.toLowerCase().slice(5));
		const {sourceCode} = context;
		let text = '';
		const datasetText = `${sourceCode.getText(callExpression.callee.object)}.dataset`;
		switch (method) {
			case 'setAttribute':
			case 'getAttribute':
			case 'removeAttribute': {
				text = isIdentifierName(name) ? `.${name}` : `[${escapeString(name, nameNode.raw.charAt(0))}]`;
				text = `${datasetText}${text}`;
				if (method === 'setAttribute') {
					text += ` = ${sourceCode.getText(callExpression.arguments[1])}`;
				} else if (method === 'removeAttribute') {
					text = `delete ${text}`;
				}

				/*
				For non-exists attribute, `element.getAttribute('data-foo')` returns `null`,
				but `element.dataset.foo` returns `undefined`, switch to suggestions if necessary
				*/
				break;
			}

			case 'hasAttribute': {
				text = `Object.hasOwn(${datasetText}, ${escapeString(name, nameNode.raw.charAt(0))})`;
				break;
			}
			// No default
		}

		return fixer.replaceText(callExpression, text);
	};
}

/** @param {import('eslint').Rule.RuleContext} context */
const create = context => ({
	CallExpression(callExpression) {
		if (!(
			(
				isMethodCall(callExpression, {
					method: 'setAttribute',
					argumentsLength: 2,
					optionalCall: false,
					optionalMember: false,
				})
				|| isMethodCall(callExpression, {
					methods: ['getAttribute', 'removeAttribute', 'hasAttribute'],
					argumentsLength: 1,
					optionalCall: false,
					optionalMember: false,
				})
			)
			&& isStringLiteral(callExpression.arguments[0])
		)) {
			return;
		}

		const method = callExpression.callee.property.name;
		// Playwright's `Locator#getAttribute()` returns a promise.
		// https://playwright.dev/docs/api/class-locator#locator-get-attribute
		if (
			callExpression.parent.type === 'AwaitExpression'
			&& callExpression.parent.argument === callExpression
			&& method === 'getAttribute'
		) {
			return;
		}

		const attributeName = callExpression.arguments[0].value.toLowerCase();

		if (!attributeName.startsWith('data-')) {
			return;
		}

		return {
			node: callExpression,
			messageId: MESSAGE_ID,
			data: {method: callExpression.callee.property.name},
			fix: getFix(callExpression, context),
		};
	},
});

/** @type {import('eslint').Rule.RuleModule} */
const config = {
	create,
	meta: {
		type: 'suggestion',
		docs: {
			description: 'Prefer using `.dataset` on DOM elements over calling attribute methods.',
			recommended: true,
		},
		fixable: 'code',
		messages,
	},
};

export default config;
