import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';

const packageRoot = resolve(__dirname, '../..');
const srcDir = resolve(__dirname, '..');

const manifest = JSON.parse(readFileSync(join(packageRoot, 'package.json'), 'utf8')) as Record<
	string,
	Record<string, string> | undefined
>;

const sourceFiles = readdirSync(srcDir, { recursive: true, encoding: 'utf8' }).filter(
	(file) => file.endsWith('.ts') && !file.split(/[\\/]/).includes('__tests__'),
);

const importSpecifiers = (code: string) => {
	const stripped = code.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '');
	const patterns = [
		/(?:import|export)\b[^'"]*?\bfrom\s*['"]([^'"]+)['"]/g,
		/\bimport\s*\(\s*['"`]([^'"`]+)['"`]\s*\)/g,
		/\brequire\s*\(\s*['"`]([^'"`]+)['"`]\s*\)/g,
		/\bimport\s+['"]([^'"]+)['"]/g,
	];
	return patterns.flatMap((pattern) => [...stripped.matchAll(pattern)].map((match) => match[1]));
};

describe('package manifest', () => {
	it.each(['dependencies', 'peerDependencies', 'optionalDependencies'])(
		'declares no %s',
		(field) => {
			expect(Object.keys(manifest[field] ?? {})).toHaveLength(0);
		},
	);
});

describe('source imports', () => {
	it('finds the source files', () => {
		expect(sourceFiles).toContain('index.ts');
	});

	it('imports only files inside src', () => {
		const outside = sourceFiles.flatMap((file) =>
			importSpecifiers(readFileSync(join(srcDir, file), 'utf8'))
				.filter(
					(specifier) =>
						!specifier.startsWith('.') ||
						relative(srcDir, resolve(srcDir, dirname(file), specifier)).startsWith('..'),
				)
				.map((specifier) => `${file}: ${specifier}`),
		);
		expect(outside).toEqual([]);
	});
});
