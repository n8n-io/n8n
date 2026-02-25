/**
 * Acorn parser wrapper for SDK code.
 * Parses JavaScript code into an ESTree-compliant AST.
 */
import * as acorn from 'acorn';
import type { Program } from 'estree';

import { InterpreterError } from './errors';

/**
 * Parse SDK code into an AST.
 *
 * The SDK code uses `export default` to return the workflow builder result.
 * We parse as a module to support this syntax.
 *
 * @param code - The JavaScript code to parse
 * @returns An ESTree-compliant Program AST
 * @throws InterpreterError if the code has syntax errors
 */
export function parseSDKCode(code: string): Program {
	try {
		// Acorn's AST is compatible with ESTree, but TypeScript doesn't know that
		return acorn.parse(code, {
			ecmaVersion: 'latest',
			sourceType: 'module',
			locations: true, // Include line/column info for error messages
		}) as unknown as Program;
	} catch (error) {
		if (error instanceof SyntaxError) {
			// Extract location from Acorn's error message
			const match = (error as { loc?: { line: number; column: number } }).loc;
			const location = match
				? {
						start: { line: match.line, column: match.column },
						end: { line: match.line, column: match.column + 1 },
					}
				: undefined;

			throw new InterpreterError(`Syntax error: ${error.message}`, location, code);
		}
		throw error;
	}
}
