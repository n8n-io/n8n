import {isRegExp} from 'node:util/types';
import {findVariable} from '@eslint-community/eslint-utils';
import {getAvailableVariableName} from './utils/index.js';
import {renameVariable} from './fix/index.js';
import {isMethodCall} from './ast/index.js';

const MESSAGE_ID = 'catch-error-name';
const messages = {
	[MESSAGE_ID]: 'The catch parameter `{{originalName}}` should be named `{{fixedName}}`.',
};

// - `promise.then(…, foo => {})`
// - `promise.then(…, function(foo) {})`
// - `promise.catch(foo => {})`
// - `promise.catch(function(foo) {})`
const isPromiseCatchParameter = node =>
	(node.parent.type === 'FunctionExpression' || node.parent.type === 'ArrowFunctionExpression')
	&& node.parent.params[0] === node
	&& (
		isMethodCall(node.parent.parent, {
			method: 'then',
			argumentsLength: 2,
			optionalCall: false,
			optionalMember: false,
		})
		|| isMethodCall(node.parent.parent, {
			method: 'catch',
			argumentsLength: 1,
			optionalCall: false,
			optionalMember: false,
		})
	)
	&& node.parent.parent.arguments.at(-1) === node.parent;

/** @param {import('eslint').Rule.RuleContext} context */
const create = context => {
	const options = {
		name: 'error',
		ignore: [],
		...context.options[0],
	};
	const {name: expectedName} = options;
	const ignore = options.ignore.map(
		pattern => isRegExp(pattern) ? pattern : new RegExp(pattern, 'u'),
	);
	const isNameAllowed = name =>
		name === expectedName
		|| ignore.some(regexp => regexp.test(name))
		|| name.endsWith(expectedName)
		|| name.endsWith(expectedName.charAt(0).toUpperCase() + expectedName.slice(1));

	return {
		Identifier(node) {
			if (
				!(node.parent.type === 'CatchClause' && node.parent.param === node)
				&& !isPromiseCatchParameter(node)
			) {
				return;
			}

			const originalName = node.name;

			if (
				isNameAllowed(originalName)
				|| isNameAllowed(originalName.replaceAll(/_+$/g, ''))
			) {
				return;
			}

			const scope = context.sourceCode.getScope(node);
			const variable = findVariable(scope, node);

			// This was reported https://github.com/sindresorhus/eslint-plugin-unicorn/issues/1075#issuecomment-768072967
			// But can't reproduce, just ignore this case
			/* c8 ignore next 3 */
			if (!variable) {
				return;
			}

			if (originalName === '_' && variable.references.length === 0) {
				return;
			}

			const scopes = [
				variable.scope,
				...variable.references.map(({from}) => from),
			];
			const fixedName = getAvailableVariableName(expectedName, scopes);

			const problem = {
				node,
				messageId: MESSAGE_ID,
				data: {
					originalName,
					fixedName: fixedName || expectedName,
				},
			};

			if (fixedName) {
				problem.fix = fixer => renameVariable(variable, fixedName, fixer);
			}

			return problem;
		},
	};
};

const schema = [
	{
		type: 'object',
		additionalProperties: false,
		properties: {
			name: {
				type: 'string',
			},
			ignore: {
				type: 'array',
				uniqueItems: true,
			},
		},
	},
];

/** @type {import('eslint').Rule.RuleModule} */
const config = {
	create,
	meta: {
		type: 'suggestion',
		docs: {
			description: 'Enforce a specific parameter name in catch clauses.',
			recommended: true,
		},
		fixable: 'code',
		schema,
		defaultOptions: [{}],
		messages,
	},
};

export default config;
