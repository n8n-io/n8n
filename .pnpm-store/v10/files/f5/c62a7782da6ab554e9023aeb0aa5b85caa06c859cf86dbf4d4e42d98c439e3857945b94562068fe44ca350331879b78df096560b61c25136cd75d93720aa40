import type { StatementKind } from 'ast-types/lib/gen/kinds';
import { types, parse } from 'recast';
import { parseWithEsprimaNext } from './Parser';

const isWrapped = (node: types.namedTypes.File): boolean => {
	return node.program.body[1]?.type === 'TryStatement';
};
const getWrapped = (node: types.namedTypes.File) => {
	return (node.program.body[1] as types.namedTypes.TryStatement)?.block.body[0];
};

const isMultiPartExpression = (node: types.namedTypes.File): boolean => {
	return (
		node.program.body[1]?.type === 'ReturnStatement' &&
		node.program.body[1].argument?.type === 'CallExpression' &&
		node.program.body[1].argument?.arguments[0]?.type === 'Literal' &&
		node.program.body[1].argument?.arguments[0]?.value === '' &&
		node.program.body[1].argument?.callee.type === 'MemberExpression' &&
		node.program.body[1].argument?.callee.object.type === 'ArrayExpression' &&
		node.program.body[1].argument?.callee.property.type === 'Identifier' &&
		node.program.body[1].argument?.callee.property.name === 'join'
	);
};

const getMultiPartExpression = (node: types.namedTypes.File): StatementKind[] => {
	if (
		!(
			node.program.body[1]?.type === 'ReturnStatement' &&
			node.program.body[1].argument?.type === 'CallExpression' &&
			node.program.body[1].argument?.arguments[0]?.type === 'Literal' &&
			node.program.body[1].argument?.arguments[0]?.value === '' &&
			node.program.body[1].argument?.callee.type === 'MemberExpression' &&
			node.program.body[1].argument?.callee.object.type === 'ArrayExpression'
		)
	) {
		return [];
	}
	return node.program.body[1].argument.callee.object.elements
		.map((e) => {
			if (
				e?.type !== 'CallExpression' ||
				e.callee.type !== 'MemberExpression' ||
				e.callee.object.type !== 'FunctionExpression'
			) {
				return null;
			}
			const maybeExpr = e.callee.object.body.body[0];
			if (maybeExpr.type !== 'TryStatement') {
				return maybeExpr;
			}
			return maybeExpr.block.body[0];
		})
		.filter((e) => e !== null) as StatementKind[];
};

export const isDifferent = (tmpl: string, tourn: string): boolean => {
	const tmplParsed = parse(tmpl, {
		parser: { parse: parseWithEsprimaNext },
	}) as types.namedTypes.File;
	const tournParsed = parse(tourn, {
		parser: { parse: parseWithEsprimaNext },
	}) as types.namedTypes.File;

	const problemPaths: any[] = [];
	let same = types.astNodesAreEquivalent(tmplParsed, tournParsed, problemPaths);

	// So we sometimes wrap single value expressions when tmpl doesn't.
	// This causes our code to obviously be different to tmpl's. It's
	// actually more of a bug on tmpl's side and it's incredibly hard
	// to match exactly on our end. I think this is an acceptable difference
	// in behaviours and shouldn't cause any issues since an exception will
	// be raised either way.
	if (!same) {
		if (isWrapped(tournParsed) && !isWrapped(tmplParsed)) {
			// This is a single part expression that might be wrapped
			const tournWrapped = getWrapped(tournParsed);
			same = types.astNodesAreEquivalent(tmplParsed.program.body[1], tournWrapped);
		} else if (isMultiPartExpression(tournParsed) && isMultiPartExpression(tmplParsed)) {
			// This is a multi part expression that may be wrapped internally
			const tournExprs = getMultiPartExpression(tournParsed);
			const tmplExprs = getMultiPartExpression(tmplParsed);
			if (tournExprs.length === tmplExprs.length) {
				for (let i = 0; i < tournExprs.length; i++) {
					same = types.astNodesAreEquivalent(tmplExprs[i], tournExprs[i], problemPaths);
					if (!same) {
						break;
					}
				}
			}
		}
	}

	return !same;
};
