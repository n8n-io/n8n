import { frontendConfig } from '@n8n/oxlint-config/frontend';
import { defineConfig } from 'oxlint';

export default defineConfig({
	extends: [frontendConfig],
	options: { typeAware: true },
	overrides: [
		{
			// Storybook entry and config files are build tooling, so they may import devDependencies.
			files: ['.storybook/**'],
			jsPlugins: ['@n8n/oxlint-config/import-x-alias'],
			rules: {
				'import-x-alias/no-extraneous-dependencies': [
					'error',
					{ devDependencies: true, optionalDependencies: false, peerDependencies: false },
				],
			},
		},
		{
			files: ['.storybook/main.ts'],
			jsPlugins: ['eslint-plugin-storybook'],
			rules: {
				'storybook/no-uninstalled-addons': 'error',
			},
		},
	],
});
