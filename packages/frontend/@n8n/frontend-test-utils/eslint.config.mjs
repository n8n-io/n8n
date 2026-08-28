import { defineConfig } from 'eslint/config';
import { frontendConfig } from '@n8n/eslint-config/frontend';

export default defineConfig(frontendConfig, {
	rules: {
		// This package is L1: it sits beside `@n8n/design-system` and `@n8n/i18n`, below
		// `@n8n/stores` and `@n8n/composables`. A helper that reached up to L2 would make every
		// module package that renders a component depend on the store layer.
		//
		// The `paths` in `tsconfig.json` already omit these, which is the structural half of the
		// rule. This is the half that names the reason in the error.
		'no-restricted-imports': [
			'error',
			{
				patterns: [
					{
						// `**`, not `*`: minimatch's `*` never crosses a `/`, so `'@/*'` would miss
						// `@/app/...` — the shape a stray shell import actually takes.
						group: [
							'@n8n/stores',
							'@n8n/stores/**',
							'@n8n/composables',
							'@n8n/composables/**',
							'@n8n/frontend-module-*',
							'@n8n/frontend-module-*/**',
							'@/**',
						],
						message:
							'@n8n/frontend-test-utils is L1. It may import @n8n/api-types, @n8n/i18n and @n8n/design-system only. See the comment in eslint.config.mjs.',
					},
				],
			},
		],
	},
});
