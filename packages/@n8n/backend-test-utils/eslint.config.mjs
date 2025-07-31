import { baseConfig } from '@n8n/eslint-config/base';

export default [
	...baseConfig,
	{
		rules: {
			// TODO: Remove this
			'@typescript-eslint/require-await': 'warn',
			'@typescript-eslint/naming-convention': 'warn',
		},
	},
];
