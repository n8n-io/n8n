import type { ESLint } from 'eslint';

import pkg from '../package.json' with { type: 'json' };
import { rules } from './rules/index.js';

/** Oxlint loads this plugin through `@n8n/oxlint-config/vue`. */
const plugin = {
	meta: {
		name: pkg.name,
		version: pkg.version,
		namespace: '@n8n/design-system',
	},
	// @ts-expect-error Rules type does not match for typescript-eslint and eslint
	rules: rules as ESLint.Plugin['rules'],
} satisfies ESLint.Plugin;

export default plugin;
export { rules };
