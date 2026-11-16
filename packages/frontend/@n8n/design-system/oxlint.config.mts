import { frontendConfig } from '@n8n/oxlint-config/frontend';
import { defineConfig } from 'oxlint';

export default defineConfig({
	extends: [frontendConfig],
	options: { typeAware: true },
	ignorePatterns: ['**/*.d.ts'],
	rules: {
		'no-prototype-builtins': 'warn',
		'typescript/restrict-template-expressions': 'warn',
	},
	overrides: [
		{
			files: ['**/*.stories.ts'],
			jsPlugins: ['eslint-plugin-storybook'],
			rules: {
				'storybook/await-interactions': 'error',
				'storybook/context-in-play-function': 'error',
				'storybook/default-exports': 'error',
				'storybook/no-renderer-packages': 'error',
				'storybook/story-exports': 'error',
				'storybook/use-storybook-expect': 'error',
				'storybook/use-storybook-testing-library': 'error',
			},
		},
	],
});
