import type { Program } from 'acorn';
import { parse } from 'acorn';
import { simple } from 'acorn-walk';
import type { Result } from 'n8n-workflow';
import { toResult } from 'n8n-workflow';

import { BuiltInsParserState } from './built-ins-parser-state';

/**
 * Class for parsing Code Node code to identify which built-in variables
 * are accessed
 */
export class BuiltInsParser {
	/**
	 * Parses which built-in variables are accessed in the given code
	 */
	public parseUsedBuiltIns(code: string): Result<BuiltInsParserState, Error> {
		return toResult(() => {
			const wrappedCode = `async function VmCodeWrapper() { ${code} }`;
			const ast = parse(wrappedCode, { ecmaVersion: 2025, sourceType: 'module' });

			return this.identifyBuiltInsByWalkingAst(ast);
		});
	}

	private identifyBuiltInsByWalkingAst(ast: Program) {
		const accessedBuiltIns = new BuiltInsParserState();

		simple(ast, {
			CallExpression(node) {
				// $(...)
				const isDollar = node.callee.type === 'Identifier' && node.callee.name === '$';
				if (!isDollar) return;

				// $(): This is not valid, ignore
				if (node.arguments.length === 0) {
					return;
				}

				const firstArg = node.arguments[0];
				if (firstArg.type === 'Literal') {
					if (typeof firstArg.value === 'string') {
						// $("nodeName"): Static value, mark 'nodeName' as needed
						accessedBuiltIns.markNodeAsNeeded(firstArg.value);
					} else {
						// $(123): Static value, but not a string --> invalid code --> ignore
					}
				} else {
					// $(variable): Can't determine statically, mark all nodes as needed
					accessedBuiltIns.markNeedsAllNodes();
				}

				// TODO: We could determine if $('node') is followed by a function call (e.g.
				// first()) or a property (e.g. isExecuted) and only get the one accessed
			},

			Identifier(node) {
				if (node.name === '$env') {
					accessedBuiltIns.markEnvAsNeeded();
				} else if (node.name === '$input' || node.name === '$json') {
					accessedBuiltIns.markInputAsNeeded();
				} else if (node.name === '$execution') {
					accessedBuiltIns.markExecutionAsNeeded();
				} else if (node.name === '$prevNode') {
					accessedBuiltIns.markPrevNodeAsNeeded();
				}
			},
		});

		return accessedBuiltIns;
	}
}
