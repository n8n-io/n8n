import { defineConfig } from 'eslint/config';
import globals from 'globals';
import { baseConfig } from './base';

export const nodeConfig = defineConfig({
	extends: [baseConfig],
	languageOptions: {
		ecmaVersion: 2024,
		globals: globals.node,
	},
});
