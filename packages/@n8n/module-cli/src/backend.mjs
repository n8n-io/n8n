import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { editLines, lineIndex, repoRoot, ScaffoldError, writeTemplates } from './scaffold.mjs';

const TEMPLATE_DIR = fileURLToPath(new URL('templates/backend', import.meta.url));

/** The three files each backend registration edits. `root` makes them testable in a fixture. */
export const backendRegistrationFiles = (root) => ({
	cliPackage: join(root, 'packages', 'cli', 'package.json'),
	manifest: join(root, 'packages', 'cli', 'src', 'modules', 'modules.manifest.ts'),
	moduleNames: join(
		root,
		'packages',
		'@n8n',
		'backend-common',
		'src',
		'modules',
		'modules.config.ts',
	),
});

/** template file, then the path in the new package. */
const files = (name) => [
	['package.json.template', 'package.json'],
	['tsconfig.json.template', 'tsconfig.json'],
	['tsconfig.build.json.template', 'tsconfig.build.json'],
	['oxlint.config.mts.template', 'oxlint.config.mts'],
	['vitest.config.ts.template', 'vitest.config.ts'],
	['README.md.template', 'README.md'],
	['index.ts.template', 'src/index.ts'],
	['module.ts.template', `src/${name}.module.ts`],
	['module.test.ts.template', `src/__tests__/${name}.module.test.ts`],
];

/** Writes a built backend package and registers its lazy runtime import. */
export const createBackend = ({ name, packageDir, substitutions, root = repoRoot }) => {
	const packageName = `@n8n/backend-module-${name}`;
	const target = backendRegistrationFiles(root);
	const moduleNames = readFileSync(target.moduleNames, 'utf8');
	const manifest = readFileSync(target.manifest, 'utf8');
	const isKnownModule = moduleNames.split('\n').some((line) => line.trim() === `'${name}',`);
	const isRegisteredPackage = manifest.includes(`'${packageName}/module'`);

	if (isKnownModule && !isRegisteredPackage) {
		throw new ScaffoldError(
			`The backend module id "${name}" is already registered. Use another module id.`,
		);
	}

	writeTemplates(TEMPLATE_DIR, packageDir, files(name), substitutions);

	const edits = [];
	const record = (path, note) => edits.push({ path, note });

	// Add the runtime dependency. Keep the list sorted so `pnpm install` does not move the entry.
	if (
		editLines(target.cliPackage, (lines) => {
			if (lines.some((line) => line.includes(`"${packageName}"`))) return undefined;

			const entry = `    "${packageName}": "workspace:*",`;
			const start = lineIndex(lines, /^\s*"dependencies": \{/, 'cli/package.json') + 1;
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
		record(target.cliPackage, 'cli/package.json (runtime dependency)');
	}

	// Register the package import as a thunk. Disabled modules must not load their package.
	if (
		editLines(target.manifest, (lines) => {
			if (lines.some((line) => line.includes(`'${packageName}/module'`))) return undefined;

			const closing = lineIndex(lines, /^};/, 'modules.manifest.ts');
			lines.splice(closing, 0, `\t'${name}': async () => await import('${packageName}/module'),`);
			return lines;
		})
	) {
		record(target.manifest, 'cli/src/modules/modules.manifest.ts (lazy registration)');
	}

	// The config validates N8N_ENABLED_MODULES and supplies the ModuleName union used by the manifest.
	if (
		editLines(target.moduleNames, (lines) => {
			if (lines.some((line) => line.trim() === `'${name}',`)) return undefined;

			const closing = lineIndex(lines, /^] as const;/, 'modules.config.ts');
			lines.splice(closing, 0, `\t'${name}',`);
			return lines;
		})
	) {
		record(target.moduleNames, '@n8n/backend-common modules.config.ts (module name)');
	}

	return { packageName, edits };
};
