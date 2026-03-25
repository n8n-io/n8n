import {findVariable} from '@eslint-community/eslint-utils';
import {functionTypes} from './ast/index.js';

const MESSAGE_ID = 'preferDefaultParameters';
const MESSAGE_ID_SUGGEST = 'preferDefaultParametersSuggest';

const isDefaultExpression = (left, right) =>
	left
	&& right
	&& left.type === 'Identifier'
	&& right.type === 'LogicalExpression'
	&& (right.operator === '||' || right.operator === '??')
	&& right.left.type === 'Identifier'
	&& right.right.type === 'Literal';

const containsCallExpression = (sourceCode, node) => {
	if (!node) {
		return false;
	}

	if (node.type === 'CallExpression') {
		return true;
	}

	const keys = sourceCode.visitorKeys[node.type];

	for (const key of keys) {
		const value = node[key];

		if (Array.isArray(value)) {
			for (const element of value) {
				if (containsCallExpression(sourceCode, element)) {
					return true;
				}
			}
		} else if (containsCallExpression(sourceCode, value)) {
			return true;
		}
	}

	return false;
};

const hasSideEffects = (sourceCode, function_, node) => {
	for (const element of function_.body.body) {
		if (element === node) {
			break;
		}

		// Function call before default-assignment
		if (containsCallExpression(sourceCode, element)) {
			return true;
		}
	}

	return false;
};

const hasExtraReferences = (assignment, references, left) => {
	// Parameter is referenced prior to default-assignment
	if (assignment && references[0].identifier !== left) {
		return true;
	}

	// Old parameter is still referenced somewhere else
	if (!assignment && references.length > 1) {
		return true;
	}

	return false;
};

const isLastParameter = (parameters, parameter) => {
	const lastParameter = parameters.at(-1);

	// See 'default-param-last' rule
	return parameter && parameter === lastParameter;
};

const needsParentheses = (sourceCode, function_) => {
	if (function_.type !== 'ArrowFunctionExpression' || function_.params.length > 1) {
		return false;
	}

	const [parameter] = function_.params;
	const before = sourceCode.getTokenBefore(parameter);
	const after = sourceCode.getTokenAfter(parameter);

	return !after || !before || before.value !== '(' || after.value !== ')';
};

/** @param {import('eslint').Rule.RuleFixer} fixer */
const fixDefaultExpression = (fixer, sourceCode, node) => {
	const {line} = sourceCode.getLoc(node).start;
	const {column} = sourceCode.getLoc(node).end;
	const nodeText = sourceCode.getText(node);
	const lineText = sourceCode.lines[line - 1];
	const isOnlyNodeOnLine = lineText.trim() === nodeText;
	const endsWithWhitespace = lineText[column] === ' ';

	if (isOnlyNodeOnLine) {
		return fixer.removeRange([
			sourceCode.getIndexFromLoc({line, column: 0}),
			sourceCode.getIndexFromLoc({line: line + 1, column: 0}),
		]);
	}

	if (endsWithWhitespace) {
		const [start, end] = sourceCode.getRange(node);
		return fixer.removeRange([start, end + 1]);
	}

	return fixer.remove(node);
};

/** @param {import('eslint').Rule.RuleContext} context */
const create = context => {
	const {sourceCode} = context;
	const functionStack = [];

	const checkExpression = (node, left, right, assignment) => {
		const currentFunction = functionStack.at(-1);

		if (!currentFunction || !isDefaultExpression(left, right)) {
			return;
		}

		const {name: firstId} = left;
		const {
			left: {name: secondId},
			right: {raw: literal},
		} = right;

		// Parameter is reassigned to a different identifier
		if (assignment && firstId !== secondId) {
			return;
		}

		const variable = findVariable(sourceCode.getScope(node), secondId);

		// This was reported https://github.com/sindresorhus/eslint-plugin-unicorn/issues/1122
		// But can't reproduce, just ignore this case
		/* c8 ignore next 3 */
		if (!variable) {
			return;
		}

		const {references} = variable;
		const {params} = currentFunction;
		const parameter = params.find(parameter =>
			parameter.type === 'Identifier'
			&& parameter.name === secondId,
		);

		if (
			hasSideEffects(sourceCode, currentFunction, node)
			|| hasExtraReferences(assignment, references, left)
			|| !isLastParameter(params, parameter)
		) {
			return;
		}

		const replacement = needsParentheses(sourceCode, currentFunction)
			? `(${firstId} = ${literal})`
			: `${firstId} = ${literal}`;

		return {
			node,
			messageId: MESSAGE_ID,
			suggest: [{
				messageId: MESSAGE_ID_SUGGEST,
				fix: fixer => [
					fixer.replaceText(parameter, replacement),
					fixDefaultExpression(fixer, sourceCode, node),
				],
			}],
		};
	};

	context.on(functionTypes, node => {
		functionStack.push(node);
	});

	context.onExit(functionTypes, () => {
		functionStack.pop();
	});

	context.on('AssignmentExpression', node => {
		if (node.parent.type === 'ExpressionStatement' && node.parent.expression === node) {
			return checkExpression(node.parent, node.left, node.right, true);
		}
	});

	context.on('VariableDeclarator', node => {
		if (node.parent.type === 'VariableDeclaration' && node.parent.declarations[0] === node) {
			return checkExpression(node.parent, node.id, node.init, false);
		}
	});
};

/** @type {import('eslint').Rule.RuleModule} */
const config = {
	create,
	meta: {
		type: 'suggestion',
		docs: {
			description: 'Prefer default parameters over reassignment.',
			recommended: true,
		},
		fixable: 'code',
		hasSuggestions: true,
		messages: {
			[MESSAGE_ID]: 'Prefer default parameters over reassignment.',
			[MESSAGE_ID_SUGGEST]: 'Replace reassignment with default parameter.',
		},
	},
};

export default config;
