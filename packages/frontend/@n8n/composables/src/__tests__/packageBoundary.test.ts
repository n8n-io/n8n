import { jsonParse } from 'n8n-workflow';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * This package must stay **below** `@n8n/stores`: stores depends on it, so an
 * import in the other direction closes a build-fatal cycle.
 */
describe('package boundary', () => {
	// `process.cwd()` rather than `import.meta.url`: the jsdom environment does
	// not give test modules a `file:` URL. Vitest runs with the package as cwd.
	const packageRoot = process.cwd();

	it('does not declare @n8n/stores as a dependency', () => {
		const manifest = jsonParse<Record<string, Record<string, string> | undefined>>(
			readFileSync(join(packageRoot, 'package.json'), 'utf8'),
		);

		for (const field of ['dependencies', 'devDependencies', 'peerDependencies']) {
			expect(
				Object.keys(manifest[field] ?? {}),
				`${field} must not include @n8n/stores`,
			).not.toContain('@n8n/stores');
		}
	});

	it('has no source file importing @n8n/stores', () => {
		const srcDir = join(packageRoot, 'src');

		const walk = (dir: string): string[] =>
			readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
				const path = join(dir, entry.name);
				if (entry.isDirectory()) return walk(path);
				return /\.tsx?$/.test(entry.name) ? [path] : [];
			});

		const files = walk(srcDir);
		expect(files.length).toBeGreaterThan(0);

		// Import syntax only — prose mentioning the package (including this file's
		// own assertions) must not count as a violation. Covers `from '…'`,
		// `import('…')` / `require('…')`, and bare side-effect `import '…'`, which
		// takes no binding yet would still pull the package in and restore the cycle.
		const importsStores =
			/(?:\bfrom\s*|\b(?:import|require)\s*\(\s*|\bimport\s+)['"]@n8n\/stores(?:\/[^'"]*)?['"]/;

		const offenders = files
			.filter((file) => importsStores.test(readFileSync(file, 'utf8')))
			.map((file) => file.slice(packageRoot.length + 1));

		expect(offenders).toEqual([]);
	});
});
