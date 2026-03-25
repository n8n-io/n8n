import {hasSideEffect} from '@eslint-community/eslint-utils';
import isSameReference from './utils/is-same-reference.js';
import getIndentString from './utils/get-indent-string.js';

const MESSAGE_ID = 'prefer-switch';
const messages = {
	[MESSAGE_ID]: 'Use `switch` instead of multiple `else-if`.',
};

const isSame = (nodeA, nodeB) => nodeA === nodeB || isSameReference(nodeA, nodeB);

function getEqualityComparisons(node) {
	const nodes = [node];
	const compareExpressions = [];
	while (nodes.length > 0) {
		node = nodes.pop();

		if (node.type === 'LogicalExpression' && node.operator === '||') {
			nodes.push(node.right, node.left);
			continue;
		}

		if (node.type !== 'BinaryExpression' || node.operator !== '===') {
			return [];
		}

		compareExpressions.push(node);
	}

	return compareExpressions;
}

function getCommonReferences(expressions, candidates) {
	for (const {left, right} of expressions) {
		candidates = candidates.filter(node => isSame(node, left) || isSame(node, right));

		if (candidates.length === 0) {
			break;
		}
	}

	return candidates;
}

function getStatements(statement) {
	let discriminantCandidates;
	const ifStatements = [];
	for (; statement && statement.type === 'IfStatement'; statement = statement.alternate) {
		const {test} = statement;
		const compareExpressions = getEqualityComparisons(test);

		if (compareExpressions.length === 0) {
			break;
		}

		if (!discriminantCandidates) {
			const [{left, right}] = compareExpressions;
			discriminantCandidates = [left, right];
		}

		const candidates = getCommonReferences(
			compareExpressions,
			discriminantCandidates,
		);

		if (candidates.length === 0) {
			break;
		}

		discriminantCandidates = candidates;

		ifStatements.push({
			statement,
			compareExpressions,
		});
	}

	return {
		ifStatements,
		discriminant: discriminantCandidates && discriminantCandidates[0],
	};
}

const breakAbleNodeTypes = new Set([
	'WhileStatement',
	'DoWhileStatement',
	'ForStatement',
	'ForOfStatement',
	'ForInStatement',
	'SwitchStatement',
]);
const getBreakTarget = node => {
	for (;node.parent; node = node.parent) {
		if (breakAbleNodeTypes.has(node.type)) {
			return node;
		}
	}
};

const isNodeInsideNode = (inner, outer) =>
	// eslint-disable-next-line internal/no-restricted-property-access
	inner.range[0] >= outer.range[0] && inner.range[1] <= outer.range[1];
function hasBreakInside(breakStatements, node) {
	for (const breakStatement of breakStatements) {
		if (!isNodeInsideNode(breakStatement, node)) {
			continue;
		}

		const breakTarget = getBreakTarget(breakStatement);

		if (!breakTarget) {
			return true;
		}

		if (isNodeInsideNode(node, breakTarget)) {
			return true;
		}
	}

	return false;
}

function * insertBracesIfNotBlockStatement(node, fixer, indent) {
	if (!node || node.type === 'BlockStatement') {
		return;
	}

	yield fixer.insertTextBefore(node, `{\n${indent}`);
	yield fixer.insertTextAfter(node, `\n${indent}}`);
}

function * insertBreakStatement(node, fixer, sourceCode, indent) {
	if (node.type === 'BlockStatement') {
		const lastToken = sourceCode.getLastToken(node);
		yield fixer.insertTextBefore(lastToken, `\n${indent}break;\n${indent}`);
	} else {
		yield fixer.insertTextAfter(node, `\n${indent}break;`);
	}
}

function getBlockStatementLastNode(blockStatement) {
	const {body} = blockStatement;
	for (let index = body.length - 1; index >= 0; index--) {
		const node = body[index];
		if (node.type === 'FunctionDeclaration' || node.type === 'EmptyStatement') {
			continue;
		}

		if (node.type === 'BlockStatement') {
			const last = getBlockStatementLastNode(node);
			if (last) {
				return last;
			}

			continue;
		}

		return node;
	}
}

function shouldInsertBreakStatement(node) {
	switch (node.type) {
		case 'ReturnStatement':
		case 'ThrowStatement': {
			return false;
		}

		case 'IfStatement': {
			return !node.alternate
				|| shouldInsertBreakStatement(node.consequent)
				|| shouldInsertBreakStatement(node.alternate);
		}

		case 'BlockStatement': {
			const lastNode = getBlockStatementLastNode(node);
			return !lastNode || shouldInsertBreakStatement(lastNode);
		}

		default: {
			return true;
		}
	}
}

function fix({discriminant, ifStatements}, sourceCode, options) {
	const discriminantText = sourceCode.getText(discriminant);

	return function * (fixer) {
		const firstStatement = ifStatements[0].statement;
		const indent = getIndentString(firstStatement, sourceCode);
		yield fixer.insertTextBefore(firstStatement, `switch (${discriminantText}) {`);

		const lastStatement = ifStatements.at(-1).statement;
		if (lastStatement.alternate) {
			const {alternate} = lastStatement;
			yield fixer.insertTextBefore(alternate, `\n${indent}default: `);
			/*
			Technically, we should insert braces for the following case,
			but who writes like this? And using `let`/`const` is invalid.

			```js
			if (foo === 1) {}
			else if (foo === 2) {}
			else if (foo === 3) {}
			else var a = 1;
			```
			*/
		} else {
			switch (options.emptyDefaultCase) {
				case 'no-default-comment': {
					yield fixer.insertTextAfter(firstStatement, `\n${indent}// No default`);
					break;
				}

				case 'do-nothing-comment': {
					yield fixer.insertTextAfter(firstStatement, `\n${indent}default:\n${indent}// Do nothing`);
					break;
				}
				// No default
			}
		}

		yield fixer.insertTextAfter(firstStatement, `\n${indent}}`);

		for (const {statement, compareExpressions} of ifStatements) {
			const {consequent, alternate} = statement;

			if (alternate) {
				const [, start] = sourceCode.getRange(consequent);
				const [end] = sourceCode.getRange(alternate);
				yield fixer.removeRange([start, end]);
			}

			const headRange = [
				sourceCode.getRange(statement)[0],
				sourceCode.getRange(consequent)[0],
			];
			yield fixer.removeRange(headRange);
			for (const {left, right} of compareExpressions) {
				const node = isSame(left, discriminant) ? right : left;
				const text = sourceCode.getText(node);
				yield fixer.insertTextBefore(consequent, `\n${indent}case ${text}: `);
			}

			if (shouldInsertBreakStatement(consequent)) {
				yield * insertBreakStatement(consequent, fixer, sourceCode, indent);
				yield * insertBracesIfNotBlockStatement(consequent, fixer, indent);
			}
		}
	};
}

/** @param {import('eslint').Rule.RuleContext} context */
const create = context => {
	const options = {
		minimumCases: 3,
		emptyDefaultCase: 'no-default-comment',
		insertBreakInDefaultCase: false,
		...context.options[0],
	};
	const {sourceCode} = context;
	const ifStatements = new Set();
	const breakStatements = [];
	const checked = new Set();

	return {
		IfStatement(node) {
			ifStatements.add(node);
		},
		BreakStatement(node) {
			if (!node.label) {
				breakStatements.push(node);
			}
		},
		* 'Program:exit'() {
			for (const node of ifStatements) {
				if (checked.has(node)) {
					continue;
				}

				const {discriminant, ifStatements} = getStatements(node);

				if (!discriminant || ifStatements.length < options.minimumCases) {
					continue;
				}

				for (const {statement} of ifStatements) {
					checked.add(statement);
				}

				const problem = {
					loc: {
						start: sourceCode.getLoc(node).start,
						end: sourceCode.getLoc(node.consequent).start,
					},
					messageId: MESSAGE_ID,
				};

				if (
					!hasSideEffect(discriminant, sourceCode)
					&& !ifStatements.some(({statement}) => hasBreakInside(breakStatements, statement))
				) {
					problem.fix = fix({discriminant, ifStatements}, sourceCode, options);
				}

				yield problem;
			}
		},
	};
};

const schema = [
	{
		type: 'object',
		additionalProperties: false,
		properties: {
			minimumCases: {
				type: 'integer',
				minimum: 2,
			},
			emptyDefaultCase: {
				enum: [
					'no-default-comment',
					'do-nothing-comment',
					'no-default-case',
				],
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
			description: 'Prefer `switch` over multiple `else-if`.',
			recommended: true,
		},
		fixable: 'code',
		schema,
		defaultOptions: [
			{
				minimumCases: 3,
				emptyDefaultCase: 'no-default-comment',
			},
		],
		messages,
	},
};

export default config;
