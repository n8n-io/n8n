import { cpSync, mkdirSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';

import { backendRegistrationFiles, createBackend } from './backend.mjs';
import { repoRoot, substitutionsFor } from './scaffold.mjs';

const NAME = 'my-feature';
const PACKAGE = '@n8n/backend-module-my-feature';

const makeFixture = () => {
	const root = mkdtempSync(join(tmpdir(), 'module-cli-backend-'));
	const real = backendRegistrationFiles(repoRoot);

	for (const [key, file] of Object.entries(backendRegistrationFiles(root))) {
		mkdirSync(dirname(file), { recursive: true });
		cpSync(real[key], file);
	}

	return root;
};

const scaffold = (root) =>
	createBackend({
		name: NAME,
		packageDir: join(root, 'packages', 'modules', NAME, 'backend'),
		substitutions: substitutionsFor(NAME),
		root,
	});

const readRegistrations = (root) =>
	Object.fromEntries(
		Object.entries(backendRegistrationFiles(root)).map(([key, file]) => [
			key,
			readFileSync(file, 'utf8'),
		]),
	);

describe('createBackend', () => {
	let root;

	beforeEach(() => {
		root = makeFixture();
	});

	afterEach(() => {
		rmSync(root, { recursive: true, force: true });
	});

	it('writes a built backend package from the templates', () => {
		const { packageName } = scaffold(root);
		const packageDir = join(root, 'packages', 'modules', NAME, 'backend');
		const written = [
			'package.json',
			'tsconfig.json',
			'tsconfig.build.json',
			'oxlint.config.mts',
			'vitest.config.ts',
			'README.md',
			'src/index.ts',
			`src/${NAME}.module.ts`,
			`src/__tests__/${NAME}.module.test.ts`,
		];

		expect(packageName).toBe(PACKAGE);
		for (const file of written) {
			const body = readFileSync(join(packageDir, file), 'utf8');
			expect({ file, placeholders: body.match(/\{\{\w+\}\}/g) }).toEqual({
				file,
				placeholders: null,
			});
		}

		const manifest = JSON.parse(readFileSync(join(packageDir, 'package.json'), 'utf8'));
		expect(manifest.name).toBe(PACKAGE);
		expect(manifest.exports['./module'].import).toBe(`./dist/${NAME}.module.js`);
		expect(readFileSync(join(packageDir, `src/${NAME}.module.ts`), 'utf8')).toContain(
			"@BackendModule({ name: 'my-feature' })",
		);
	});

	it('registers the package with the backend runtime', () => {
		const { edits } = scaffold(root);
		const registered = readRegistrations(root);

		expect(edits.map((edit) => edit.note)).toEqual([
			'cli/package.json (runtime dependency)',
			'cli/src/modules/modules.manifest.ts (lazy registration)',
			'@n8n/backend-common modules.config.ts (module name)',
		]);
		expect(registered.cliPackage).toContain(`"${PACKAGE}": "workspace:*",`);
		expect(registered.manifest).toContain(
			`'${NAME}': async () => await import('${PACKAGE}/module'),`,
		);
		expect(registered.moduleNames).toContain(`\t'${NAME}',`);
	});

	it('adds nothing to registration files on a second run', () => {
		scaffold(root);
		const afterFirst = readRegistrations(root);

		const { edits } = scaffold(root);

		expect(edits).toEqual([]);
		expect(readRegistrations(root)).toEqual(afterFirst);
	});

	it('puts the CLI dependency between its sorted neighbours', () => {
		scaffold(root);
		const manifest = JSON.parse(readRegistrations(root).cliPackage);
		const dependencies = Object.keys(manifest.dependencies);
		const at = dependencies.indexOf(PACKAGE);

		expect(at).toBeGreaterThan(0);
		expect(dependencies[at - 1] < PACKAGE).toBe(true);
		expect(dependencies[at + 1] > PACKAGE).toBe(true);
	});
});
