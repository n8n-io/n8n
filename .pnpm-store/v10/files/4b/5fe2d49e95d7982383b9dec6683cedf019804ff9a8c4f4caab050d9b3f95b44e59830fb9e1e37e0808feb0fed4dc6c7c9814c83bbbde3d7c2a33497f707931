import type { namedTypes } from 'ast-types';
import type { types } from 'recast';
import { parse, visit, print } from 'recast';

import { builders as b } from 'ast-types';

import type { ExpressionKind, StatementKind } from 'ast-types/lib/gen/kinds';
import { globalIdentifier, jsVariablePolyfill } from './VariablePolyfill';
import type { DataNode } from './VariablePolyfill';
import { splitExpression } from './ExpressionSplitter';
import type { ExpressionCode, ExpressionText } from './ExpressionSplitter';
import { parseWithEsprimaNext } from './Parser';
import type { TournamentHooks } from './ast';

export interface ExpressionAnalysis {
	has: {
		function: boolean;
		templateString: boolean;
	};
}

const v = b.identifier('v');

const shouldAlwaysWrapList = ['window', 'global', 'this'];

const shouldWrapInTry = (node: namedTypes.ASTNode) => {
	let shouldWrap = false;

	visit(node, {
		visitMemberExpression() {
			shouldWrap = true;
			return false;
		},
		visitCallExpression() {
			shouldWrap = true;
			return false;
		},
		visitIdentifier(path) {
			if (shouldAlwaysWrapList.includes(path.node.name)) {
				shouldWrap = true;
				return false;
			}
			this.traverse(path);
			return;
		},
	});

	return shouldWrap;
};

const hasFunction = (node: types.namedTypes.ASTNode) => {
	let hasFn = false;

	visit(node, {
		visitFunctionExpression() {
			hasFn = true;
			return false;
		},
		visitFunctionDeclaration() {
			hasFn = true;
			return false;
		},
		visitArrowFunctionExpression() {
			hasFn = true;
			return false;
		},
	});

	return hasFn;
};

const hasTemplateString = (node: types.namedTypes.ASTNode) => {
	let hasTemp = false;

	visit(node, {
		visitTemplateLiteral(path) {
			if (path.node.expressions.length) {
				hasTemp = true;
				return false;
			}
			this.traverse(path);
			return;
		},
	});

	return hasTemp;
};

const wrapInErrorHandler = (node: StatementKind) => {
	return b.tryStatement(
		b.blockStatement([node]),
		b.catchClause(
			b.identifier('e'),
			null,
			b.blockStatement([
				b.expressionStatement(
					b.callExpression(b.identifier('E'), [b.identifier('e'), b.thisExpression()]),
				),
			]),
		),
	);
};

const maybeWrapExpr = (expr: string): string => {
	if (expr.trimStart()[0] === '{') {
		return '(' + expr + ')';
	}
	return expr;
};

const buildFunctionBody = (expr: ExpressionKind) => {
	return b.blockStatement([
		// v = (<actual expression>)
		b.expressionStatement(b.assignmentExpression('=', v, expr)),
		// Return value or empty string on some falsy values
		// return v || v === 0 || v === false ? v : 0
		// The ordering is important for AST nodes to match
		// tmpl's output
		b.returnStatement(
			b.conditionalExpression(
				b.logicalExpression(
					'||',
					b.logicalExpression('||', v, b.binaryExpression('===', v, b.literal(0))),
					b.binaryExpression('===', v, b.literal(false)),
				),
				v,
				b.literal(''),
			),
		),
	]);
};

type ParsedCode = ExpressionCode & { parsed: types.namedTypes.File };

// This replaces any actual new lines with \n's. This only happens in
// template strings.
const fixStringNewLines = (node: types.namedTypes.File): types.namedTypes.File => {
	const replace = (str: string): string => {
		return str.replace(/\n/g, '\\n');
	};
	visit(node, {
		visitTemplateElement(path) {
			this.traverse(path);
			const el = b.templateElement(
				{
					cooked: path.node.value.cooked === null ? null : replace(path.node.value.cooked),
					raw: replace(path.node.value.raw),
				},
				path.node.tail,
			);
			path.replace(el);
		},
	});

	return node;
};

export const getParsedExpression = (expr: string): Array<ExpressionText | ParsedCode> => {
	return splitExpression(expr).map<ExpressionText | ParsedCode>((chunk) => {
		if (chunk.type === 'code') {
			const code = maybeWrapExpr(chunk.text);
			const node = parse(code, {
				parser: { parse: parseWithEsprimaNext },
			}) as types.namedTypes.File;

			return { ...chunk, parsed: node };
		}
		return chunk;
	});
};

export const getExpressionCode = (
	expr: string,
	dataNodeName: string,
	hooks: TournamentHooks,
): [string, ExpressionAnalysis] => {
	const chunks = getParsedExpression(expr);

	const newProg = b.program([
		b.variableDeclaration('var', [b.variableDeclarator(globalIdentifier, b.objectExpression([]))]),
	]);

	// This is what's used to access that's passed in. For compatibility we us
	// `this` unless the expression contains a function. If it contains an
	// expression we instead assign a different variable to hold onto the contents
	// of `this` (default: `___n8n_data`) since functions aren't compatibility
	// anyway.
	let dataNode: DataNode = b.thisExpression();
	const hasFn = (chunks.filter((c) => c.type === 'code') as ParsedCode[]).some((c) =>
		hasFunction(c.parsed),
	);
	if (hasFn) {
		dataNode = b.identifier(dataNodeName);
		newProg.body.push(
			b.variableDeclaration('var', [b.variableDeclarator(dataNode, b.thisExpression())]),
		);
	}

	const hasTempString = (chunks.filter((c) => c.type === 'code') as ParsedCode[]).some((c) =>
		hasTemplateString(c.parsed),
	);

	// So for compatibility we parse expressions the same way that `tmpl` does.
	// This means we always have an initial text chunk but if there's only a blank
	// text chunk and a code chunk then we want to return the actual value of the
	// expression, not turn it into a string.
	if (
		chunks.length > 2 ||
		chunks[0].text !== '' ||
		// This is a blank expression. It should just return an empty string
		(chunks[0].text === '' && chunks.length === 1)
	) {
		let parts: ExpressionKind[] = [];
		for (const chunk of chunks) {
			// This is just a text chunks, push it up as a literal.
			if (chunk.type === 'text') {
				parts.push(b.literal(chunk.text));
				// This is a code chunk so do some magic
			} else {
				const fixed = fixStringNewLines(chunk.parsed);
				for (const hook of hooks.before) {
					hook(fixed, dataNode);
				}
				const parsed = jsVariablePolyfill(fixed, dataNode)?.[0];
				if (!parsed || parsed.type !== 'ExpressionStatement') {
					throw new SyntaxError('Not a expression statement');
				}

				for (const hook of hooks.after) {
					hook(parsed, dataNode);
				}

				const functionBody = buildFunctionBody(parsed.expression);

				if (shouldWrapInTry(parsed)) {
					// Wraps the body of our expression function in a try/catch
					// to match tmpl
					functionBody.body = [
						wrapInErrorHandler(functionBody.body[0]),
						// This is for tmpl compat. It puts a ; after the try/catch
						// creating an empty statement. emptyStatement is just printed
						// to nothing so we use an expression statement with a blank
						// identifier.
						b.expressionStatement(b.identifier('')),
						functionBody.body[1],
					];
				}

				// Turn our expression into a function call with bound this. The function
				// it create has a parameter called `v` that we don't actually set. I think
				// this is a hack around only being able to use `var` and not `let`/`const`.
				parts.push(
					b.callExpression(
						b.memberExpression(b.functionExpression(null, [v], functionBody), b.identifier('call')),
						[b.thisExpression()],
					),
				);
			}
		}

		// Just return the raw string if it's just a single string
		if (chunks.length < 2) {
			newProg.body.push(b.returnStatement(parts[0]));
		} else {
			// Filter out empty string literals for compat
			parts = parts.filter((i) => !(i.type === 'Literal' && i.value === ''));
			newProg.body.push(
				b.returnStatement(
					b.callExpression(b.memberExpression(b.arrayExpression(parts), b.identifier('join')), [
						b.literal(''),
					]),
				),
			);
		}
	} else {
		const fixed = fixStringNewLines((chunks[1] as ParsedCode).parsed);
		for (const hook of hooks.before) {
			hook(fixed, dataNode);
		}
		const parsed = jsVariablePolyfill(fixed, dataNode)?.[0];
		if (!parsed || parsed.type !== 'ExpressionStatement') {
			throw new SyntaxError('Not a expression statement');
		}

		for (const hook of hooks.after) {
			hook(parsed, dataNode);
		}

		let retData: StatementKind = b.returnStatement(parsed.expression);
		if (shouldWrapInTry(parsed)) {
			retData = wrapInErrorHandler(retData);
		}
		newProg.body.push(retData);
	}

	return [print(newProg).code, { has: { function: hasFn, templateString: hasTempString } }];
};
