// @vitest-environment node
// Manifest assertions, not DOM ones — and jsdom rewrites import.meta.url to a
// non-file URL, which fileURLToPath rejects.
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const packageRoot = fileURLToPath(new URL('.', import.meta.url));
const packageJson = JSON.parse(
	readFileSync(new URL('./package.json', import.meta.url), 'utf8'),
) as {
	files: string[];
	exports: Record<string, Record<string, string>>;
};

const targets = Object.entries(packageJson.exports).flatMap(([subpath, conditions]) =>
	Object.entries(conditions).map(([condition, target]) => ({
		label: `${subpath} (${condition})`,
		target,
	})),
);

// `tsc` builds with rootDir '.' and outDir 'dist', so dist/<p>.js and dist/<p>.d.ts
// both come from <p>.ts. An export naming a path with no such source can never
// resolve — which is how a `./backend` subpath pointing at a file that has no
// source in the package survived from the first published version to 1.19.0.
const sourceFor = (target: string) =>
	target
		.replace(/^\.\/dist\//, '')
		.replace(/\.d\.ts$/, '.ts')
		.replace(/\.js$/, '.ts');

describe('package.json publish surface', () => {
	it('declares at least one export', () => {
		expect(targets.length).toBeGreaterThan(0);
	});

	it('ships the built output in the tarball', () => {
		expect(packageJson.files).toContain('dist');
	});

	it.each(targets)('$label resolves into dist/', ({ target }) => {
		expect(target).toMatch(/^\.\/dist\//);
	});

	it.each(targets)('$label maps to a source file the build compiles', ({ target }) => {
		expect(existsSync(join(packageRoot, sourceFor(target)))).toBe(true);
	});
});
