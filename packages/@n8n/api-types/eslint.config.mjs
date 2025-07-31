import { baseConfig } from '@n8n/eslint-config/base';

export default [
	...baseConfig,
	{
		rules: {
			'unicorn/filename-case': ['error', { case: 'kebabCase' }],

			// TODO: Remove this
			'@typescript-eslint/naming-convention': 'warn',
			'@typescript-eslint/no-empty-object-type': 'warn',
		},
	},
];
