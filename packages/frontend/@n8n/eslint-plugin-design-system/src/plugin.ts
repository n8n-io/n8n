import type { ESLint, Linter } from 'eslint';

import pkg from '../package.json' with { type: 'json' };
import { rules } from './rules/index.js';

const plugin = {
	meta: {
		name: pkg.name,
		version: pkg.version,
		namespace: '@n8n/design-system',
	},
	// @ts-expect-error Rules type does not match for typescript-eslint and eslint
	rules: rules as ESLint.Plugin['rules'],
} satisfies ESLint.Plugin;

const plugins = {
	'@n8n/design-system': plugin,
};

const configs = {
	recommended: {
		files: ['**/*.vue'],
		plugins,
		rules: {
			'@n8n/design-system/no-direct-wrapped-component-imports': 'error',
			'@n8n/design-system/require-teleported-tooltip-in-dropdown': 'error',
		},
	},
	/**
	 * Script files. The import ban does not need the Vue template parser.
	 * Vue files get the same ban from `recommended`.
	 */
	componentImports: {
		files: ['**/*.{ts,tsx}'],
		plugins,
		rules: {
			'@n8n/design-system/no-direct-wrapped-component-imports': 'error',
		},
	},
} satisfies Record<string, Linter.Config>;

const pluginWithConfigs = { ...plugin, configs } satisfies ESLint.Plugin;

export default pluginWithConfigs;
export { configs, rules };
