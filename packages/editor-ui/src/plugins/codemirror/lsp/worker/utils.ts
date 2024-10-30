import type { Diagnostic } from '@codemirror/lint';
import ts from 'typescript';

export const FILE_NAME = 'index.js';
const FN_PREFIX = '(() => {\n';

export function wrapInFunction(script: string): string {
	return `${FN_PREFIX}${script}\n})()`;
}

export function cmPosToTs(pos: number) {
	return pos + FN_PREFIX.length;
}

export function tsPosToCm(pos: number) {
	return pos - FN_PREFIX.length;
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

/**
 * TypeScript and CodeMirror have slightly different
 * ways of representing diagnostics. This converts
 * from one to the other.
 */
export function convertTSDiagnosticToCM(d: ts.DiagnosticWithLocation): Diagnostic {
	// We add some code at the end of the document, but we can't have a
	// diagnostic in an invalid range
	const start = tsPosToCm(d.start);
	const message = tsDiagnosticMessage(d);

	return {
		from: start,
		to: start + d.length,
		message,
		severity: tsCategoryToSeverity(d),
	};
}
