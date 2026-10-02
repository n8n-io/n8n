// The tsserver plugin factory. `index.ts` exports it as the module, as tsserver requires.
import path from 'node:path';
import type ts from 'typescript';

import { expressionDiagnostics, expressionSpans, itemScope } from './expression-check';
import { shadowOf } from '../check';

/**
 * A host over the project's files, with the shadow text in place of each file that has one. It
 * lists its methods: the project host has more (e.g. `setCompilerHost`) that a second language
 * service must not call.
 */
function shadowHostOf(
	host: ts.LanguageServiceHost,
	shadows: ReadonlyMap<string, { text: string; version: number }>,
	typescript: typeof ts,
): ts.LanguageServiceHost {
	return {
		getCompilationSettings: () => host.getCompilationSettings(),
		getScriptFileNames: () => host.getScriptFileNames(),
		getScriptVersion: (fileName) => {
			const shadow = shadows.get(fileName);
			const version = host.getScriptVersion(fileName);
			return shadow ? `${version}:n8n-expression:${shadow.version}` : version;
		},
		getScriptSnapshot: (fileName) => {
			const shadow = shadows.get(fileName);
			return shadow
				? typescript.ScriptSnapshot.fromString(shadow.text)
				: host.getScriptSnapshot(fileName);
		},
		getCurrentDirectory: () => host.getCurrentDirectory(),
		getDefaultLibFileName: (options) => host.getDefaultLibFileName(options),
		fileExists: (fileName) => host.fileExists(fileName),
		readFile: (fileName, encoding) => host.readFile(fileName, encoding),
		directoryExists: (name) => host.directoryExists?.(name) ?? typescript.sys.directoryExists(name),
		getDirectories: (name) => host.getDirectories?.(name) ?? typescript.sys.getDirectories(name),
		realpath: (name) => host.realpath?.(name) ?? name,
		useCaseSensitiveFileNames: () => host.useCaseSensitiveFileNames?.() ?? true,
	};
}

export function expressionPlugin({ typescript }: { typescript: typeof ts }) {
	const create = (info: ts.server.PluginCreateInfo): ts.LanguageService => {
		const ls = info.languageService;
		const log = (message: string) =>
			info.project.projectService.logger.info(`[n8n-expression] ${message}`);
		// The compiled plugin sits in dist/plugin, next to the package's type entry.
		const scope = itemScope(path.join(__dirname, '..', 'index.js'));
		const shadows = new Map<string, { text: string; version: number }>();
		const shadowLs = typescript.createLanguageService(
			shadowHostOf(info.languageServiceHost, shadows, typescript),
			typescript.createDocumentRegistry(),
		);

		const getSemanticDiagnostics = (fileName: string): ts.Diagnostic[] => {
			const prior = ls.getSemanticDiagnostics(fileName);
			const program = ls.getProgram();
			const source = program?.getSourceFile(fileName);
			if (!program || !source) return prior;
			try {
				const spans = expressionSpans(typescript, source, program.getTypeChecker());
				if (spans.length === 0) return prior;
				const shadow = shadowOf(source.text, spans, scope);
				const last = shadows.get(fileName);
				if (last?.text !== shadow.text) {
					shadows.set(fileName, { text: shadow.text, version: (last?.version ?? 0) + 1 });
				}
				const found = [
					...shadowLs.getSyntacticDiagnostics(fileName),
					...shadowLs.getSemanticDiagnostics(fileName),
				];
				const shadowSource = shadowLs.getProgram()?.getSourceFile(fileName);
				if (!shadowSource) return prior;
				return [
					...prior,
					...expressionDiagnostics(typescript, source, shadow, shadowSource, found),
				];
			} catch (error) {
				log(`check failed: ${error instanceof Error ? error.message : String(error)}`);
				return prior;
			}
		};

		log(`active for ${info.project.getCurrentDirectory()}`);
		return { ...ls, getSemanticDiagnostics };
	};
	return { create };
}
