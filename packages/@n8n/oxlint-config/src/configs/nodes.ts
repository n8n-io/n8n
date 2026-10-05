import { defineConfig } from 'oxlint';
import { backendConfig } from './backend.js';

export const nodesConfig = defineConfig({
	extends: [backendConfig],
	rules: {
		'unicorn/filename-case': 'off',
		'n8n-local-rules/no-dynamic-regexp': 'error',
		'no-unused-expressions': ['error', { allowTernary: true }],

		'typescript/no-base-to-string': 'off',
		'typescript/no-duplicate-type-constituents': 'off',
		'typescript/no-explicit-any': 'off',
		'typescript/no-redundant-type-constituents': 'off',
		'typescript/no-unnecessary-type-assertion': 'off',
		'typescript/prefer-optional-chain': 'off',
		'typescript/restrict-plus-operands': 'off',
		'typescript/restrict-template-expressions': 'off',
		eqeqeq: 'off',
		'id-denylist': 'off',
		'no-async-promise-executor': 'off',
		'no-case-declarations': 'off',
		'no-extra-boolean-cast': 'off',
		'no-prototype-builtins': 'off',
		'no-useless-escape': 'off',
	},
});

export default nodesConfig;
