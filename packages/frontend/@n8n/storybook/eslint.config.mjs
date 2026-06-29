import storybook from 'eslint-plugin-storybook';

import { defineConfig } from 'eslint/config';
import { frontendConfig } from '@n8n/eslint-config/frontend';

export default defineConfig(
	frontendConfig,
	{
		// Storybook entry/config files are build tooling — allow devDependency imports,
		// and the Storybook API requires a default export from main.ts.
		files: ['.storybook/**'],
		rules: {
			'import-x/no-extraneous-dependencies': [
				'error',
				{ devDependencies: true, optionalDependencies: false, peerDependencies: false },
			],
			'import-x/no-default-export': 'off',
		},
	},
	storybook.configs['flat/recommended'],
);
