import {
	cpSync,
	existsSync,
	mkdirSync,
	mkdtempSync,
	readFileSync,
	rmSync,
	writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';

import { createFrontend, registrationFiles } from './frontend.mjs';
import { isModuleId, repoRoot, ScaffoldError, substitutionsFor } from './scaffold.mjs';

const NAME = 'my-feature';
const PACKAGE = '@n8n/frontend-module-my-feature';

/**
 * The fixture holds a copy of the four real files, not a hand-written imitation of them. Each
 * registration finds its place with a regex, so a fixture that only looks like the real file lets
 * the anchor rot: the file moves or the anchor line changes shape, the test stays green and the
 * scaffolder writes a module that the shell cannot see. This copy makes that drift a test failure.
 */
const makeFixture = () => {
	const root = mkdtempSync(join(tmpdir(), 'module-cli-'));
	const real = registrationFiles(repoRoot);

	for (const [key, file] of Object.entries(registrationFiles(root))) {
		mkdirSync(dirname(file), { recursive: true });
		cpSync(real[key], file);
	}

	return root;
};

const scaffold = (root, name = NAME) =>
	createFrontend({
		name,
		packageDir: join(root, 'packages', 'modules', name, 'frontend'),
		substitutions: substitutionsFor(name),
		root,
	});

const read = (root, key) => readFileSync(registrationFiles(root)[key], 'utf8');
const readAll = (root) =>
	Object.fromEntries(Object.keys(registrationFiles(root)).map((key) => [key, read(root, key)]));
const occurrences = (text, needle) => text.split(needle).length - 1;

/** Deletes the line an anchor matches, to make one registration fail. */
const dropLine = (root, key, pattern) => {
	const file = registrationFiles(root)[key];
	const lines = readFileSync(file, 'utf8').split('\n');
	const dropped = lines.filter((line) => !pattern.test(line));
	writeFileSync(file, dropped.join('\n'));
	return lines.find((line) => pattern.test(line));
};

const restoreLine = (root, key, pattern, line) => {
	const file = registrationFiles(root)[key];
	const lines = readFileSync(file, 'utf8').split('\n');
	lines.splice(lines.findIndex((candidate) => pattern.test(candidate)) + 1, 0, line);
	writeFileSync(file, lines.join('\n'));
};

const SDK_PATHS = /^\s*"@n8n\/frontend-module-sdk":/;

/** `InstanceAi` gives `instance-ai`, the id a descriptor of that name comes from. */
const toKebab = (pascalName) => pascalName.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase();

describe('createFrontend', () => {
	let root;

	beforeEach(() => {
		root = makeFixture();
	});

	afterEach(() => {
		rmSync(root, { recursive: true, force: true });
	});

	describe('fresh registration', () => {
		it('writes the package from the templates', () => {
			const { packageName } = scaffold(root);
			const packageDir = join(root, 'packages', 'modules', NAME, 'frontend');

			expect(packageName).toBe(PACKAGE);

			const written = [
				'package.json',
				'tsconfig.json',
				'vite.config.ts',
				'eslint.config.mjs',
				'biome.jsonc',
				'README.md',
				'src/index.ts',
				`src/${NAME}.module.ts`,
				`src/${NAME}.store.ts`,
				`src/${NAME}.store.test.ts`,
				'src/__tests__/setup.ts',
			];

			for (const file of written) {
				const body = readFileSync(join(packageDir, file), 'utf8');
				// An unreplaced placeholder ships a module that does not compile.
				expect({ file, placeholders: body.match(/\{\{\w+\}\}/g) }).toEqual({
					file,
					placeholders: null,
				});
			}

			expect(readFileSync(join(packageDir, 'package.json'), 'utf8')).toContain(`"${PACKAGE}"`);
			expect(readFileSync(join(packageDir, 'src/index.ts'), 'utf8')).toContain('MyFeatureModule');
			expect(readFileSync(join(packageDir, `src/${NAME}.store.ts`), 'utf8')).toContain(
				"defineStore('myFeature'",
			);
		});

		it('makes all four registrations', () => {
			const { edits } = scaffold(root);

			expect(edits.map((edit) => edit.note)).toEqual([
				'@n8n/frontend-vite-config/index.ts (Vite alias)',
				'editor-ui/package.json (devDependency)',
				'editor-ui/tsconfig.json (paths)',
				'editor-ui/src/app/modules.manifest.ts (registration)',
			]);

			expect(read(root, 'viteConfig')).toContain(
				`{ name: '${PACKAGE}', dir: 'modules/${NAME}/frontend' },`,
			);
			expect(read(root, 'editorUiPackage')).toContain(`"${PACKAGE}": "workspace:*",`);
			expect(read(root, 'editorUiTsconfig')).toContain(
				`"${PACKAGE}": ["../../modules/${NAME}/frontend/src/index.ts"],`,
			);
			expect(read(root, 'editorUiTsconfig')).toContain(
				`"${PACKAGE}/*": ["../../modules/${NAME}/frontend/src/*"],`,
			);
			expect(read(root, 'manifest')).toContain(`import { MyFeatureModule } from '${PACKAGE}';`);
			expect(read(root, 'manifest')).toMatch(/\tMyFeatureModule,\n\];/);
		});

		it('puts the entry inside the modulePackages array while the array is empty', () => {
			// The array is `= [];` on one line while it holds no module. An entry written after that
			// line is a statement, not an element, and the file then has a syntax error.
			const file = registrationFiles(root).viteConfig;
			writeFileSync(
				file,
				readFileSync(file, 'utf8').replace(
					/^(export const modulePackages.*= \[)[\s\S]*?^\];$/m,
					'$1];',
				),
			);

			scaffold(root);

			const lines = read(root, 'viteConfig').split('\n');
			const opens = lines.findIndex((line) => line.startsWith('export const modulePackages'));

			expect(lines[opens].endsWith('= [')).toBe(true);
			expect(lines[opens + 1]).toContain(`name: '${PACKAGE}'`);
			expect(lines[opens + 2]).toBe('];');
		});

		it('inserts the dependency between its sorted neighbours', () => {
			// Only the neighbours are asserted. The list as a whole is not in `String` order: pnpm
			// writes `zod` before `z-vue-scan`, and `pnpm install` must leave the new entry alone.
			scaffold(root, 'zzz-feature');
			scaffold(root, 'aaa-feature');

			const lines = read(root, 'editorUiPackage').split('\n');
			const opens = lines.findIndex((line) => /^\s*"devDependencies": \{/.test(line));
			const names = [];
			for (let at = opens + 1; !/^\s*\},?\s*$/.test(lines[at]); at++) {
				const [, dependency] = /^\s*"([^"]+)":/.exec(lines[at]) ?? [];
				if (dependency) names.push(dependency);
			}

			for (const name of ['@n8n/frontend-module-aaa-feature', '@n8n/frontend-module-zzz-feature']) {
				const at = names.indexOf(name);

				expect({ name, at: at > 0 }).toEqual({ name, at: true });
				expect(names[at - 1] < name).toBe(true);
				expect(names[at + 1] > name).toBe(true);
			}
		});
	});

	describe('rerun', () => {
		it('adds nothing the second time', () => {
			scaffold(root);
			const afterFirst = readAll(root);

			const { edits } = scaffold(root);

			expect(edits).toEqual([]);
			expect(readAll(root)).toEqual(afterFirst);
			for (const body of Object.values(afterFirst)) {
				expect(occurrences(body, PACKAGE)).toBeLessThanOrEqual(2);
			}
		});

		it('adds no second module to the manifest', () => {
			scaffold(root);
			scaffold(root);

			const manifest = read(root, 'manifest');

			expect(occurrences(manifest, 'MyFeatureModule')).toBe(2);
			expect(occurrences(read(root, 'viteConfig'), PACKAGE)).toBe(1);
			expect(occurrences(read(root, 'editorUiPackage'), PACKAGE)).toBe(1);
			expect(occurrences(read(root, 'editorUiTsconfig'), PACKAGE)).toBe(2);
		});
	});

	describe('partial failure', () => {
		it('completes the missing registrations on the next run', () => {
			const anchor = dropLine(root, 'editorUiTsconfig', SDK_PATHS);

			expect(() => scaffold(root)).toThrow(ScaffoldError);

			// Registrations 1 and 2 ran, 3 failed, 4 never started.
			expect(read(root, 'viteConfig')).toContain(PACKAGE);
			expect(read(root, 'editorUiPackage')).toContain(PACKAGE);
			expect(read(root, 'manifest')).not.toContain(PACKAGE);

			restoreLine(root, 'editorUiTsconfig', /^\s*"@n8n\/frontend-constants\*":/, anchor);
			const { edits } = scaffold(root);

			expect(edits.map((edit) => edit.note)).toEqual([
				'editor-ui/tsconfig.json (paths)',
				'editor-ui/src/app/modules.manifest.ts (registration)',
			]);
			expect(occurrences(read(root, 'viteConfig'), PACKAGE)).toBe(1);
			expect(occurrences(read(root, 'editorUiPackage'), PACKAGE)).toBe(1);
			expect(occurrences(read(root, 'editorUiTsconfig'), PACKAGE)).toBe(2);
			expect(occurrences(read(root, 'manifest'), PACKAGE)).toBe(1);
		});

		it.each([
			['viteConfig', /^export const modulePackages/, 'frontend-vite-config/index.ts'],
			['editorUiPackage', /^\s*"devDependencies": \{/, 'editor-ui/package.json'],
			['editorUiTsconfig', SDK_PATHS, 'editor-ui/tsconfig.json'],
			['manifest', /^\];/, 'modules.manifest.ts'],
		])('names %s when its anchor is gone', (key, pattern, file) => {
			dropLine(root, key, pattern);

			expect(() => scaffold(root)).toThrow(new RegExp(`${file}\\. Register the module by hand\\.`));
		});

		it('leaves the module directory in place for the rerun', () => {
			dropLine(root, 'manifest', /^\];/);

			expect(() => scaffold(root)).toThrow(ScaffoldError);
			expect(existsSync(join(root, 'packages', 'modules', NAME, 'frontend', 'package.json'))).toBe(
				true,
			);
		});
	});

	describe('descriptor name collision', () => {
		// The manifest binds one name per module, and the name comes from the id. Two imports of one
		// name do not compile, so the id has to give a name that the manifest does not hold yet.
		// `data-table` and `agents` are the two the roadmap extracts in wave 2.
		it.each(['data-table', 'agents'])('refuses %s, which the shell already binds', (name) => {
			expect(() => scaffold(root, name)).toThrow(
				/modules\.manifest\.ts already imports \w+Module from '@\/features\//,
			);
		});

		it('refuses every in-shell feature an id can name', () => {
			// The list comes from the manifest, not from a copy of it here: a new in-shell feature must
			// not become a collision that no test covers. A binding no id can give is skipped, because
			// no id gives it — `MCPModule` needs the id `mcp`, and `mcp` gives `McpModule`.
			const bindings = [...read(root, 'manifest').matchAll(/import \{ (\w+)Module \} from '@\//g)];
			const reachable = bindings
				.map(([, binding]) => ({ binding, id: toKebab(binding) }))
				.filter(({ binding, id }) => isModuleId(id) && substitutionsFor(id).PascalName === binding)
				.map(({ id }) => id);

			expect(reachable.length).toBeGreaterThanOrEqual(7);
			for (const id of reachable) {
				expect(() => scaffold(root, id)).toThrow(ScaffoldError);
			}
		});

		it('writes nothing when it refuses', () => {
			const boundElsewhere = /import \{ (\w+)Module \} from '@\/features\//.exec(
				read(root, 'manifest'),
			)[1];
			const name = toKebab(boundElsewhere);
			const before = readAll(root);

			expect(() => scaffold(root, name)).toThrow(ScaffoldError);

			expect(existsSync(join(root, 'packages', 'modules', name))).toBe(false);
			expect(readAll(root)).toEqual(before);
		});

		it('accepts a module the shell binds from this package, so a rerun still works', () => {
			scaffold(root);

			const { edits } = scaffold(root);

			expect(edits).toEqual([]);
		});

		it('rejects an id whose name a sibling id would share', () => {
			// `mcp-2` and `mcp2` both give `Mcp2`, for the descriptor and for the id of the store.
			expect(isModuleId('mcp-2')).toBe(false);
			expect(isModuleId('mcp2')).toBe(true);
			expect(substitutionsFor('mcp2').PascalName).toBe('Mcp2');
		});

		it('gives a distinct descriptor name to every id it accepts', () => {
			const ids = ['a', 'ab', 'a-b', 'mcp2', 'mcp2-x', 'data-table', 'datatable', 'my-feature'];
			const descriptors = ids.map((id) => `${substitutionsFor(id).PascalName}Module`);

			expect(ids.every((id) => isModuleId(id))).toBe(true);
			expect(new Set(descriptors).size).toBe(ids.length);
		});
	});
});
