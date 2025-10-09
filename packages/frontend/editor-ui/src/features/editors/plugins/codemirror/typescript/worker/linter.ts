import type { Diagnostic } from '@codemirror/lint';
import type * as tsvfs from '@typescript/vfs';
import ts from 'typescript';
import type { DiagnosticWithLocation } from 'typescript';

/**
 * TypeScript has a set of diagnostic categories,
 * which maps roughly onto CodeMirror's categories.
 * Here, we do the mapping.
 */
export function tsCategoryToSeverity(
	diagnostic: Pick<ts.DiagnosticWithLocation, 'category' | 'code'>,
): Diagnostic['severity'] {
	switch (diagnostic.code) {
		case 6133:
			// No unused variables
			return 'warning';
		case 7027:
			// Unreachable code detected
			return 'warning';
		default: {
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
	}
}

/**
 * Not all TypeScript diagnostic relate to specific
 * ranges in source code: here we filter for those that
 * do.
 */
function isDiagnosticWithLocation(
	diagnostic: ts.Diagnostic,
): diagnostic is ts.DiagnosticWithLocation {
	return !!(
		diagnostic.file &&
		typeof diagnostic.start === 'number' &&
		typeof diagnostic.length === 'number'
	);
}

function isIgnoredDiagnostic(diagnostic: ts.Diagnostic) {
	switch (diagnostic.code) {
		// No implicit any
		case 7006:
		// Cannot find module or its corresponding type declarations.
		case 2307:
			return true;
	}

	return false;
}

/**
 * Get the message for a diagnostic. TypeScript
 * is kind of weird: messageText might have the message,
 * or a pointer to the message. This follows the chain
 * to get a string, regardless of which case we're in.
 */
function tsDiagnosticMessage(diagnostic: Pick<ts.Diagnostic, 'messageText'>): string {
	if (typeof diagnostic.messageText === 'string') {
		return diagnostic.messageText;
	}
	// TODO: go through linked list
	return diagnostic.messageText.messageText;
}

function tsDiagnosticClassName(diagnostic: ts.Diagnostic) {
	switch (diagnostic.code) {
		case 6133:
			// No unused variables
			return 'cm-faded';
		default:
			return undefined;
	}
}

function convertTSDiagnosticToCM(d: ts.DiagnosticWithLocation): Diagnostic {
	const start = d.start;
	const message = tsDiagnosticMessage(d);

	return {
		from: start,
		to: start + d.length,
		message,
		markClass: tsDiagnosticClassName(d),
		severity: tsCategoryToSeverity(d),
	};
}

export function getDiagnostics({
	env,
	fileName,
}: { env: tsvfs.VirtualTypeScriptEnvironment; fileName: string }) {
	const exists = env.getSourceFile(fileName);
	if (!exists) return [];

	const tsDiagnostics = [
		...env.languageService.getSemanticDiagnostics(fileName),
		...env.languageService.getSyntacticDiagnostics(fileName),
	];

	const diagnostics = tsDiagnostics.filter(
		(diagnostic): diagnostic is DiagnosticWithLocation =>
			isDiagnosticWithLocation(diagnostic) && !isIgnoredDiagnostic(diagnostic),
	);

	return diagnostics.map((d) => convertTSDiagnosticToCM(d));
}
