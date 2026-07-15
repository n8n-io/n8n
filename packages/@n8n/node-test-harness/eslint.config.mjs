import { defineConfig } from 'eslint/config';
import { baseConfig } from '@n8n/eslint-config/base';

export default defineConfig(baseConfig, {
	rules: {
		// TODO: Remove this
		'@typescript-eslint/require-await': 'warn',
		'@typescript-eslint/naming-convention': 'warn',
		// This code was extracted verbatim from `core/nodes-testing`, which was excluded
		// from linting. As a test harness it deliberately handles untyped node data and
		// reads trusted fixture JSON, so these rules are warnings pending a later cleanup.
		'@typescript-eslint/no-unsafe-assignment': 'warn',
		'@typescript-eslint/no-unsafe-member-access': 'warn',
		'@typescript-eslint/prefer-nullish-coalescing': 'warn',
		'n8n-local-rules/no-uncaught-json-parse': 'warn',
	},
});
