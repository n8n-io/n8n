import { baseConfig } from '@n8n/eslint-config/base';

export default [
	...baseConfig,
	{
		rules: {
			'unicorn/filename-case': ['error', { case: 'kebabCase' }],

			// TODO: Remove this
			'import-x/order': 'warn',
			'@typescript-eslint/naming-convention': 'warn',
		},
	},
];
