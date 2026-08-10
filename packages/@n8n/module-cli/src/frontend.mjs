import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { editLines, lineIndex, repoRoot, writeTemplates } from './scaffold.mjs';

const TEMPLATE_DIR = fileURLToPath(new URL('templates/frontend', import.meta.url));

const EDITOR_UI = join(repoRoot, 'packages', 'frontend', 'editor-ui');
const MANIFEST = join(EDITOR_UI, 'src', 'app', 'modules.manifest.ts');
const SOURCE_PACKAGES = join(
	repoRoot,
	'packages',
	'@n8n',
	'frontend-vite-config',
	'source-packages.ts',
);

/** template → path inside the new package. */
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
 * Writes `packages/modules/<name>/frontend` and makes the four registrations outside it. A
 * frontend module is not usable until the shell can see it, so the registrations are the point:
 *
 *   1. `@n8n/frontend-vite-config/source-packages.ts` — the Vite alias, so the shell resolves the
 *      module to its `src`. The mapping is hand-maintained, so it does not appear on its own.
 *   2. `editor-ui/package.json`  — the dependency, so pnpm links the package and a bare import
 *      resolves outside Vite too (vue-tsc, node).
 *   3. `editor-ui/tsconfig.json` — the `paths` entries, so vue-tsc resolves the same source Vite
 *      does. `editor-ui/vite/aliases.test.ts` fails when 1 and 3 disagree.
 *   4. `editor-ui/src/app/modules.manifest.ts` — the descriptor registration.
 */
export const createFrontend = ({ name, packageDir, substitutions }) => {
	const packageName = `@n8n/frontend-module-${name}`;
	const descriptorName = `${substitutions.PascalName}Module`;

	writeTemplates(TEMPLATE_DIR, packageDir, files(name), substitutions);

	const edits = [];

	// 1. The Vite alias. The mapping is a hand-maintained table, so nothing adds the module for us.
	if (
		editLines(SOURCE_PACKAGES, (lines) => {
			if (lines.some((line) => line.includes(`'${packageName}'`))) return undefined;

			const at = lineIndex(lines, /^export const modulePackages/, 'source-packages.ts');
			lines.splice(at + 1, 0, `\t{ name: '${packageName}', dir: 'modules/${name}/frontend' },`);
			return lines;
		})
	) {
		edits.push('@n8n/frontend-vite-config/source-packages.ts (Vite alias)');
	}

	// 2. The dependency, so the package resolves outside Vite too. Inserted in sort order because the
	//    manifests are alphabetical and `pnpm install` will otherwise reorder it out from under the diff.
	if (
		editLines(join(EDITOR_UI, 'package.json'), (lines) => {
			if (lines.some((line) => line.includes(`"${packageName}"`))) return undefined;

			const entry = `    "${packageName}": "workspace:*",`;
			const start = lineIndex(lines, /^\s*"dependencies": \{/, 'editor-ui/package.json') + 1;
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
		edits.push('editor-ui/package.json (dependency)');
	}

	// 3. The tsconfig paths — vue-tsc has to resolve what Vite resolves, or `aliases.test.ts` fails.
	//    Grouped next to the SDK, which every manifest consumer already depends on.
	if (
		editLines(join(EDITOR_UI, 'tsconfig.json'), (lines) => {
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
		edits.push('editor-ui/tsconfig.json (paths)');
	}

	// 4. The manifest — the descriptor registration itself.
	if (
		editLines(MANIFEST, (lines) => {
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
		edits.push('editor-ui/src/app/modules.manifest.ts (registration)');
	}

	return { packageName, edits };
};
