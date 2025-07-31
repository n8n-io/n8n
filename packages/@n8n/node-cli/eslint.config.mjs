import { baseConfig } from '@n8n/eslint-config/base';

export default [
	...baseConfig,
	{
		files: ['./src/commands/*.ts'],
		rules: { 'import-x/no-default-export': 'off' },
	},
	{
		ignores: ['src/commands/create.test.ts'], // Test file not in project service
	},
];
