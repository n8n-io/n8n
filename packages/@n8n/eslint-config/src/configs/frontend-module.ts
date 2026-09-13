import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import tseslint from 'typescript-eslint';
import { frontendConfig } from './frontend.js';

/**
 * The boundary of a frontend module package, at error level.
 *
 * `packages/modules/<name>/frontend` is an L3 package. An L3 package imports only L0-L2. It does
 * not import a sibling module, and it does not import the shell. Two other mechanisms stop an
 * *accidental* import of a sibling: `frontendAliases()` leaves the sibling modules out of the Vite
 * alias table, and `tsconfig.frontend-module.json` leaves them out of `paths`. Neither one is a
 * boundary. `paths` is additive and an alias is a convenience, so a module that declares a sibling
 * as a dependency gets a symlink from pnpm, and every check passes. This rule is the boundary.
 *
 * Two specifiers stay legal:
 *
 * - `@n8n/frontend-module-sdk` is L2, not a module. It carries the contribution points.
 * - The package's own name. The module reads it from `package.json`, so a module that imports
 *   itself through its own `exports` map (as the shell imports
 *   `@n8n/frontend-module-insights/insights.module`) does not trip the rule.
 */
const SDK_PACKAGE = '@n8n/frontend-module-sdk';

const SIBLING_MESSAGE =
	'A module does not import another module. Move the shared value into an L2 package, such as @n8n/stores or @n8n/composables. If you cannot move it, the two features are one module. To reach the shell or another module, contribute through a descriptor surface of @n8n/frontend-module-sdk.';

const SHELL_MESSAGE =
	'@/ is the alias of the editor-ui shell. A module does not import the shell. The shell reaches a module through src/app/modules.manifest.ts, and a module reaches the shell through a descriptor surface of @n8n/frontend-module-sdk.';

/** The name in the `package.json` next to the `eslint.config.mjs` that calls this. */
const packageNameIn = (moduleDir: string): string => {
	const manifest: unknown = JSON.parse(readFileSync(join(moduleDir, 'package.json'), 'utf8'));

	if (
		typeof manifest !== 'object' ||
		manifest === null ||
		typeof (manifest as { name?: unknown }).name !== 'string'
	) {
		throw new Error(`${join(moduleDir, 'package.json')} declares no name.`);
	}

	return (manifest as { name: string }).name;
};

/**
 * The ESLint config of a frontend module package: `frontendConfig` plus the module boundary.
 *
 * Call it with the directory of the config file, so the rule can read the name of this package:
 *
 * ```js
 * import { defineConfig } from 'eslint/config';
 * import { frontendModuleConfig } from '@n8n/eslint-config/frontend-module';
 *
 * export default defineConfig(frontendModuleConfig(import.meta.dirname));
 * ```
 */
export const frontendModuleConfig = (moduleDir: string) => {
	const self = packageNameIn(moduleDir);

	// `no-restricted-imports` matches a group with gitignore semantics, so `*` stops at a `/` and a
	// later `!` line re-includes what an earlier line took. The bare name and the subpath therefore
	// need one line each, and every negation comes after every ban.
	const siblingModules = [
		'@n8n/frontend-module-*',
		'@n8n/frontend-module-*/*',
		`!${SDK_PACKAGE}`,
		`!${SDK_PACKAGE}/*`,
		`!${self}`,
		`!${self}/*`,
	];

	return tseslint.config(frontendConfig, {
		rules: {
			'@typescript-eslint/no-restricted-imports': [
				'error',
				{
					patterns: [
						{ group: siblingModules, message: SIBLING_MESSAGE },
						{ group: ['@/*'], message: SHELL_MESSAGE },
					],
				},
			],
		},
	});
};
