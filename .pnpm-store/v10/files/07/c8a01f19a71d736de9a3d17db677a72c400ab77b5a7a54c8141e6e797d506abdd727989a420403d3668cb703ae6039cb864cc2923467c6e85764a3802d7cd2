import {getStaticValue} from '@eslint-community/eslint-utils';
import {
	isCallExpression,
	isNewExpression,
	isUndefined,
	isNullLiteral,
} from './ast/index.js';

const MESSAGE_ID_ERROR = 'no-invalid-fetch-options';
const messages = {
	[MESSAGE_ID_ERROR]: '"body" is not allowed when method is "{{method}}".',
};

const isObjectPropertyWithName = (node, name) =>
	node.type === 'Property'
	&& !node.computed
	&& node.key.type === 'Identifier'
	&& node.key.name === name;

function checkFetchOptions(context, node) {
	if (node.type !== 'ObjectExpression') {
		return;
	}

	const {properties} = node;

	const bodyProperty = properties.findLast(property => isObjectPropertyWithName(property, 'body'));

	if (!bodyProperty) {
		return;
	}

	const bodyValue = bodyProperty.value;
	if (isUndefined(bodyValue) || isNullLiteral(bodyValue)) {
		return;
	}

	const methodProperty = properties.findLast(property => isObjectPropertyWithName(property, 'method'));
	// If `method` is omitted but there is an `SpreadElement`, we just ignore the case
	if (!methodProperty) {
		if (properties.some(node => node.type === 'SpreadElement')) {
			return;
		}

		return {
			node: bodyProperty.key,
			messageId: MESSAGE_ID_ERROR,
			data: {method: 'GET'},
		};
	}

	const methodValue = methodProperty.value;

	const scope = context.sourceCode.getScope(methodValue);
	let method = getStaticValue(methodValue, scope)?.value;

	if (typeof method !== 'string') {
		return;
	}

	method = method.toUpperCase();
	if (method !== 'GET' && method !== 'HEAD') {
		return;
	}

	return {
		node: bodyProperty.key,
		messageId: MESSAGE_ID_ERROR,
		data: {method},
	};
}

/** @param {import('eslint').Rule.RuleContext} context */
const create = context => {
	context.on('CallExpression', callExpression => {
		if (!isCallExpression(callExpression, {
			name: 'fetch',
			minimumArguments: 2,
			optional: false,
		})) {
			return;
		}

		return checkFetchOptions(context, callExpression.arguments[1]);
	});

	context.on('NewExpression', newExpression => {
		if (!isNewExpression(newExpression, {
			name: 'Request',
			minimumArguments: 2,
		})) {
			return;
		}

		return checkFetchOptions(context, newExpression.arguments[1]);
	});
};

/** @type {import('eslint').Rule.RuleModule} */
const config = {
	create,
	meta: {
		type: 'problem',
		docs: {
			description: 'Disallow invalid options in `fetch()` and `new Request()`.',
			recommended: true,
		},
		messages,
	},
};

export default config;
