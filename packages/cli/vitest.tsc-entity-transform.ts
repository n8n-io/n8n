import fs from 'node:fs';
import path from 'node:path';
import ts from 'typescript';
import type { Plugin } from 'vite';

/**
 * Vite plugin that transpiles this package's TypeORM entity files (`*.entity.ts`)
 * through the real TypeScript compiler (a full `ts.LanguageService`, not single-file
 * `transpileModule`). Every other source file is left to Vite's fast oxc transform.
 *
 * TypeORM entities rely on `emitDecoratorMetadata` to derive column types from the
 * reflected `design:type`. For a string-literal union column, only `tsc` with
 * cross-file type information collapses the union to `String` — Vite's oxc transform
 * (and SWC) emit `Object`, which TypeORM rejects at `DataSource.initialize()`. oxc
 * additionally emits a runtime value reference for the type-only `Relation<T>` typeorm
 * export, so an entity importing `type Relation` fails to load at all (`@n8n/typeorm
 * does not provide an export named 'Relation'`). A full `tsc` Program fixes both.
 *
 * This mirrors `packages/@n8n/db/vite.config.ts`. cli's entities are not under a single
 * directory, so the plugin keys off the `*.entity.ts` suffix and roots the Program at
 * those files; the rest of `src` keeps the fast oxc path.
 */
export function tscEntityTransform(): Plugin {
	// Tests always run with cwd = the package dir (per package.json scripts / CI
	// `working-directory`). Deriving from `__dirname` is unreliable here because the
	// plugin module may be loaded as ESM by Vitest's config loader.
	const projectDir = process.cwd();
	// TypeORM entities and `@Config` classes both rely on `emitDecoratorMetadata`
	// (`design:type`) that oxc gets wrong for cross-file union/zod-inferred types.
	const isEntity = (file: string) => /\.(entity|config)\.ts$/.test(file);
	let emit: ((fileName: string) => { code: string; map: unknown } | null) | undefined;

	function createEmitter() {
		const configPath = ts.findConfigFile(projectDir, ts.sys.fileExists, 'tsconfig.json');
		if (!configPath) {
			throw new Error('Could not find tsconfig.json for cli');
		}

		const { config } = ts.readConfigFile(configPath, ts.sys.readFile);
		const parsed = ts.parseJsonConfigFileContent(config, ts.sys, projectDir);
		const rootFiles = parsed.fileNames.filter((f) => isEntity(path.normalize(f)));

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

		const versions = new Map<string, number>();
		const contents = new Map<string, string>();
		for (const f of rootFiles) {
			versions.set(path.normalize(f), 0);
		}

		function refresh(fileName: string): string | undefined {
			const norm = path.normalize(fileName);
			const next = fs.existsSync(norm) ? fs.readFileSync(norm, 'utf-8') : undefined;
			if (next !== contents.get(norm)) {
				if (next === undefined) {
					contents.delete(norm);
				} else {
					contents.set(norm, next);
				}

				versions.set(norm, (versions.get(norm) ?? 0) + 1);
			}
			return next;
		}

		const host: ts.LanguageServiceHost = {
			getScriptFileNames: () => Array.from(versions.keys()),
			getScriptVersion: (f) => String(versions.get(path.normalize(f)) ?? 0),
			getScriptSnapshot: (f) => {
				const cached = contents.get(path.normalize(f));
				const text = cached ?? (fs.existsSync(f) ? fs.readFileSync(f, 'utf-8') : undefined);
				return text === undefined ? undefined : ts.ScriptSnapshot.fromString(text);
			},
			getCurrentDirectory: () => projectDir,
			getCompilationSettings: () => options,
			getDefaultLibFileName: (o) => ts.getDefaultLibFilePath(o),
			fileExists: ts.sys.fileExists,
			readFile: ts.sys.readFile,
			readDirectory: ts.sys.readDirectory,
			directoryExists: ts.sys.directoryExists,
			getDirectories: ts.sys.getDirectories,
		};

		const service = ts.createLanguageService(host, ts.createDocumentRegistry());

		return (fileName: string) => {
			const norm = path.normalize(fileName);
			if (refresh(norm) === undefined) {
				return null;
			}

			const output = service.getEmitOutput(norm);
			const js = output.outputFiles.find((f) => f.name.endsWith('.js'));
			const map = output.outputFiles.find((f) => f.name.endsWith('.js.map'));
			if (!js) {
				return null;
			}

			return { code: js.text, map: map ? (JSON.parse(map.text) as unknown) : null };
		};
	}

	return {
		name: 'tsc-entity-transform',
		enforce: 'pre',
		transform(_code, id) {
			const file = path.normalize(id.split('?')[0]);
			if (!isEntity(file)) return null;
			emit ??= createEmitter();
			const result = emit(file);
			return result ? { code: result.code, map: result.map as never } : null;
		},
	};
}
