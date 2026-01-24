/**
 * TypeScript compiler integration for code-level type checking.
 *
 * This module wraps generated TypeScript SDK code and runs the TypeScript
 * compiler to detect type errors before code execution.
 */

import * as ts from 'typescript';

import type { CodeViolation, CodeViolationName } from './violations';

export interface TypeCheckResult {
	violations: CodeViolation[];
	score: number;
}

/**
 * Type-check generated TypeScript code against SDK types.
 * Creates an in-memory TypeScript program to analyze the code.
 */
export function typeCheckCode(code: string): TypeCheckResult {
	// Wrap code in a function with SDK imports to make it valid TypeScript
	const wrappedCode = `
import {
  workflow, node, trigger, sticky, placeholder, newCredential,
  languageModel, memory, tool, outputParser, embedding, vectorStore,
  retriever, documentLoader, textSplitter, merge, ifElse, switchCase,
  splitInBatches, fanOut
} from '@n8n/workflow-sdk';

export default function createWorkflow() {
  ${code}
}
`;

	const violations: CodeViolation[] = [];
	const fileName = 'generated-workflow.ts';

	// Compiler options for strict type checking
	const compilerOptions: ts.CompilerOptions = {
		target: ts.ScriptTarget.ES2020,
		module: ts.ModuleKind.ESNext,
		moduleResolution: ts.ModuleResolutionKind.NodeNext,
		strict: true,
		skipLibCheck: true,
		noEmit: true,
		esModuleInterop: true,
	};

	// Create a simple in-memory compiler host
	const sourceFile = ts.createSourceFile(fileName, wrappedCode, ts.ScriptTarget.ES2020, true);

	const host: ts.CompilerHost = {
		getSourceFile: (name) => (name === fileName ? sourceFile : undefined),
		getDefaultLibFileName: () => 'lib.d.ts',
		writeFile: () => {},
		getCurrentDirectory: () => '/',
		getCanonicalFileName: (f) => f,
		useCaseSensitiveFileNames: () => true,
		getNewLine: () => '\n',
		fileExists: (name) => name === fileName,
		readFile: () => undefined,
	};

	// Create program and get diagnostics
	const program = ts.createProgram([fileName], compilerOptions, host);
	const diagnostics = [...program.getSyntacticDiagnostics(), ...program.getSemanticDiagnostics()];

	// Convert diagnostics to violations
	for (const diagnostic of diagnostics) {
		// Skip diagnostics about missing modules (we're not resolving real imports)
		const messageText = ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n');
		if (
			messageText.includes("Cannot find module '@n8n/workflow-sdk'") ||
			messageText.includes('Could not find a declaration file')
		) {
			continue;
		}

		const severity = mapDiagnosticCategory(diagnostic.category);

		let lineNumber: number | undefined;
		let column: number | undefined;

		if (diagnostic.file && diagnostic.start !== undefined) {
			const { line, character } = diagnostic.file.getLineAndCharacterOfPosition(diagnostic.start);
			// Adjust for wrapper code offset (approximately 10 lines of imports/wrapper)
			lineNumber = Math.max(1, line - 9);
			column = character + 1;
		}

		violations.push({
			name: mapDiagnosticToViolationName(diagnostic.code),
			type: severity,
			description: messageText,
			lineNumber,
			column,
			pointsDeducted: severity === 'critical' ? 0.3 : severity === 'major' ? 0.15 : 0.05,
		});
	}

	// Calculate score
	const totalDeductions = violations.reduce((sum, v) => sum + v.pointsDeducted, 0);
	const score = Math.max(0, 1 - totalDeductions);

	return { violations, score };
}

function mapDiagnosticCategory(category: ts.DiagnosticCategory): 'critical' | 'major' | 'minor' {
	switch (category) {
		case ts.DiagnosticCategory.Error:
			return 'critical';
		case ts.DiagnosticCategory.Warning:
			return 'major';
		default:
			return 'minor';
	}
}

function mapDiagnosticToViolationName(code: number): CodeViolationName {
	// Map common TS error codes to violation names
	// TS2304: Cannot find name 'X'
	if (code === 2304) return 'undefined-identifier';
	// TS2345: Argument of type 'X' is not assignable to parameter of type 'Y'
	if (code === 2345) return 'incompatible-type';
	// TS2339: Property 'X' does not exist on type 'Y'
	if (code === 2339) return 'unknown-property';
	// TS2554: Expected X arguments, but got Y
	if (code === 2554) return 'missing-required-parameter';
	// TS2322: Type 'X' is not assignable to type 'Y'
	if (code === 2322) return 'incompatible-type';
	// Syntax errors (1xxx range)
	if (code >= 1000 && code < 2000) return 'syntax-error';

	return 'type-error';
}
