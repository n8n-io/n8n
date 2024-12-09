import type { Schema } from '@/Interface';
import type { Diagnostic } from '@codemirror/lint';
import { type CodeExecutionMode } from 'n8n-workflow';
import ts from 'typescript';

export const fnPrefix = (returnType: string) => `(
/**
 * @returns {${returnType}}
*/
() => {\n`;

export function wrapInFunction(script: string, mode: CodeExecutionMode): string {
	return `${fnPrefix(returnTypeForMode(mode))}${script}\n})()`;
}

export function cmPosToTs(pos: number, prefix: string) {
	return pos + prefix.length;
}

export function tsPosToCm(pos: number, prefix: string) {
	return pos - prefix.length;
}

/**
 * TypeScript has a set of diagnostic categories,
 * which maps roughly onto CodeMirror's categories.
 * Here, we do the mapping.
 */
export function tsCategoryToSeverity(
	diagnostic: Pick<ts.DiagnosticWithLocation, 'category' | 'code'>,
): Diagnostic['severity'] {
	if (diagnostic.code === 7027) {
		// Unreachable code detected
		return 'warning';
	}
	switch (diagnostic.category) {
		case ts.DiagnosticCategory.Error:
			return 'error';
		case ts.DiagnosticCategory.Message:
			return 'info';
		case ts.DiagnosticCategory.Warning:
			return 'warning';
		case ts.DiagnosticCategory.Suggestion:
			return 'info';
	}
}

/**
 * Not all TypeScript diagnostic relate to specific
 * ranges in source code: here we filter for those that
 * do.
 */
export function isDiagnosticWithLocation(
	diagnostic: ts.Diagnostic,
): diagnostic is ts.DiagnosticWithLocation {
	return !!(
		diagnostic.file &&
		typeof diagnostic.start === 'number' &&
		typeof diagnostic.length === 'number'
	);
}

/**
 * Get the message for a diagnostic. TypeScript
 * is kind of weird: messageText might have the message,
 * or a pointer to the message. This follows the chain
 * to get a string, regardless of which case we're in.
 */
export function tsDiagnosticMessage(diagnostic: Pick<ts.Diagnostic, 'messageText'>): string {
	if (typeof diagnostic.messageText === 'string') {
		return diagnostic.messageText;
	}
	// TODO: go through linked list
	return diagnostic.messageText.messageText;
}

export function convertTSDiagnosticToCM(d: ts.DiagnosticWithLocation, prefix: string): Diagnostic {
	const start = tsPosToCm(d.start, prefix);
	const message = tsDiagnosticMessage(d);

	return {
		from: start,
		to: start + d.length,
		message,
		severity: tsCategoryToSeverity(d),
	};
}

function processSchema(schema: Schema): string {
	switch (schema.type) {
		case 'string':
		case 'number':
		case 'boolean':
		case 'bigint':
		case 'symbol':
		case 'null':
		case 'undefined':
			return schema.type;

		case 'function':
			return 'Function';

		case 'array':
			if (Array.isArray(schema.value)) {
				// Handle tuple type if array has different types
				if (schema.value.length > 0) {
					return `Array<${schema.value[0].type}>`;
				}
				return '[]';
			}
			return `${schema.value}[]`;

		case 'object':
			if (!Array.isArray(schema.value)) {
				return '{}';
			}

			const properties = schema.value
				.map((prop) => {
					const key = prop.key ?? 'unknown';
					const type = processSchema(prop);
					return `  ${key}: ${type};`;
				})
				.join('\n');

			return `{\n${properties}\n}`;

		default:
			return 'any';
	}
}

export function schemaToTypescriptTypes(schema: Schema, interfaceName: string): string {
	return `interface ${interfaceName} ${processSchema(schema)}`;
}

export function returnTypeForMode(mode: CodeExecutionMode): string {
	const returnItem = '{ json: { [key: string]: unknown } } | { [key: string]: unknown }';
	if (mode === 'runOnceForAllItems') {
		return `Promise<Array<${returnItem}>> | Array<${returnItem}>`;
	}

	return `Promise<${returnItem}> | ${returnItem}`;
}
