import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { editLines, lineIndex, repoRoot, ScaffoldError, writeTemplates } from './scaffold.mjs';

const TEMPLATE_DIR = fileURLToPath(new URL('templates/frontend', import.meta.url));

/** The four files each registration edits. `root` makes them addressable in a test fixture. */
export const registrationFiles = (root) => {
	const editorUi = join(root, 'packages', 'frontend', 'editor-ui');

	return {
		viteConfig: join(root, 'packages', 'frontend', '@n8n', 'frontend-vite-config', 'index.ts'),
		editorUiPackage: join(editorUi, 'package.json'),
		editorUiTsconfig: join(editorUi, 'tsconfig.json'),
		manifest: join(editorUi, 'src', 'app', 'modules.manifest.ts'),
	};
};

/** The module each name in the manifest comes from, or `undefined` for a name it does not import. */
const bindingSource = (manifest, binding) => {
	for (const line of manifest.split('\n')) {
		const [, names, from] = /^import\s*\{([^}]*)\}\s*from\s*'([^']+)';/.exec(line) ?? [];
		if (!names) continue;

		const bound = names.split(',').map((name) =>
			name
				.trim()
				.split(/\s+as\s+/)
				.pop()
				.trim(),
		);
		if (bound.includes(binding)) return from;
	}

	return undefined;
};

/** template file, then the path in the new package. */
const files = (name) => [
	['package.json.template', 'package.json'],
	['tsconfig.json.template', 'tsconfig.json'],
	['vite.config.ts.template', 'vite.config.ts'],
	['eslint.config.mjs.template', 'eslint.config.mjs'],
	['biome.jsonc.template', 'biome.jsonc'],
	['README.md.template', 'README.md'],
	['index.ts.template', 'src/index.ts'],
	['module.ts.template', `src/${name}.module.ts`],
	['store.ts.template', `src/${name}.store.ts`],
	['store.test.ts.template', `src/${name}.store.test.ts`],
	['setup.ts.template', 'src/__tests__/setup.ts'],
];

/**
 * Writes `packages/modules/<name>/frontend` and makes the four registrations outside it. The shell
 * cannot see a module until all four are in place:
 *
 *   1. `@n8n/frontend-vite-config/index.ts` gets an entry in `modulePackages`. The shell then
 *      resolves the module to its `src`. The table is a hand-made list.
 *   2. `editor-ui/package.json` gets the devDependency. pnpm then links the package, and a bare
 *      import of it also resolves outside Vite, for vue-tsc and for Node. editor-ui bundles
 *      everything it imports, so all of its dependencies are devDependencies.
 *   3. `editor-ui/tsconfig.json` gets the two `paths` entries. vue-tsc then reads the same source
 *      that Vite reads. `editor-ui/vite/aliases.test.ts` fails when 1 and 3 disagree.
 *   4. `editor-ui/src/app/modules.manifest.ts` gets the descriptor.
 */
export const createFrontend = ({ name, packageDir, substitutions, root = repoRoot }) => {
	const packageName = `@n8n/frontend-module-${name}`;
	const descriptorName = `${substitutions.PascalName}Module`;
	const target = registrationFiles(root);

	// The descriptor comes from the module id, and more than one id can give one name: `data-table`
	// gives the `DataTableModule` that `@/features/core/dataTable` already binds. Two imports of one
	// name do not compile, so stop before the first file is written.
	const boundIn = bindingSource(readFileSync(target.manifest, 'utf8'), descriptorName);
	if (boundIn && boundIn !== packageName) {
		throw new ScaffoldError(
			`modules.manifest.ts already imports ${descriptorName} from '${boundIn}'.\n` +
				`Use a module id that gives another name, or remove that registration first.`,
		);
	}

	writeTemplates(TEMPLATE_DIR, packageDir, files(name), substitutions);

	const edits = [];
	const record = (path, note) => edits.push({ path, note });

	// 1. The Vite alias. The table is on one line while it holds no module, so an entry that goes
	//    after that line is not part of the array. Open the array first in that condition.
	if (
		editLines(target.viteConfig, (lines) => {
			if (lines.some((line) => line.includes(`'${packageName}'`))) return undefined;

			const at = lineIndex(lines, /^export const modulePackages/, 'frontend-vite-config/index.ts');
			const entry = `\t{ name: '${packageName}', dir: 'modules/${name}/frontend' },`;

			if (/\[\];\s*$/.test(lines[at])) {
				lines.splice(at, 1, lines[at].replace(/\[\];\s*$/, '['), entry, '];');
			} else {
				lines.splice(at + 1, 0, entry);
			}
			return lines;
		})
	) {
		record(target.viteConfig, '@n8n/frontend-vite-config/index.ts (Vite alias)');
	}

	// 2. The dependency. The list is alphabetical, and `pnpm install` sorts it again. Put the entry
	//    in its sorted place, or the next install moves it and makes a second diff.
	if (
		editLines(target.editorUiPackage, (lines) => {
			if (lines.some((line) => line.includes(`"${packageName}"`))) return undefined;

			const entry = `    "${packageName}": "workspace:*",`;
			const start = lineIndex(lines, /^\s*"devDependencies": \{/, 'editor-ui/package.json') + 1;
			let at = start;
			while (at < lines.length && !/^\s*\},?\s*$/.test(lines[at])) {
				const [, dependency] = /^\s*"([^"]+)":/.exec(lines[at]) ?? [];
				if (dependency && dependency > packageName) break;
				at++;
			}

			lines.splice(at, 0, entry);
			return lines;
		})
	) {
		record(target.editorUiPackage, 'editor-ui/package.json (devDependency)');
	}

	// 3. The tsconfig paths. Keep them next to the SDK, which every module depends on.
	if (
		editLines(target.editorUiTsconfig, (lines) => {
			if (lines.some((line) => line.includes(`"${packageName}"`))) return undefined;

			const at = lineIndex(lines, /^\s*"@n8n\/frontend-module-sdk":/, 'editor-ui/tsconfig.json');
			lines.splice(
				at + 1,
				0,
				`\t\t\t"${packageName}": ["../../modules/${name}/frontend/src/index.ts"],`,
				`\t\t\t"${packageName}/*": ["../../modules/${name}/frontend/src/*"],`,
			);
			return lines;
		})
	) {
		record(target.editorUiTsconfig, 'editor-ui/tsconfig.json (paths)');
	}

	// 4. The manifest.
	if (
		editLines(target.manifest, (lines) => {
			if (lines.some((line) => line.includes(`'${packageName}'`))) return undefined;

			const closing = lineIndex(lines, /^\];/, 'modules.manifest.ts');
			lines.splice(closing, 0, `\t${descriptorName},`);

			let lastImport = 0;
			lines.forEach((line, index) => {
				if (line.startsWith('import ')) lastImport = index;
			});
			lines.splice(lastImport + 1, 0, `import { ${descriptorName} } from '${packageName}';`);

			return lines;
		})
	) {
		record(target.manifest, 'editor-ui/src/app/modules.manifest.ts (registration)');
	}

	return { packageName, edits };
};
