import fs from 'node:fs';
import path from 'node:path';

const CONTROLLERS_DIR = path.resolve(__dirname, '../controllers');
const INDEX_PATH = path.join(CONTROLLERS_DIR, 'index.ts');
const PUBLIC_API_ROOT = path.resolve(__dirname, '..', '..');

function listPublicControllerFiles(): string[] {
	return fs
		.readdirSync(CONTROLLERS_DIR)
		.filter((name) => name.endsWith('.public.controller.ts'))
		.sort();
}

function importedControllerModules(indexSource: string): Set<string> {
	return new Set(
		[...indexSource.matchAll(/import\s+['"]\.\/([^'"]+)['"]/g)].map((match) => {
			const specifier = match[1];
			return specifier.endsWith('.ts') ? specifier : `${specifier}.ts`;
		}),
	);
}

function* walkTsFiles(dir: string): Generator<string> {
	for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
		if (entry.name === 'node_modules' || entry.name === 'dist') continue;
		const fullPath = path.join(dir, entry.name);
		if (entry.isDirectory()) {
			yield* walkTsFiles(fullPath);
			continue;
		}
		if (entry.isFile() && entry.name.endsWith('.ts') && !entry.name.endsWith('.d.ts')) {
			yield fullPath;
		}
	}
}

describe('Public API controller registration', () => {
	test('every *.public.controller.ts is side-effect-imported from controllers/index.ts', () => {
		const controllerFiles = listPublicControllerFiles();
		expect(controllerFiles.length).toBeGreaterThan(0);

		const imported = importedControllerModules(fs.readFileSync(INDEX_PATH, 'utf8'));
		expect(controllerFiles.filter((file) => !imported.has(file))).toEqual([]);
	});

	test('every @PublicApiController is declared in controllers/*.public.controller.ts', () => {
		const unexpected: string[] = [];

		for (const filePath of walkTsFiles(PUBLIC_API_ROOT)) {
			const source = fs.readFileSync(filePath, 'utf8');
			if (!/@PublicApiController\s*\(/.test(source)) continue;

			const relative = path.relative(PUBLIC_API_ROOT, filePath);
			const inControllersDir = path.dirname(filePath) === CONTROLLERS_DIR;
			const matchesNaming = path.basename(filePath).endsWith('.public.controller.ts');
			if (!inControllersDir || !matchesNaming) {
				unexpected.push(relative);
			}
		}

		expect(unexpected).toEqual([]);
	});
});
