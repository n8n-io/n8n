import { baseConfig } from '@n8n/stylelint-config/base';

export default {
	...baseConfig,
	rules: {
		...baseConfig.rules,
		'@n8n/css-var-naming': [true, { severity: 'error' }],
	},
};
