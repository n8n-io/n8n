import fs from 'node:fs';
import path from 'node:path';

// tsgo does not expose the compiler API. This import resolves to TypeScript 6.
import ts from 'typescript';
import type { Plugin } from 'vite';

type TransformSelection =
	| { entityDirectories: string[]; filePredicate?: never }
	| { entityDirectories?: never; filePredicate: (fileName: string) => boolean };

export type TscDecoratorTransformOptions = TransformSelection & {
	/** The directory that contains the package's tsconfig.json. */
	projectDir?: string;
};

/**
 * Compiles selected decorator-based classes with the TypeScript Language Service.
 * This preserves cross-file `design:type` metadata that fast transforms cannot emit.
 */
export function tscDecoratorTransform({
	projectDir = process.cwd(),
	entityDirectories,
	filePredicate,
}: TscDecoratorTransformOptions): Plugin {
	const normalizedProjectDir = path.resolve(projectDir);
	const normalizedEntityDirectories = entityDirectories?.map(
		(directory) => path.resolve(normalizedProjectDir, directory) + path.sep,
	);
	const isSelected = filePredicate
		? filePredicate
		: (fileName: string) => {
				const normalizedFileName = path.normalize(fileName);
				return (
					/\.tsx?$/.test(normalizedFileName) &&
					(normalizedEntityDirectories ?? []).some((directory) =>
						normalizedFileName.startsWith(directory),
					)
				);
			};
	let emit: ((fileName: string) => { code: string; map: string | null } | null) | undefined;

	function createEmitter() {
		const configPath = ts.findConfigFile(normalizedProjectDir, ts.sys.fileExists, 'tsconfig.json');
		if (!configPath) {
			throw new Error(`Could not find tsconfig.json in ${normalizedProjectDir}`);
		}

		const { config } = ts.readConfigFile(configPath, ts.sys.readFile);
		const parsed = ts.parseJsonConfigFileContent(config, ts.sys, normalizedProjectDir);
		const rootFiles = parsed.fileNames
			.map((fileName) => path.normalize(fileName))
			.filter(isSelected);

		const options: ts.CompilerOptions = {
			...parsed.options,
			module: ts.ModuleKind.ESNext,
			target: ts.ScriptTarget.ES2022,
			moduleResolution: ts.ModuleResolutionKind.Bundler,
			experimentalDecorators: true,
			emitDecoratorMetadata: true,
			verbatimModuleSyntax: false,
			isolatedModules: false,
			sourceMap: true,
			inlineSources: true,
			skipLibCheck: true,
			noEmit: false,
			noEmitOnError: false,
			declaration: false,
			declarationMap: false,
			composite: false,
			incremental: false,
			tsBuildInfoFile: undefined,
		};

		const versions = new Map(rootFiles.map((fileName) => [fileName, 0]));
		const contents = new Map<string, string>();

		function refresh(fileName: string): string | undefined {
			const normalizedFileName = path.normalize(fileName);
			const next = fs.existsSync(normalizedFileName)
				? fs.readFileSync(normalizedFileName, 'utf-8')
				: undefined;
			if (next !== contents.get(normalizedFileName)) {
				if (next === undefined) {
					contents.delete(normalizedFileName);
				} else {
					contents.set(normalizedFileName, next);
				}

				versions.set(normalizedFileName, (versions.get(normalizedFileName) ?? 0) + 1);
			}

			return next;
		}

		const host: ts.LanguageServiceHost = {
			getScriptFileNames: () => Array.from(versions.keys()),
			getScriptVersion: (fileName) => String(versions.get(path.normalize(fileName)) ?? 0),
			getScriptSnapshot: (fileName) => {
				const cached = contents.get(path.normalize(fileName));
				const text =
					cached ?? (fs.existsSync(fileName) ? fs.readFileSync(fileName, 'utf-8') : undefined);
				return text === undefined ? undefined : ts.ScriptSnapshot.fromString(text);
			},
			getCurrentDirectory: () => normalizedProjectDir,
			getCompilationSettings: () => options,
			getDefaultLibFileName: (compilerOptions) => ts.getDefaultLibFilePath(compilerOptions),
			fileExists: ts.sys.fileExists,
			readFile: ts.sys.readFile,
			readDirectory: ts.sys.readDirectory,
			directoryExists: ts.sys.directoryExists,
			getDirectories: ts.sys.getDirectories,
		};

		const service = ts.createLanguageService(host, ts.createDocumentRegistry());

		return (fileName: string) => {
			const normalizedFileName = path.normalize(fileName);
			if (refresh(normalizedFileName) === undefined) return null;

			const output = service.getEmitOutput(normalizedFileName);
			const js = output.outputFiles.find((file) => file.name.endsWith('.js'));
			const map = output.outputFiles.find((file) => file.name.endsWith('.js.map'));
			if (!js) return null;

			return { code: js.text, map: map?.text ?? null };
		};
	}

	return {
		name: 'tsc-decorator-transform',
		enforce: 'pre',
		transform(_code, id) {
			const fileName = path.normalize(id.split('?')[0]);
			if (!isSelected(fileName)) return null;

			emit ??= createEmitter();
			return emit(fileName);
		},
	};
}
