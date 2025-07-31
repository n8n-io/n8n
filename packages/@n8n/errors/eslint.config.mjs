import { baseConfig } from '@n8n/eslint-config/base';

export default [
	...baseConfig,
	{
		rules: {
			'unicorn/filename-case': ['error', { case: 'kebabCase' }],
		},
	},
];
