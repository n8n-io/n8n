import type { Config } from 'stylelint';
import { baseConfig } from './base.js';

export const selectiveImportCheckConfig: Config = {
	extends: baseConfig.extends,
	plugins: baseConfig.plugins,
	rules: {
		...(baseConfig.rules || {}),
		'at-rule-disallowed-list': [
			['import'],
			{
				message:
					'@import is deprecated! Use @use instead for local SCSS files. Exception: @import allowed for third-party libraries that need CSS scoping.',
			},
		],
	},
	ignoreFiles: [
		...(baseConfig.ignoreFiles || []),
		// Exception files that legitimately need scoped @import for third-party libraries
		'packages/frontend/@n8n/chat/src/main.scss',
		'packages/frontend/@n8n/chat/src/style.scss',
	],
};

export default selectiveImportCheckConfig;
