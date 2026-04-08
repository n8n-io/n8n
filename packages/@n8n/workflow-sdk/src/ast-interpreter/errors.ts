/**
 * Custom error types for the AST interpreter.
 * Provides detailed error messages with source code context.
 */
import type { SourceLocation } from 'estree';

/**
 * Base error class for all interpreter errors.
 * Includes optional source location for generating code frames.
 */
export class InterpreterError extends Error {
	readonly location?: SourceLocation;
	readonly sourceCode?: string;

	constructor(message: string, location?: SourceLocation, sourceCode?: string) {
		super(message);
		this.name = 'InterpreterError';
		this.location = location;
		this.sourceCode = sourceCode;

		// Append code frame to message if location is available
		if (location && sourceCode) {
			this.message = `${message}\n\n${this.generateCodeFrame()}`;
		}
	}

	/**
	 * Generate a code frame showing the error location.
	 */
	private generateCodeFrame(): string {
		if (!this.location || !this.sourceCode) return '';

		const lines = this.sourceCode.split('\n');
		const { line, column } = this.location.start;
		const lineIndex = line - 1;

		if (lineIndex < 0 || lineIndex >= lines.length) return '';

		const contextLines = 2;
		const startLine = Math.max(0, lineIndex - contextLines);
		const endLine = Math.min(lines.length - 1, lineIndex + contextLines);

		const frameLines: string[] = [];
		const gutterWidth = String(endLine + 1).length;

		for (let i = startLine; i <= endLine; i++) {
			const lineNum = String(i + 1).padStart(gutterWidth, ' ');
			const prefix = i === lineIndex ? '> ' : '  ';
			frameLines.push(`${prefix}${lineNum} | ${lines[i]}`);

			// Add error indicator line
			if (i === lineIndex) {
				const indicator = ' '.repeat(column) + '^';
				frameLines.push(`  ${' '.repeat(gutterWidth)} | ${indicator}`);
			}
		}

		return frameLines.join('\n');
	}
}

/**
 * Error thrown when the interpreter encounters a valid JavaScript
 * construct that is not part of the allowed SDK vocabulary.
 */
export class UnsupportedNodeError extends InterpreterError {
	readonly nodeType: string;

	constructor(nodeType: string, location?: SourceLocation, sourceCode?: string) {
		super(`Unsupported syntax: '${nodeType}' is not allowed in SDK code`, location, sourceCode);
		this.name = 'UnsupportedNodeError';
		this.nodeType = nodeType;
	}
}

/**
 * Error thrown when the interpreter detects potentially dangerous
 * patterns like eval(), Function(), require(), etc.
 */
export class SecurityError extends InterpreterError {
	readonly pattern: string;

	constructor(pattern: string, location?: SourceLocation, sourceCode?: string) {
		super(`Security violation: '${pattern}' is not allowed`, location, sourceCode);
		this.name = 'SecurityError';
		this.pattern = pattern;
	}
}

/**
 * Error thrown when the interpreter encounters an undefined
 * identifier that is not an allowed SDK function or declared variable.
 */
export class UnknownIdentifierError extends InterpreterError {
	readonly identifier: string;

	constructor(identifier: string, location?: SourceLocation, sourceCode?: string) {
		super(`Unknown identifier: '${identifier}' is not defined`, location, sourceCode);
		this.name = 'UnknownIdentifierError';
		this.identifier = identifier;
	}
}
