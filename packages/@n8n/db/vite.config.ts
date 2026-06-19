import { createVitestConfigWithDecorators } from '@n8n/vitest-config/node-decorators';
import fs from 'node:fs';
import path from 'node:path';
import ts from 'typescript';
import { mergeConfig, type Plugin } from 'vite';
import { configDefaults } from 'vitest/config';

/**
 * Vite plugin that transpiles this package's TypeORM entity files (`src/entities/**`)
 * through the real TypeScript compiler (a full `ts.LanguageService`, not single-file
 * `transpileModule`). Every other source file is left to Vite's fast oxc transform.
 *
 * TypeORM entities rely on `emitDecoratorMetadata` to derive column types from the
 * reflected `design:type`. For a string-literal union column (e.g.
 * `providerType: AuthProviderType`, where the alias is imported from another file),
 * only `tsc` with cross-file type information collapses the union to `String`. Vite's
 * oxc transform — and SWC — emit `Object` instead, which TypeORM rejects at
 * `DataSource.initialize()`. Single-file `transpileModule` also emits `Object` because
 * it can't resolve the imported alias. A full Program is required, which mirrors the
 * old jest config that set `isolatedModules: false` for exactly this reason.
 *
 * Scoping to `src/entities/**` keeps the cost contained: only the ~50 entity files pay
 * the tsc price (and the Program is rooted there), while DI `@Service` constructor
 * metadata — which oxc emits correctly — keeps the fast path for the rest of `src`.
 */
function tscDecoratorTransform(): Plugin {
	const projectDir = __dirname;
	const entitiesDir = path.resolve(projectDir, 'src', 'entities') + path.sep;
	let emit: ((fileName: string) => { code: string; map: unknown } | null) | undefined;

	function createEmitter() {
		const configPath = ts.findConfigFile(projectDir, ts.sys.fileExists, 'tsconfig.json');
		if (!configPath) {
			throw new Error('Could not find tsconfig.json for @n8n/db');
		}

		const { config } = ts.readConfigFile(configPath, ts.sys.readFile);
		const parsed = ts.parseJsonConfigFileContent(config, ts.sys, projectDir);
		// Root the Program at the entity files only; their imported types (e.g. the union
		// aliases in `types-db.ts`, related entities) are still resolved on demand via the
		// host's snapshot reads, so cross-file metadata stays correct.
		const rootFiles = parsed.fileNames.filter((f) => path.normalize(f).startsWith(entitiesDir));

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

		// Re-read `fileName` from disk and, if its content changed since the last read,
		// bump the script version so the LanguageService invalidates its cached emit.
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
			// Pick up on-disk edits (watch mode) by bumping the script version when the
			// content changes; otherwise the LanguageService reuses a stale cached emit.
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
		name: 'tsc-decorator-transform',
		enforce: 'pre',
		transform(_code, id) {
			const file = id.split('?')[0];
			if (!file.startsWith(entitiesDir) || !/\.tsx?$/.test(file)) return null;
			emit ??= createEmitter();
			const result = emit(file);
			return result ? { code: result.code, map: result.map as never } : null;
		},
	};
}

export default mergeConfig(
	createVitestConfigWithDecorators({
		// The n8n root jest.config sets `restoreMocks: true`, and most test files silently
		// rely on it — omit this and mocks bleed between tests.
		restoreMocks: true,
	}),
	{
		plugins: [tscDecoratorTransform()],
		test: {
			// Vitest 4's default exclude is only node_modules/.git — it does NOT cover dist.
			// Without this, compiled test files left in dist (tsc never deletes orphaned
			// output) get collected and fail (CJS `require('vitest')`). The build also
			// excludes test files now, but this guards against pre-existing stale artifacts.
			exclude: [...configDefaults.exclude, '**/dist/**'],
		},
	},
);
