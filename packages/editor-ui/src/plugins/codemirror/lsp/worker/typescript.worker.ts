import ts, { type DiagnosticWithLocation } from 'typescript';
import * as tsvfs from '@typescript/vfs';
import * as Comlink from 'comlink';
import type { LanguageServiceWorker } from '../types';
import { indexedDbCache } from './cache';
import { isDiagnosticWithLocation, convertTSDiagnosticToCM } from '../utils';
import type { Completion } from '@codemirror/autocomplete';

const FILE_NAME = 'index.ts';

const worker = (): LanguageServiceWorker => {
	let env: tsvfs.VirtualTypeScriptEnvironment;

	return {
		async init(content: string) {
			const compilerOptions = {
				allowJs: true,
				checkJs: true,
				lib: ['ES2022'],
				types: ['types.d.ts'],
			};

			const fsMap = await tsvfs.createDefaultMapFromCDN(
				compilerOptions,
				ts.version,
				true,
				ts,
				undefined,
				undefined,
				await indexedDbCache('typescript-cache', 'fs-map'),
			);
			fsMap.set(
				'types.d.ts',
				`declare global {
				myVar: number;

  interface String {
    trimSlashes(this: string): string;
  }
}
export {}`,
			);

			const system = tsvfs.createSystem(fsMap);
			env = tsvfs.createVirtualTypeScriptEnvironment(system, [], ts, compilerOptions);
			env.createFile(FILE_NAME, content);
		},
		updateFile(content) {
			const exists = env.getSourceFile(FILE_NAME);
			if (exists) {
				env.updateFile(FILE_NAME, content);
			} else {
				env.createFile(FILE_NAME, content);
			}
		},
		getCompletionsAtPos(pos) {
			const completionInfo = env.languageService.getCompletionsAtPosition(FILE_NAME, pos, {}, {});

			console.log(completionInfo);
			if (!completionInfo) return null;

			const options = completionInfo.entries.map((entry): Completion => {
				const boost = -Number(entry.sortText) || 0;
				return {
					label: entry.name,
					boost,
				};
			});

			return {
				from: pos,
				options,
			};
		},
		getDiagnostics() {
			const exists = env.getSourceFile(FILE_NAME);
			if (!exists) return [];

			const tsDiagnostics = [
				...env.languageService.getSemanticDiagnostics(FILE_NAME),
				...env.languageService.getSyntacticDiagnostics(FILE_NAME),
			];

			const diagnostics = tsDiagnostics.filter((diagnostic): diagnostic is DiagnosticWithLocation =>
				isDiagnosticWithLocation(diagnostic),
			);

			return diagnostics.map(convertTSDiagnosticToCM);
		},
		getHoverTooltip(pos) {
			const quickInfo = env.languageService.getQuickInfoAtPosition(FILE_NAME, pos);
			if (!quickInfo) return null;

			const start = quickInfo.textSpan.start;

			const typeDef =
				env.languageService.getTypeDefinitionAtPosition(FILE_NAME, pos) ??
				env.languageService.getDefinitionAtPosition(FILE_NAME, pos);

			return {
				start,
				end: start + quickInfo.textSpan.length,
				typeDef,
				quickInfo,
			};
		},
	};
};

Comlink.expose(worker());
