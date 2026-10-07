import { createRequire } from 'node:module';
import { defineConfig } from 'oxlint';
import { frontendConfig } from '@n8n/oxlint-config/frontend';

// oxlint resolves a JS plugin from the pnpm hoist directory, which misses this package's own dependency.
const storybookPlugin = createRequire(import.meta.url).resolve('eslint-plugin-storybook');

export default defineConfig({
	extends: [frontendConfig],
	options: { typeAware: true },
	// Not inherited through `extends`.
	ignorePatterns: frontendConfig.ignorePatterns,
	jsPlugins: [storybookPlugin],
	overrides: [
		{
			files: ['.storybook/main.ts'],
			rules: { 'storybook/no-uninstalled-addons': 'error' },
		},
		{
			// Storybook entry/config files are build tooling — allow devDependency imports.
			files: ['.storybook/**'],
			rules: {
				'import-x-alias/no-extraneous-dependencies': [
					'error',
					{ devDependencies: true, optionalDependencies: false, peerDependencies: false },
				],
			},
		},
	],
});
