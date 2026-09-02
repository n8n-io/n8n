import type { ESLint, Linter } from 'eslint';

import pkg from '../package.json' with { type: 'json' };
import { rules } from './rules/index.js';

const plugin = {
	meta: {
		name: pkg.name,
		version: pkg.version,
		namespace: '@n8n/design-system',
	},
	/** @ts-expect-error Rules type does not match for typescript-eslint and ESLint. */
	rules: rules as ESLint.Plugin['rules'],
} satisfies ESLint.Plugin;

const configs = {
	recommended: {
		files: ['**/*.vue'],
		plugins: {
			'@n8n/design-system': plugin,
		},
		rules: {
			'@n8n/design-system/label-has-for': 'error',
			'@n8n/design-system/no-access-key': 'error',
			'@n8n/design-system/no-aria-hidden-on-focusable': 'error',
			'@n8n/design-system/no-invalid-aria-props': 'error',
			'@n8n/design-system/no-invalid-aria-role': 'error',
			'@n8n/design-system/no-pointer-only-events': 'error',
			'@n8n/design-system/no-positive-tabindex': 'error',
			'@n8n/design-system/no-redundant-roles': 'error',
			'@n8n/design-system/no-static-element-interactions': 'error',
			'@n8n/design-system/prefers-reduced-motion': 'error',
			'@n8n/design-system/require-teleported-tooltip-in-dropdown': 'error',
			'@n8n/design-system/role-has-required-aria-props': 'error',
		},
	},
} satisfies Record<string, Linter.Config>;

const pluginWithConfigs = { ...plugin, configs } satisfies ESLint.Plugin;

export default pluginWithConfigs;
export { configs, rules };
