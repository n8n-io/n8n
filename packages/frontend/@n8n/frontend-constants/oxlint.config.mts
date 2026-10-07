import { defineConfig } from 'oxlint';
import { frontendConfig } from '@n8n/oxlint-config/frontend';

export default defineConfig({
	extends: [frontendConfig],
	options: { typeAware: true },
	// Not inherited through `extends`.
	ignorePatterns: frontendConfig.ignorePatterns,
	overrides: [
		{
			// `VIEWS` is declared as a plain `enum` (not a `const enum`) so this package's
			// `dist` stays consumable by `isolatedModules` downstream packages (a `const
			// enum` emits an ambient const enum → TS2748). See the doc comment in views.ts.
			files: ['src/views.ts'],
			rules: { 'n8n-local-rules/no-raw-enum': 'off' },
		},
	],
});
