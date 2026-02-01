import { mock, mockDeep } from 'vitest-mock-extended';
import type * as tsvfs from '@typescript/vfs';
import ts from 'typescript';
import { getDiagnostics, tsCategoryToSeverity } from './linter';

describe('linter > getDiagnostics', () => {
	it('should return diagnostics for a given file', () => {
		const env = mockDeep<tsvfs.VirtualTypeScriptEnvironment>();
		const fileName = 'testFile.ts';

		const semanticDiagnostics = [
			mock<ts.DiagnosticWithLocation>({
				file: { fileName },
				start: 0,
				length: 10,
				messageText: 'Semantic error',
				category: ts.DiagnosticCategory.Error,
				code: 1234,
			}),
		];

		const syntacticDiagnostics = [
			mock<ts.DiagnosticWithLocation>({
				file: { fileName },
				start: 15,
				length: 5,
				messageText: 'Syntactic warning',
				category: ts.DiagnosticCategory.Warning,
				code: 5678,
			}),
		];

		env.languageService.getSemanticDiagnostics.mockReturnValue(semanticDiagnostics);
		env.languageService.getSyntacticDiagnostics.mockReturnValue(syntacticDiagnostics);
		env.getSourceFile.mockReturnValue({ fileName } as ts.SourceFile);

		const result = getDiagnostics({ env, fileName });

		expect(result).toHaveLength(2);
		expect(result[0].message).toBe('Semantic error');
		expect(result[0].severity).toBe('error');
		expect(result[1].message).toBe('Syntactic warning');
		expect(result[1].severity).toBe('warning');
	});

	it('should filter out ignored diagnostics', () => {
		const env = mockDeep<tsvfs.VirtualTypeScriptEnvironment>();
		const fileName = 'testFile.ts';

		const diagnostics = [
			mock<ts.DiagnosticWithLocation>({
				file: { fileName },
				start: 0,
				length: 10,
				messageText: 'No implicit any',
				category: ts.DiagnosticCategory.Error,
				code: 7006,
			}),
			mock<ts.DiagnosticWithLocation>({
				file: { fileName },
				start: 0,
				length: 10,
				messageText: 'Cannot find module or its corresponding type declarations.',
				category: ts.DiagnosticCategory.Error,
				code: 2307,
			}),
			mock<ts.DiagnosticWithLocation>({
				file: { fileName },
				start: 0,
				length: 10,
				messageText: 'Not ignored error',
				category: ts.DiagnosticCategory.Error,
				code: 1234,
			}),
		];

		env.languageService.getSemanticDiagnostics.mockReturnValue(diagnostics);
		env.languageService.getSyntacticDiagnostics.mockReturnValue([]);
		env.getSourceFile.mockReturnValue({ fileName } as ts.SourceFile);

		const result = getDiagnostics({ env, fileName });

		expect(result).toHaveLength(1);
		expect(result[0].message).toBe('Not ignored error');
	});

	it('should map diagnostic categories to severities correctly', () => {
		const diagnostic = mock<ts.DiagnosticWithLocation>({
			category: ts.DiagnosticCategory.Error,
			code: 1234,
		});

		const severity = tsCategoryToSeverity(diagnostic);
		expect(severity).toBe('error');
	});
});
