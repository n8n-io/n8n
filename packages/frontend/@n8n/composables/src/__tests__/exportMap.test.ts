import { readdirSync, readFileSync } from 'node:fs';
import { join, relative, sep } from 'node:path';

/**
 * The export map must list every entry point explicitly and nothing else.
 *
 * A `./*` pattern is not equivalent: Node subpath patterns are greedy (`*` spans
 * `/`), so a wildcard publishes every file tsdown emits under `dist/` — including
 * the shared chunks it hoists out of multiple entries. Those chunks export only
 * mangled aliases, and the aliases disagree between runtime and declarations
 * (the same letter was `setTelemetry` in one and `TelemetryKey` in the other),
 * so a wildcard hands consumers a type-unsound public surface nobody meant to
 * ship. Enumerating costs one manifest edit per new module; this test is what
 * makes that edit impossible to forget.
 */
describe('export map', () => {
	// `process.cwd()` rather than `import.meta.url`: the jsdom environment does
	// not give test modules a `file:` URL. Vitest runs with the package as cwd.
	const packageRoot = process.cwd();

	// `JSON.parse` in a try/catch rather than `jsonParse` from `n8n-workflow` as
	// its neighbour in `packageBoundary.test.ts` does — both satisfy
	// `no-uncaught-json-parse`, and this guard exists to fail fast for whoever
	// adds the next composable, so it must run without the backend chain built.
	const manifest = ((): { exports: Record<string, Record<string, string>> } => {
		const raw = readFileSync(join(packageRoot, 'package.json'), 'utf8');
		try {
			return JSON.parse(raw) as { exports: Record<string, Record<string, string>> };
		} catch (error) {
			throw new Error(`package.json is not valid JSON: ${(error as Error).message}`);
		}
	})();

	/**
	 * The entry points tsdown builds, derived from the same globs as
	 * `tsdown.config.ts` — keep the two in step.
	 */
	const entryPoints = (() => {
		const srcDir = join(packageRoot, 'src');

		const walk = (dir: string): string[] =>
			readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
				const path = join(dir, entry.name);
				return entry.isDirectory() ? walk(path) : [path];
			});

		return walk(srcDir)
			.map((file) => relative(srcDir, file).split(sep).join('/'))
			.filter(
				(file) =>
					file.endsWith('.ts') &&
					!file.endsWith('.test.ts') &&
					!file.endsWith('.d.ts') &&
					!file.startsWith('__tests__/'),
			)
			.map((file) => file.replace(/\.ts$/, ''))
			.sort();
	})();

	it('has an entry point to check', () => {
		expect(entryPoints.length).toBeGreaterThan(0);
	});

	it('exports exactly the built entry points', () => {
		// Failure here names the fix: a listed-but-absent key is a stale entry to
		// delete, a missing one is a new module to add to `exports`.
		expect(Object.keys(manifest.exports).sort()).toEqual(entryPoints.map((e) => `./${e}`));
	});

	it('declares no subpath pattern', () => {
		// The regression guard: a `*` anywhere re-publishes the hoisted chunks.
		expect(Object.keys(manifest.exports).filter((key) => key.includes('*'))).toEqual([]);
	});

	it('points every subpath at its own emitted files', () => {
		// Catches a copy-paste target, which set equality above cannot see.
		const expected = Object.fromEntries(
			entryPoints.map((entry) => [
				`./${entry}`,
				{
					types: `./dist/${entry}.d.mts`,
					import: `./dist/${entry}.mjs`,
					require: `./dist/${entry}.cjs`,
				},
			]),
		);

		expect(manifest.exports).toEqual(expected);
	});
});
