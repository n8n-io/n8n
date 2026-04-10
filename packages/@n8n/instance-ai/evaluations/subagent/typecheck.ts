/**
 * In-memory TypeScript type checking for eval.
 *
 * Mirrors what the production sandbox does (write file → tsc → read errors)
 * but without a real filesystem. Uses the TypeScript compiler API to check
 * agent-generated code against the @n8n/workflow-sdk type declarations.
 */

import * as fs from 'fs';
import * as path from 'path';
import * as ts from 'typescript';

// ---------------------------------------------------------------------------
// Resolve SDK declaration root once
// ---------------------------------------------------------------------------

const SDK_DIST = path.resolve(__dirname, '../../../workflow-sdk/dist');

/**
 * Type-check SDK code in memory, returning diagnostic messages.
 * Returns an empty array if the code is type-clean.
 */
export function typeCheckSDKCode(code: string): string[] {
	if (!fs.existsSync(path.join(SDK_DIST, 'index.d.ts'))) {
		// SDK not built — skip gracefully
		return [];
	}

	const virtualFileName = '/eval/workflow.ts';

	// Use the real compiler host as base, override only what we need
	const options: ts.CompilerOptions = {
		target: ts.ScriptTarget.ES2022,
		module: ts.ModuleKind.ES2022,
		moduleResolution: ts.ModuleResolutionKind.Node10,
		strict: true,
		strictNullChecks: false, // Match production sandbox — SDK optional methods are always present at runtime
		noEmit: true,
		skipLibCheck: true,
	};

	const realHost = ts.createCompilerHost(options);

	const host: ts.CompilerHost = {
		...realHost,

		getSourceFile(fileName, languageVersion, onError, shouldCreate) {
			if (fileName === virtualFileName) {
				return ts.createSourceFile(fileName, code, languageVersion);
			}
			return realHost.getSourceFile(fileName, languageVersion, onError, shouldCreate);
		},

		fileExists(fileName) {
			if (fileName === virtualFileName) return true;
			return realHost.fileExists(fileName);
		},

		readFile(fileName) {
			if (fileName === virtualFileName) return code;
			return realHost.readFile(fileName);
		},

		resolveModuleNameLiterals(
			moduleLiterals,
			containingFile,
			_redirectedReference,
			compilerOptions,
			_containingSourceFile,
			_reusedNames,
		) {
			return moduleLiterals.map((literal) => {
				const name = literal.text;
				if (name === '@n8n/workflow-sdk') {
					const indexDts = path.join(SDK_DIST, 'index.d.ts');
					return {
						resolvedModule: {
							resolvedFileName: indexDts,
							isExternalLibraryImport: true,
							extension: ts.Extension.Dts,
						},
					} satisfies ts.ResolvedModuleWithFailedLookupLocations;
				}
				// Fall back to default resolution for other modules
				return ts.resolveModuleName(name, containingFile, compilerOptions, realHost);
			});
		},
	};

	const program = ts.createProgram([virtualFileName], options, host);

	const diagnostics = ts
		.getPreEmitDiagnostics(program)
		.filter((d) => d.file?.fileName === virtualFileName);

	return diagnostics.map((d) => {
		const message = ts.flattenDiagnosticMessageText(d.messageText, '\n');
		if (d.file && d.start !== undefined) {
			const { line } = d.file.getLineAndCharacterOfPosition(d.start);
			return `Line ${String(line + 1)}: ${message}`;
		}
		return message;
	});
}
